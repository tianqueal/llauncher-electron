import { UserType } from './UserType';

/**
 * Defines the structure for the settings state
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
  showAllVersions?: boolean;
  // --- Authentication Fields ---
  accessToken?: string;
  clientToken?: string;
  uuid?: string;
  xuid?: string;
  userType?: UserType;
  // --- End Authentication Fields ---
  [key: string]: string | number | boolean | UserType | undefined;
}
