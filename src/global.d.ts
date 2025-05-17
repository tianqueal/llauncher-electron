import { IpcRendererEvent } from 'electron';
import { LauncherProfiles } from './config/launcherProfilesConfig';
import { VersionManifest } from './types/VersionManifest';
import { PatchNotes } from './types/PatchNotes';
import { LocalVersion } from './types/LocalVersion';
import { VersionDetails } from './types/VersionDetails';
import {
  DownloadProgressArgs,
  LaunchOutputArgs,
  LaunchStatusArgs,
} from './types/IpcEvents';

declare global {
  interface Window {
    electron: {
      // Exposed constants
      constants: {
        patchNotesBaseUrl: string;
      };
      // Theme
      onUpdateTheme: (
        callback: (event: IpcRendererEvent, theme: string) => void,
      ) => void;
      loadLauncherProfiles: () => Promise<LauncherProfiles>;
      saveLauncherProfiles: (
        laucherProfiles: LauncherProfiles,
      ) => Promise<{ success: boolean; error?: string }>;
      // Versions
      listVersions: () => Promise<Array<LocalVersion>>;
      // Version Manifest
      getVersionManifest: () => Promise<VersionManifest | null>;
      // Patch Notes
      getPatchNotes: () => Promise<PatchNotes | null>;
      // getVersionDetails
      getVersionDetails: (versionId: string) => Promise<VersionDetails | null>;

      // launch/kill methods
      launchVersion: (
        versionId: string,
      ) => Promise<{ success: boolean; message?: string; error?: string }>;
      killGame: () => Promise<{ success: boolean; error?: string }>;

      // Version Management
      deleteVersion: (
        versionId: string,
      ) => Promise<{ success: boolean; error?: string }>;
      openDirectory: (
        dirPath: string,
      ) => Promise<{ success: boolean; error?: string }>;

      openExternalLink: (
        url: string,
      ) => Promise<{ success: boolean; error?: string }>;

      // listeners
      onLaunchStatus: (
        callback: (event: IpcRendererEvent, args: LaunchStatusArgs) => void,
      ) => void;
      onDownloadProgress: (
        callback: (event: IpcRendererEvent, args: DownloadProgressArgs) => void,
      ) => void;
      onLaunchOutput: (
        callback: (event: IpcRendererEvent, args: LaunchOutputArgs) => void,
      ) => void;

      // listener remover
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
