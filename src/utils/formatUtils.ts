import { SettingsState } from '../types/SettingsState';

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

/**
 * Trims all string values in a settings object.
 * @param settings The settings object to be trimmed.
 * @returns A new settings object with all string values trimmed.
 */
export function trimStringSettings(settings: SettingsState): SettingsState {
  const trimmedSettings = { ...settings };
  for (const key in trimmedSettings) {
    if (typeof trimmedSettings[key] === 'string') {
      trimmedSettings[key] = trimmedSettings[key].trim();
    }
  }
  return trimmedSettings;
}
