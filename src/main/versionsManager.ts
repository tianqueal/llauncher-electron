import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { LocalVersion, LocalVersionStatus } from '../types/LocalVersion';
import { VersionDetails } from '../types/VersionDetails';
import { VersionManifest } from '../types/VersionManifest';
import { getErrorMessage } from '../utils/errorUtils';
import { ensureVersionsDirExists, getDirectorySize } from '../utils/fsUtils';

/**
 * Lists installed versions based on subdirectories.
 * @param versionsPath The absolute path to the versions directory.
 * @returns A promise resolving to an array of Version objects.
 */
export async function listInstalledVersions(
  versionsPath: string,
): Promise<Array<LocalVersion>> {
  ensureVersionsDirExists(versionsPath); // Ensure dir exists before reading
  try {
    const entries = await fs.promises.readdir(versionsPath, {
      withFileTypes: true,
    });
    const versionDirs = entries.filter((entry) => entry.isDirectory());

    const versionPromises = versionDirs.map(
      async (dir): Promise<LocalVersion> => {
        const versionPath = path.join(versionsPath, dir.name);
        const versionJsonPath = path.join(versionPath, `${dir.name}.json`);
        const status: LocalVersion['status'] = fs.existsSync(versionJsonPath)
          ? LocalVersionStatus.Downloaded
          : LocalVersionStatus.Unknown;

        // Calculate size asynchronously
        const sizeBytes = await getDirectorySize(versionPath);

        return {
          id: dir.name,
          name: dir.name,
          status: status,
          path: versionPath,
          sizeBytes: sizeBytes, // Include the calculated size
        };
      },
    );

    // const versions: Array<LocalVersion> = versionDirs.map((dir) => {
    //   const versionJsonPath = path.join(
    //     versionsPath,
    //     dir.name,
    //     `${dir.name}.json`
    //   )
    //   const status: LocalVersion['status'] = fs.existsSync(versionJsonPath)
    //     ? LocalVersionStatus.Downloaded
    //     : LocalVersionStatus.Unknown
    //   return {
    //     id: dir.name,
    //     name: dir.name,
    //     status: status,
    //     path: path.join(versionsPath, dir.name),
    //   }
    // })

    // Wait for all version details (including size calculation) to resolve
    const versions = await Promise.all(versionPromises);

    console.log('Found local versions:', versions);
    return versions;
  } catch (err) {
    console.error('Error listing installed versions:', err);
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // If the directory itself doesn't exist after trying to ensure it, return empty
      return [];
    }
    // Re-throw other errors or return empty array
    return [];
  }
}

/**
 * Fetches version details JSON from a given URL.
 * @param url The URL of the version details JSON.
 * @returns A promise resolving to the VersionDetails or null.
 */
async function fetchVersionDetailsFromWeb(
  url: string,
): Promise<VersionDetails | null> {
  console.log(`VersionsManager: Fetching version details from ${url}`);
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          console.error(
            `VersionsManager: Failed to fetch version details. Status Code: ${res.statusCode}`,
          );
          res.resume();
          return resolve(null);
        }
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData) as VersionDetails;
            console.log(
              `VersionsManager: Version details for ${parsedData.id} fetched successfully.`,
            );
            resolve(parsedData);
          } catch (e) {
            console.error(
              'VersionsManager: Error parsing version details JSON:',
              e,
            );
            resolve(null);
          }
        });
      })
      .on('error', (e) => {
        console.error('VersionsManager: Error fetching version details:', e);
        resolve(null);
      });
  });
}

/**
 * Gets the detailed manifest for a specific version ID.
 * Reads from local cache first, otherwise fetches from the web and caches it.
 * @param versionId The ID of the version (e.g., "1.20.1").
 * @param versionsPath The base path for storing versions.
 * @param manifest The main version manifest (needed to find the URL).
 * @returns A promise resolving to the VersionDetails or null.
 */
export async function getVersionDetails(
  versionId: string,
  versionsPath: string,
  manifest: VersionManifest | null,
): Promise<VersionDetails | null> {
  if (!manifest) {
    console.error(
      'VersionsManager: Cannot get version details without main manifest.',
    );
    return null;
  }

  const versionInfo = manifest.versions.find((v) => v.id === versionId);
  if (!versionInfo) {
    console.error(
      `VersionsManager: Version ID "${versionId}" not found in main manifest.`,
    );
    return null;
  }

  const versionDir = path.join(versionsPath, versionId);
  const versionJsonPath = path.join(versionDir, `${versionId}.json`);

  // 1. Try reading from local cache
  if (fs.existsSync(versionJsonPath)) {
    console.log(
      `VersionsManager: Found local details JSON for ${versionId}. Reading...`,
    );
    try {
      const rawData = await fs.promises.readFile(versionJsonPath, 'utf-8');
      const details = JSON.parse(rawData) as VersionDetails;
      console.log(
        `VersionsManager: Successfully read local details for ${versionId}.`,
      );
      return details;
    } catch (err) {
      console.error(
        `VersionsManager: Error reading local details JSON for ${versionId}:`,
        err,
      );
      // Proceed to fetch if reading failed
    }
  }

  // 2. Fetch from web if not found or read failed
  console.log(
    `VersionsManager: Local details JSON for ${versionId} not found or failed to read. Fetching...`,
  );
  const details = await fetchVersionDetailsFromWeb(versionInfo.url);

  // 3. Cache if fetched successfully
  if (details) {
    try {
      await fs.promises.mkdir(versionDir, { recursive: true }); // Ensure directory exists
      await fs.promises.writeFile(
        versionJsonPath,
        JSON.stringify(details, null, 2),
      );
      console.log(
        `VersionsManager: Successfully cached details for ${versionId}.`,
      );
    } catch (err) {
      console.error(
        `VersionsManager: Error caching details JSON for ${versionId}:`,
        err,
      );
      // Return details even if caching failed
    }
  }

  return details;
}

/**
 * Deletes a specific version directory.
 * @param versionId The ID of the version to delete.
 * @param versionsPath The base path for storing versions.
 * @returns A promise that resolves when deletion is complete or rejects on error.
 */
export async function deleteVersion(
  versionId: string,
  versionsPath: string,
): Promise<void> {
  const versionDir = path.join(versionsPath, versionId);
  console.log(`VersionsManager: Attempting to delete directory: ${versionDir}`);

  if (!fs.existsSync(versionDir)) {
    console.warn(
      `VersionsManager: Directory not found, cannot delete: ${versionDir}`,
    );
    // Consider if this should be an error or just a warning
    return; // Or throw new Error(`Version directory ${versionId} not found.`);
  }

  try {
    // Use fs.rm for modern Node.js (recursive deletion)
    await fs.promises.rm(versionDir, { recursive: true, force: true }); // force helps with potential permission issues or non-empty dirs
    console.log(
      `VersionsManager: Successfully deleted directory: ${versionDir}`,
    );
  } catch (err) {
    const errorMessage = getErrorMessage(
      err,
      `Failed to delete version ${versionId}`,
    );
    console.error(`VersionsManager: ${errorMessage}:`, err);
    // Re-throw the error so the IPC handler can catch it
    throw new Error(errorMessage);
  }
}

// Add future functions like downloadAssets, constructLaunchCommand here...
