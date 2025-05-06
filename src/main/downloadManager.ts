import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { BrowserWindow } from 'electron'; // To send progress updates
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
 * Downloads a single file with validation and progress reporting.
 * @param task The download task details.
 * @param mainWindow The main browser window to send progress updates.
 * @returns Promise resolving to the download result.
 */
export async function downloadFile(
  task: DownloadTask,
  mainWindow: BrowserWindow | null,
): Promise<DownloadResult> {
  const { url, destination, sha1, label } = task;
  const fileLabel = label || path.basename(destination); // Use label or fallback to filename
  const dir = path.dirname(destination);
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

  try {
    await fs.promises.mkdir(dir, { recursive: true });

    // --- Validation Check ---
    if (sha1 && fs.existsSync(destination)) {
      console.log(
        `DownloadManager: File exists ${destination}. Validating SHA1...`,
      );
      sendProgress(DownloadStatus.VALIDATING, 0, 0, task.size);
      /* mainWindow?.webContents.send('download-progress', {
        file: fileLabel,
        progress: 0,
        status: DownloadStatus.VALIDATING,
        totalBytes: task.size,
        downloadedBytes: 0,
      }) */
      const existingSha1 = await calculateFileSha1(destination);
      if (existingSha1 === sha1) {
        console.log(
          `DownloadManager: SHA1 valid for existing file ${destination}. Skipping download.`,
        );
        /* mainWindow?.webContents.send('download-progress', {
          file: fileLabel,
          progress: 100,
          status: DownloadStatus.VALIDATED,
          totalBytes: task.size,
          downloadedBytes: task.size,
        }) */
        sendProgress(DownloadStatus.VALIDATED, 100, task.size, task.size);
        return { task, success: true, validationPassed: true };
      } else {
        console.log(
          `DownloadManager: SHA1 mismatch for ${destination}. Redownloading.`,
        );
      }
    }

    // --- Download ---
    console.log(`DownloadManager: Starting download: ${url} -> ${destination}`);
    /* mainWindow?.webContents.send('download-progress', {
      file: fileLabel,
      progress: 0,
      status: 'Downloading',
      totalBytes: task.size,
      downloadedBytes: 0,
    }) */
    sendProgress(DownloadStatus.DOWNLOADING, 0, 0, task.size);

    await new Promise<void>((resolve, reject) => {
      const fileStream = fs.createWriteStream(destination);
      let downloadedBytes = 0;
      let totalBytes = task.size || 0; // Use task size if available

      const req = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume(); // Consume data to free resources
          reject(
            new Error(
              `Failed to download ${url}. Status: ${response.statusCode}`,
            ),
          );
          return;
        }

        // Get total size from header if not provided in task
        if (!totalBytes) {
          const contentLength = response.headers['content-length'];
          totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        }

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          // Throttle progress updates
          if (now - lastProgressUpdate > progressUpdateInterval) {
            lastProgressUpdate = now;
            const progress =
              totalBytes > 0
                ? Math.round((downloadedBytes / totalBytes) * 100)
                : -1;
            sendProgress(
              DownloadStatus.DOWNLOADING,
              progress,
              downloadedBytes,
              totalBytes,
            );
          }
          // if (totalBytes > 0) {
          //   const progress = Math.round((downloadedBytes / totalBytes) * 100)
          //   // Throttle progress updates if needed, but for now send all
          //   mainWindow?.webContents.send('download-progress', {
          //     file: fileLabel,
          //     progress,
          //     status: 'Downloading',
          //     totalBytes,
          //     downloadedBytes,
          //   })
          // } else {
          //   // Send progress without percentage if total size unknown
          //   mainWindow?.webContents.send('download-progress', {
          //     file: fileLabel,
          //     progress: -1,
          //     status: 'Downloading',
          //     totalBytes: 0,
          //     downloadedBytes,
          //   })
          // }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          // Ensure final progress is 100% if totalBytes was known
          // if (totalBytes > 0) {
          //   mainWindow?.webContents.send('download-progress', {
          //     file: fileLabel,
          //     progress: 100,
          //     status: 'Downloaded',
          //     totalBytes,
          //     downloadedBytes: totalBytes,
          //   })
          // }
          sendProgress(DownloadStatus.DOWNLOADING, 100, totalBytes, totalBytes);
          console.log(`DownloadManager: Finished download: ${destination}`);
          resolve();
        });

        fileStream.on('error', (err) => {
          // Handle stream errors
          console.error(
            `DownloadManager: File stream error for ${destination}:`,
            err,
          );
          reject(err); // Reject the promise on stream error
        });
      });

      req.on('error', (err) => {
        console.error(`DownloadManager: Request error for ${url}:`, err);
        fs.unlink(destination, (unlinkErr) => {
          // Attempt cleanup
          if (unlinkErr)
            console.error(
              `DownloadManager: Failed to cleanup ${destination} after request error:`,
              unlinkErr,
            );
        });
        reject(err);
      });

      // Handle request timeouts (optional but recommended)
      req.setTimeout(30000, () => {
        // 30 second timeout
        req.destroy(new Error('Download request timed out'));
      });
    });

    result.success = true;

    // --- Post-Download Validation ---
    if (sha1) {
      // mainWindow?.webContents.send('download-progress', {
      //   file: fileLabel,
      //   progress: 100,
      //   status: DownloadStatus.VALIDATING,
      //   totalBytes: task.size,
      //   downloadedBytes: task.size,
      // })
      sendProgress(DownloadStatus.VALIDATING, 100, task.size, task.size);
      const downloadedSha1 = await calculateFileSha1(destination);
      if (downloadedSha1 === sha1) {
        result.validationPassed = true;
        console.log(
          `DownloadManager: SHA1 validation passed for ${destination}.`,
        );
        /* mainWindow?.webContents.send('download-progress', {
          file: fileLabel,
          progress: 100,
          status: DownloadStatus.VALIDATED,
          totalBytes: task.size,
          downloadedBytes: task.size,
        }) */
        sendProgress(DownloadStatus.VALIDATED, 100, task.size, task.size);
      } else {
        result.validationPassed = false;
        result.error = `SHA1 mismatch (Expected: ${sha1}, Got: ${downloadedSha1})`;
        console.error(`DownloadManager: ${result.error} for ${destination}`);
        // mainWindow?.webContents.send('download-progress', {
        //   file: fileLabel,
        //   progress: 100,
        //   status: DownloadStatus.VALIDATION_FAILED,
        //   totalBytes: task.size,
        //   downloadedBytes: task.size,
        // })
        sendProgress(
          DownloadStatus.VALIDATION_FAILED,
          100,
          task.size,
          task.size,
          result.error,
        );
      }
    } else {
      result.validationPassed = true; // No SHA1 to validate against
      // mainWindow?.webContents.send('download-progress', {
      //   file: fileLabel,
      //   progress: 100,
      //   status: 'Downloaded (No Checksum)',
      //   totalBytes: task.size,
      //   downloadedBytes: task.size,
      // })
      sendProgress(
        DownloadStatus.DOWNLOADED_NO_CHECKSUM,
        100,
        task.size,
        task.size,
      );
    }
  } catch (error: unknown) {
    result.success = false;

    const errorMessage = getErrorMessage(
      error,
      `Error during download task for ${url}`,
    );
    console.error(`DownloadManager: ${errorMessage}:`, error);
    // mainWindow?.webContents.send('download-progress', {
    //   file: fileLabel,
    //   progress: 0,
    //   status: 'Error',
    //   error: errorMessage,
    //   totalBytes: task.size,
    //   downloadedBytes: 0,
    // })
    sendProgress(DownloadStatus.ERROR, 0, 0, task.size, errorMessage);
  }

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
