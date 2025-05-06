import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { VersionManifest } from '../types/VersionManifest';

const MANIFEST_URL =
  'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';

/**
 * Fetches the version manifest from Mojang.
 * @returns A promise resolving to the manifest data or null if fetch fails.
 */
async function fetchManifestFromWeb(): Promise<VersionManifest | null> {
  console.log('ManifestManager: Fetching manifest from', MANIFEST_URL);
  return new Promise((resolve) => {
    https
      .get(MANIFEST_URL, (res) => {
        if (res.statusCode !== 200) {
          console.error(
            `ManifestManager: Failed to fetch manifest. Status Code: ${res.statusCode}`,
          );
          res.resume(); // Consume response data to free up memory
          return resolve(null);
        }

        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData) as VersionManifest;
            console.log('ManifestManager: Manifest fetched successfully.');
            resolve(parsedData);
          } catch (e) {
            console.error('ManifestManager: Error parsing manifest JSON:', e);
            resolve(null);
          }
        });
      })
      .on('error', (e) => {
        console.error('ManifestManager: Error fetching manifest:', e);
        resolve(null);
      });
  });
}

/**
 * Reads the locally stored version manifest.
 * @param manifestPath Absolute path to the local manifest file.
 * @returns The parsed manifest data or null if read fails or file doesn't exist.
 */
export function readLocalManifest(
  manifestPath: string,
): VersionManifest | null {
  if (!fs.existsSync(manifestPath)) {
    console.log(
      'ManifestManager: Local manifest file not found at',
      manifestPath,
    );
    return null;
  }
  try {
    const rawData = fs.readFileSync(manifestPath, 'utf-8');
    const parsedData = JSON.parse(rawData) as VersionManifest;
    console.log('ManifestManager: Local manifest read successfully.');
    return parsedData;
  } catch (err) {
    console.error(
      'ManifestManager: Error reading or parsing local manifest:',
      err,
    );
    return null;
  }
}

/**
 * Fetches the manifest from the web and stores it locally, overwriting the old one.
 * Does nothing if the fetch fails.
 * @param manifestPath Absolute path to the local manifest file.
 */
export async function updateLocalManifest(manifestPath: string): Promise<void> {
  const manifestData = await fetchManifestFromWeb();
  if (manifestData) {
    try {
      const dir = path.dirname(manifestPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
      console.log(
        'ManifestManager: Local manifest updated successfully at',
        manifestPath,
      );
    } catch (err) {
      console.error('ManifestManager: Error writing local manifest:', err);
    }
  } else {
    console.log(
      'ManifestManager: Skipping local manifest update due to fetch failure.',
    );
  }
}

/**
 * Ensures the manifest exists locally. If not, attempts to fetch and store it.
 * Should be called on app startup.
 * @param manifestPath Absolute path to the local manifest file.
 */
export async function ensureManifestExists(
  manifestPath: string,
): Promise<void> {
  if (!fs.existsSync(manifestPath)) {
    console.log(
      "ManifestManager: Local manifest doesn't exist. Attempting initial fetch...",
    );
    await updateLocalManifest(manifestPath);
  } else {
    console.log('ManifestManager: Local manifest exists.');
    // Optionally trigger an update in the background here if desired on every startup
    // updateLocalManifest(manifestPath); // This would run in background
  }
}
