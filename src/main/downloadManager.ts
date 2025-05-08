import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { BrowserWindow } from 'electron';
import { getErrorMessage } from '../utils/errorUtils';
import { DownloadStatus } from '../types/DownloadStatus';

export interface DownloadTask {
  url: string;
  destination: string; // Full path including filename
  sha1?: string; // Optional expected SHA1 for validation
  size?: number; // Optional expected size
  label?: string;
}

export interface DownloadResult {
  task: DownloadTask;
  success: boolean;
  error?: string;
  validationPassed: boolean;
}

/**
 * Calculates the SHA1 hash of a file.
 * @param filePath Path to the file.
 * @returns Promise resolving to the SHA1 hash string or null on error.
 */
async function calculateFileSha1(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => {
        console.error(`Error calculating SHA1 for ${filePath}:`, err);
        resolve(null); // Resolve with null on error
      });
    } catch (error) {
      console.error(`Exception calculating SHA1 for ${filePath}:`, error);
      resolve(null);
    }
  });
}

/**
 * Downloads a single file with validation, progress reporting, and retries.
 * @param task The download task details.
 * @param mainWindow The main browser window to send progress updates.
 * @returns Promise resolving to the download result.
 */
export async function downloadFile(
  task: DownloadTask,
  mainWindow: BrowserWindow | null,
): Promise<DownloadResult> {
  const { url, destination, sha1, label } = task;
  const fileLabel = label || path.basename(destination);
  const dir = path.dirname(destination);

  // Initialize result here, it will be updated within the loop
  const result: DownloadResult = {
    task,
    success: false,
    validationPassed: false,
  };

  // --- Throttling variables ---
  let lastProgressUpdate = 0;
  const progressUpdateInterval = 1000;

  const sendProgress = (
    status: DownloadStatus,
    progress: number,
    downloadedBytes?: number,
    totalBytes?: number,
    error?: string,
  ) => {
    mainWindow?.webContents.send('download-progress', {
      file: fileLabel,
      progress,
      status,
      totalBytes,
      downloadedBytes,
      error,
    });
  };

  const MAX_ATTEMPTS = 3;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    result.success = false; // Reset success for each attempt
    result.validationPassed = false; // Reset validation for each attempt
    result.error = undefined; // Clear previous error

    try {
      await fs.promises.mkdir(dir, { recursive: true });

      // --- Pre-Download Validation Check ---
      if (sha1 && fs.existsSync(destination)) {
        console.log(
          `DownloadManager: File exists ${destination}. Validating SHA1 (Attempt ${attempts})...`,
        );
        sendProgress(DownloadStatus.VALIDATING, 0, 0, task.size);
        const existingSha1 = await calculateFileSha1(destination);
        if (existingSha1 === sha1) {
          console.log(
            `DownloadManager: SHA1 valid for existing file ${destination}. Skipping download.`,
          );
          sendProgress(DownloadStatus.VALIDATED, 100, task.size, task.size);
          result.success = true;
          result.validationPassed = true;
          return result; // Successfully validated existing file
        }
        console.log(
          `DownloadManager: SHA1 mismatch for ${destination}. Redownloading (Attempt ${attempts}).`,
        );
        // Optionally delete the mismatched file before redownloading
        // await fs.promises.unlink(destination).catch(e => console.warn(`Failed to delete mismatched file: ${destination}`, e));
      }

      // --- Download ---
      console.log(
        `DownloadManager: Starting download (Attempt ${attempts}/${MAX_ATTEMPTS}): ${url} -> ${destination}`,
      );
      sendProgress(DownloadStatus.DOWNLOADING, 0, 0, task.size);

      await new Promise<void>((resolvePromise, rejectPromise) => {
        const fileStream = fs.createWriteStream(destination);
        let downloadedBytes = 0;
        let totalBytes = task.size || 0;

        const req = https.get(url, (response) => {
          if (response.statusCode !== 200) {
            const error = new Error(
              `Failed to download ${url}. Status: ${response.statusCode}`,
            );
            response.resume(); // Consume data to free resources
            fileStream.close(() => rejectPromise(error)); // Close stream before rejecting
            return;
          }

          if (!totalBytes) {
            const contentLength = response.headers['content-length'];
            totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
          }

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const now = Date.now();
            if (now - lastProgressUpdate > progressUpdateInterval) {
              lastProgressUpdate = now;
              const progress =
                totalBytes > 0
                  ? Math.round((downloadedBytes / totalBytes) * 100)
                  : -1; // -1 if total size unknown
              sendProgress(
                DownloadStatus.DOWNLOADING,
                progress,
                downloadedBytes,
                totalBytes,
              );
            }
          });

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(); // Ensure stream is closed
            sendProgress(
              DownloadStatus.DOWNLOADING, // Still downloading until validated
              100,
              totalBytes, // Assume all bytes downloaded if finish event fires
              totalBytes,
            );
            console.log(
              `DownloadManager: Finished download stream for: ${destination} (Attempt ${attempts})`,
            );
            resolvePromise();
          });

          fileStream.on('error', (err) => {
            console.error(
              `DownloadManager: File stream error for ${destination} (Attempt ${attempts}):`,
              err,
            );
            rejectPromise(err);
          });
        });

        req.on('error', (err) => {
          console.error(
            `DownloadManager: Request error for ${url} (Attempt ${attempts}):`,
            err,
          );
          // Attempt to clean up partially downloaded file
          fs.unlink(destination, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
              // ENOENT means file didn't exist, which is fine
              console.error(
                `DownloadManager: Failed to cleanup ${destination} after request error:`,
                unlinkErr,
              );
            }
          });
          rejectPromise(err);
        });

        req.setTimeout(30000, () => {
          // 30 second timeout
          const timeoutError = new Error(
            `Download request timed out for ${url} (Attempt ${attempts})`,
          );
          req.destroy(timeoutError); // This should trigger 'error' event on req
        });
      });

      result.success = true; // Download itself was successful

      // --- Post-Download Validation ---
      if (sha1) {
        sendProgress(DownloadStatus.VALIDATING, 100, task.size, task.size);
        const downloadedSha1 = await calculateFileSha1(destination);
        if (downloadedSha1 === sha1) {
          result.validationPassed = true;
          console.log(
            `DownloadManager: SHA1 validation passed for ${destination} (Attempt ${attempts}).`,
          );
          sendProgress(DownloadStatus.VALIDATED, 100, task.size, task.size);
        } else {
          result.validationPassed = false;
          result.error = `SHA1 mismatch (Expected: ${sha1}, Got: ${
            downloadedSha1 || 'null'
          }) on attempt ${attempts}`;
          console.error(`DownloadManager: ${result.error} for ${destination}`);
          sendProgress(
            DownloadStatus.VALIDATION_FAILED,
            100,
            task.size,
            task.size,
            result.error,
          );
          // If validation fails, throw an error to trigger a retry for the download itself
          if (attempts < MAX_ATTEMPTS) {
            console.warn(
              `DownloadManager: Validation failed for ${fileLabel} on attempt ${attempts}. Retrying download.`,
            );
            // Optionally delete the corrupted file before retrying
            await fs.promises
              .unlink(destination)
              .catch((e) =>
                console.warn(
                  `Failed to delete mismatched file before retry: ${destination}`,
                  e,
                ),
              );
            throw new Error(result.error); // This will be caught by the outer catch and trigger a retry
          }
        }
      } else {
        result.validationPassed = true; // No SHA1 to validate against
        sendProgress(
          DownloadStatus.DOWNLOADED_NO_CHECKSUM,
          100,
          task.size,
          task.size,
        );
      }

      return result; // Successfully downloaded and validated (if applicable)
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        `Error during download task for ${url} (Attempt ${attempts})`,
      );
      console.error(`DownloadManager: ${errorMessage}`, error);
      result.success = false; // Ensure success is false on any error in this attempt
      result.error = errorMessage;

      if (attempts >= MAX_ATTEMPTS) {
        sendProgress(
          DownloadStatus.ERROR,
          0, // Progress might be irrelevant or unknown
          0,
          task.size,
          errorMessage,
        );
        return result; // Failed after all attempts
      }

      // Wait a bit before the next attempt (simple exponential backoff)
      const delay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s
      console.log(
        `DownloadManager: Retrying download for ${fileLabel} in ${
          delay / 1000
        }s...`,
      );
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    }
  }

  // Should not be reached if logic is correct, but as a fallback:
  console.error(
    `DownloadManager: Exited download loop unexpectedly for ${fileLabel}.`,
  );
  result.success = false;
  result.error =
    result.error || 'Exited download loop unexpectedly after all attempts.';
  sendProgress(DownloadStatus.ERROR, 0, 0, task.size, result.error);
  return result;
}

