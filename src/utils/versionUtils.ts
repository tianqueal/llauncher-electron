/**
 * Compares two version strings numerically (e.g., "1.10.2" > "1.9.4").
 * Handles different numbers of segments.
 * Returns > 0 if versionA is greater than versionB, < 0 if less, 0 if equal.
 * For descending sort (newest first), use compareVersions(b, a).
 * @param versionA First version string
 * @param versionB Second version string
 */
export function compareVersions(versionA: string, versionB: string): number {
  const partsA = versionA.split('.').map(Number);
  const partsB = versionB.split('.').map(Number);
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const partA = partsA[i] || 0; // Default to 0 if segment doesn't exist
    const partB = partsB[i] || 0;

    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }

  return 0; // Versions are equal
}
