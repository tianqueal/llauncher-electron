import fs from 'node:fs';
import path from 'node:path'; // Import path if needed for operations within functions
import { SettingsState, defaultSettings } from '../config/settingsConfig';
import { getErrorMessage } from './errorUtils';

/**
 * Loads settings from the specified JSON file path.
 * Returns default settings if the file doesn't exist, is invalid, or an error occurs.
 * @param settingsPath The absolute path to the settings.json file.
 * @returns The loaded settings object.
 */
export function loadSettings(settingsPath: string): SettingsState {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const parsedSettings = JSON.parse(data);

      // Validate structure: ensure all default keys exist in the loaded data
      const isValid = Object.keys(defaultSettings).every(
        (key) => key in parsedSettings,
      );

      if (isValid) {
        console.log('Settings loaded successfully from:', settingsPath);
        // Optionally merge with defaults to add new settings keys automatically
        // return { ...defaultSettings, ...parsedSettings };
        return parsedSettings as SettingsState;
      } else {
        console.warn(
          `Settings file at ${settingsPath} has invalid structure. Using defaults and overwriting.`,
        );
        // Overwrite the invalid file with defaults
        saveSettings(settingsPath, defaultSettings);
        return defaultSettings;
      }
    } else {
      console.log(
        `Settings file not found at ${settingsPath}. Creating with defaults.`,
      );
      // Create the file with defaults if it doesn't exist
      saveSettings(settingsPath, defaultSettings);
      return defaultSettings;
    }
  } catch (err) {
    console.error(
      `Error loading or parsing settings file at ${settingsPath}:`,
      err,
    );
    // Attempt to fix by writing defaults if an error occurred (e.g., corrupted JSON)
    try {
      saveSettings(settingsPath, defaultSettings);
    } catch (saveError) {
      console.error(
        `Failed to write default settings after load error at ${settingsPath}:`,
        saveError,
      );
    }
    return defaultSettings; // Return defaults in case of any error
  }
}

/**
 * Saves the provided settings data to the specified JSON file path.
 * @param settingsPath The absolute path to the settings.json file.
 * @param settingsData The settings object to save.
 * @returns An object indicating success or failure.
 */
export function saveSettings(
  settingsPath: string,
  settingsData: SettingsState,
): { success: boolean; error?: string } {
  try {
    // Ensure the directory exists before writing
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Basic validation before saving (ensure it's an object)
    if (typeof settingsData === 'object' && settingsData !== null) {
      fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2)); // Pretty print JSON
      console.log('Settings saved successfully to:', settingsPath);
      return { success: true };
    } else {
      console.error('Attempted to save invalid settings data:', settingsData);
      return { success: false, error: 'Invalid settings data format' };
    }
  } catch (err) {
    const errorMessage = getErrorMessage(
      err,
      `Error saving settings file to ${settingsPath}`,
    );
    console.error(errorMessage, err);
    return { success: false, error: errorMessage };
  }
}
