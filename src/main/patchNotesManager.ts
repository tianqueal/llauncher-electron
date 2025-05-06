import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { PatchNotes } from '../types/PatchNotes';

const PATCH_NOTES_URL =
  'https://launchercontent.mojang.com/v2/javaPatchNotes.json';

/**
 * Fetches the patch notes from Mojang.
 * @returns A promise resolving to the patch notes data or null if fetch fails.
 */
async function fetchPatchNotesFromWeb(): Promise<PatchNotes | null> {
  console.log('PatchNotesManager: Fetching patch notes from', PATCH_NOTES_URL);
  return new Promise((resolve) => {
    https
      .get(PATCH_NOTES_URL, (res) => {
        if (res.statusCode !== 200) {
          console.error(
            `PatchNotesManager: Failed to fetch patch notes. Status Code: ${res.statusCode}`,
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
            const parsedData = JSON.parse(rawData) as PatchNotes;
            console.log('PatchNotesManager: Patch notes fetched successfully.');
            resolve(parsedData);
          } catch (e) {
            console.error(
              'PatchNotesManager: Error parsing patch notes JSON:',
              e,
            );
            resolve(null);
          }
        });
      })
      .on('error', (e) => {
        console.error('PatchNotesManager: Error fetching patch notes:', e);
        resolve(null);
      });
  });
}

/**
 * Reads the locally stored patch notes.
 * @param patchNotesPath Absolute path to the local patch notes file.
 * @returns The parsed patch notes data or null if read fails or file doesn't exist.
 */
export function readLocalPatchNotes(patchNotesPath: string): PatchNotes | null {
  if (!fs.existsSync(patchNotesPath)) {
    console.log(
      'PatchNotesManager: Local patch notes file not found at',
      patchNotesPath,
    );
    return null;
  }
  try {
    const rawData = fs.readFileSync(patchNotesPath, 'utf-8');
    const parsedData = JSON.parse(rawData) as PatchNotes;
    console.log('PatchNotesManager: Local patch notes read successfully.');
    return parsedData;
  } catch (err) {
    console.error(
      'PatchNotesManager: Error reading or parsing local patch notes:',
      err,
    );
    return null;
  }
}

/**
 * Fetches patch notes from the web and stores them locally.
 * @param patchNotesPath Absolute path to the local patch notes file.
 */
export async function updateLocalPatchNotes(
  patchNotesPath: string,
): Promise<void> {
  const patchNotesData = await fetchPatchNotesFromWeb();
  if (patchNotesData) {
    try {
      const dir = path.dirname(patchNotesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(patchNotesPath, JSON.stringify(patchNotesData, null, 2));
      console.log(
        'PatchNotesManager: Local patch notes updated successfully at',
        patchNotesPath,
      );
    } catch (err) {
      console.error('PatchNotesManager: Error writing local patch notes:', err);
    }
  } else {
    console.log(
      'PatchNotesManager: Skipping local patch notes update due to fetch failure.',
    );
  }
}

/**
 * Ensures the patch notes file exists locally. Fetches if not.
 * @param patchNotesPath Absolute path to the local patch notes file.
 */
export async function ensurePatchNotesExist(
  patchNotesPath: string,
): Promise<void> {
  if (!fs.existsSync(patchNotesPath)) {
    console.log(
      "PatchNotesManager: Local patch notes don't exist. Attempting initial fetch...",
    );
    await updateLocalPatchNotes(patchNotesPath);
  } else {
    console.log('PatchNotesManager: Local patch notes exist.');
  }
}
