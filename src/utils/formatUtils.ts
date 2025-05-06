/**
 * Formats a number of bytes into a human-readable string (KB, MB, GB, etc.).
 * @param bytes The number of bytes.
 * @param decimals The number of decimal places to display (default: 2).
 * @returns A formatted string representing the size.
 */
export function formatBytes(bytes: number | undefined, decimals = 2): string {
  if (bytes === undefined || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Ensure the index doesn't go out of bounds for extremely large numbers
  const unitIndex = Math.min(i, sizes.length - 1);
  return (
    parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(dm)) +
    ' ' +
    sizes[unitIndex]
  );
}
