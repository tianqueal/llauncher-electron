import { UserType } from '../types/UserType';

/**
 * Defines the structure for the application settings.
 */
export interface SettingsState {
  username: string;
  memoryMinimum: number;
  memoryMaximum: number;
  javaPath: string;
  gameDirectory: string;
  resolutionWidth: number;
  resolutionHeight: number;
  keepLauncherOpen: boolean;
  jvmArguments: string;
  parallelDownloads: number;
  lastSelectedVersion?: string;
  showAllVersions?: boolean;
  // --- Authentication Fields ---
  accessToken?: string;
  clientToken?: string;
  uuid?: string;
  xuid?: string;
  userType?: UserType;
  // --- End Authentication Fields ---
  [key: string]: string | number | boolean; // Allow index signature for dynamic access
}

/**
 * Default settings values used when no settings file exists or it's invalid.
 */
export const defaultSettings: SettingsState = {
  username: 'Player',
  memoryMinimum: 512,
  memoryMaximum: 4096,
  javaPath: '',
  gameDirectory: '',
  resolutionWidth: 854,
  resolutionHeight: 480,
  keepLauncherOpen: true,
  jvmArguments: '',
  parallelDownloads: 5,
  lastSelectedVersion: '',
  showAllVersions: false,
  // --- Default Authentication Fields ---
  accessToken: '',
  clientToken: '',
  uuid: '',
  xuid: '',
  userType: UserType.OFFLINE,
  // --- End Default Authentication Fields ---
};
