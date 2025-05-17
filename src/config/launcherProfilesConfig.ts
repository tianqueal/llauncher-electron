import { SettingsState } from '../types/SettingsState';
import { UserType } from '../types/UserType';
import { LauncherProfiles } from '../types/LauncherProfiles';
import { LauncherProfile } from '../types/LauncherProfile';

/**
 * Default settings values used when no settings key exists or it's invalid.
 */
export const defaultSettingsState: SettingsState = {
  username: 'Player',
  memoryMinimum: 512,
  memoryMaximum: 4096,
  javaPath: '',
  gameDirectory: '',
  resolutionWidth: 854,
  resolutionHeight: 480,
  keepLauncherOpen: true,
  jvmArguments: '',
  parallelDownloads: 3,
  showAllVersions: false,
  // --- Default Authentication Fields ---
  accessToken: '',
  clientToken: '',
  uuid: '',
  xuid: '',
  userType: UserType.OFFLINE,
  // --- End Default Authentication Fields ---
};

/**
 * Default launcher profiles used when no profiles file exists or it's invalid.
 */
export const defaultLauncherProfiles: LauncherProfiles = {
  profiles: new Map<string, LauncherProfile>(),
  settings: defaultSettingsState,
  lastSelectedVersion: '',
  version: 1,
};
