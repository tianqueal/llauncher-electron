import { LauncherProfile } from './LauncherProfile';
import { SettingsState } from './SettingsState';

/**
 * Defines the structure for launcher profiles
 */
export interface LauncherProfiles {
  profiles: Map<string, LauncherProfile>;
  settings: SettingsState;
  lastSelectedVersion?: string;
  version: number;
}