/**
 * Downloads multiple files, potentially in parallel.
 * @param tasks Array of download tasks.
 * @param parallelLimit Max number of parallel downloads.
 * @param mainWindow The main browser window to send progress updates.
 * @returns Promise resolving when all downloads are attempted. Reports success/failure counts.
 */
export async function downloadMultipleFiles(
  tasks: Array<DownloadTask>,
  parallelLimit: number,
  mainWindow: BrowserWindow | null,
): Promise<{
  successCount: number;
  failureCount: number;
  validationFailures: number;
}> {
  let successCount = 0;
  let failureCount = 0;
  let validationFailures = 0;
  const queue = [...tasks];
  const activeDownloads: Array<Promise<DownloadResult>> = [];

  // Simple parallel execution pool
  const execute = async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) continue;

      const downloadPromise = downloadFile(task, mainWindow);
      activeDownloads.push(downloadPromise);

      downloadPromise.then((result) => {
        if (result.success && result.validationPassed) {
          successCount++;
        } else {
          failureCount++;
          if (result.success && !result.validationPassed) {
            validationFailures++;
          }
        }
        // Remove completed promise from active list
        const index = activeDownloads.indexOf(downloadPromise);
        if (index > -1) {
          activeDownloads.splice(index, 1);
        }
        // Trigger next if pool has space (recursive call essentially)
        // This check prevents infinite loops if queue is empty but pool isn't full yet
        if (activeDownloads.length < parallelLimit && queue.length > 0) {
          execute();
        }
      });

      // If pool is full, wait for one to finish before starting next
      if (activeDownloads.length >= parallelLimit) {
        await Promise.race(activeDownloads); // Wait for the fastest active download to complete
      }
    }
    // After queue is empty, wait for all remaining active downloads
    await Promise.all(activeDownloads);
  };

  await execute(); // Start the process

  console.log(
    `DownloadManager: Multi-download complete. Success: ${successCount}, Failures: ${failureCount}, Validation Failures: ${validationFailures}`,
  );
  return { successCount, failureCount, validationFailures };
}
