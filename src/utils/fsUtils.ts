import fs from 'node:fs';
import path from 'node:path';

/**
 * Calculates the total size of a directory recursively.
 * @param directoryPath The absolute path to the directory.
 * @returns A promise resolving to the total size in bytes, or 0 if error.
 */
export async function getDirectorySize(directoryPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const entries = await fs.promises.readdir(directoryPath, {
      withFileTypes: true,
    });
    const promises: Array<Promise<number>> = [];

    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        promises.push(getDirectorySize(fullPath)); // Recurse into subdirectories
      } else if (entry.isFile()) {
        try {
          const stats = await fs.promises.stat(fullPath);
          totalSize += stats.size; // Add file size
        } catch (statErr) {
          console.warn(`fsUtils: Could not stat file ${fullPath}:`, statErr);
          // Ignore files we can't access
        }
      }
    }
    // Wait for all subdirectory size calculations and add them up
    const subDirSizes = await Promise.all(promises);
    totalSize += subDirSizes.reduce((sum, size) => sum + size, 0);
  } catch (err) {
    console.error(`fsUtils: Error reading directory ${directoryPath}:`, err);
    return 0; // Return 0 on error
  }
  return totalSize;
}
