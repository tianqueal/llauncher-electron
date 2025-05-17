import fs from 'node:fs';
import path from 'node:path'; // Import path if needed for operations within functions
import { defaultLauncherProfiles } from '../config/launcherProfilesConfig';
import { getErrorMessage } from './errorUtils';
import { LauncherProfiles } from '../types/LauncherProfiles';

/**
 * Loads launcher profiles from the specified JSON file path.
 * Returns default launch profiles if the file doesn't exist, is invalid, or an error occurs.
 * @param launcherProfilesPath The absolute path to the launcher_profiles.json file.
 * @returns The loaded launcher profiles object.
 */
export function loadLauncherProfiles(
  launcherProfilesPath: string,
): LauncherProfiles {
  try {
    if (fs.existsSync(launcherProfilesPath)) {
      const data = fs.readFileSync(launcherProfilesPath, 'utf-8');
      const parsedLauncherProfiles = JSON.parse(data);

      // Validate structure: ensure all default keys exist in the loaded data
      const isValid = Object.keys(defaultLauncherProfiles).every(
        (key) => key in parsedLauncherProfiles,
      );

      if (isValid) {
        console.log(
          'Launcher profiles loaded successfully from:',
          launcherProfilesPath,
        );
        // Optionally merge with defaults to add new settings keys automatically
        // return { ...defaultLauncherProfiles, ...parsedLauncherProfiles };
        return parsedLauncherProfiles as LauncherProfiles;
      } else {
        console.warn(
          `Settings file at ${launcherProfilesPath} has invalid structure. Using defaults and overwriting.`,
        );
        // Overwrite the invalid file with defaults
        saveLauncherProfiles(launcherProfilesPath, defaultLauncherProfiles);
        return defaultLauncherProfiles;
      }
    } else {
      console.log(
        `Settings file not found at ${launcherProfilesPath}. Creating with defaults.`,
      );
      // Create the file with defaults if it doesn't exist
      saveLauncherProfiles(launcherProfilesPath, defaultLauncherProfiles);
      return defaultLauncherProfiles;
    }
  } catch (err) {
    console.error(
      `Error loading or parsing settings file at ${launcherProfilesPath}:`,
      err,
    );
    // Attempt to fix by writing defaults if an error occurred (e.g., corrupted JSON)
    try {
      saveLauncherProfiles(launcherProfilesPath, defaultLauncherProfiles);
    } catch (saveError) {
      console.error(
        `Failed to write default settings after load error at ${launcherProfilesPath}:`,
        saveError,
      );
    }
    return defaultLauncherProfiles; // Return defaults in case of any error
  }
}

/**
 * Saves the provided launcher profiles data to the specified JSON file path.
 * @param launcherProfilesPath The absolute path to the launcher_profiles.json file.
 * @param launcherProfilesData The launcher profiles object to save.
 * @returns An object indicating success or failure.
 */
export function saveLauncherProfiles(
  launcherProfilesPath: string,
  launcherProfilesData: LauncherProfiles,
): { success: boolean; error?: string } {
  try {
    // Ensure the directory exists before writing
    const dir = path.dirname(launcherProfilesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Basic validation before saving (ensure it's an object)
    if (
      typeof launcherProfilesData === 'object' &&
      launcherProfilesData !== null
    ) {
      fs.writeFileSync(
        launcherProfilesPath,
        JSON.stringify(launcherProfilesData, null, 2),
      ); // Pretty print JSON
      console.log('Settings saved successfully to:', launcherProfilesPath);
      return { success: true };
    } else {
      console.error(
        'Attempted to save invalid launcher profiles data:',
        launcherProfilesData,
      );
      return { success: false, error: 'Invalid launcher profiles data format' };
    }
  } catch (err) {
    const errorMessage = getErrorMessage(
      err,
      `Error saving launcher profiles file to ${launcherProfilesPath}`,
    );
    console.error(errorMessage, err);
    return { success: false, error: errorMessage };
  }
}
