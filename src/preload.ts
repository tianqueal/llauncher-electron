// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { SettingsState } from './config/settingsConfig';
import { LocalVersion } from './types/LocalVersion';
import { VersionManifest } from './types/VersionManifest';
import { PatchNotes } from './types/PatchNotes';
import { VersionDetails } from './types/VersionDetails';
import {
  DownloadProgressArgs,
  LaunchOutputArgs,
  LaunchStatusArgs,
} from './types/IpcEvents';
import environments from './utils/enviroments.vite';

contextBridge.exposeInMainWorld('electron', {
  // Expose constants
  constants: {
    patchNotesBaseUrl: environments.VITE_PATCH_NOTES_BASE_URL,
  },

  // Theme
  onUpdateTheme: (
    callback: (
      event: Electron.IpcRendererEvent,
      ...args: Array<unknown>
    ) => void,
  ) => ipcRenderer.on('update-theme', callback),

  // Settings
  saveSettings: (
    settings: SettingsState,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-settings', settings),

  loadSettings: (): Promise<SettingsState> =>
    ipcRenderer.invoke('load-settings'),

  // Versions
  listVersions: (): Promise<Array<LocalVersion>> =>
    ipcRenderer.invoke('list-versions'), // Add listVersions

  // Version Manifest
  getVersionManifest: (): Promise<VersionManifest | null> =>
    ipcRenderer.invoke('get-version-manifest'),

  // Patch Notes
  getPatchNotes: (): Promise<PatchNotes | null> =>
    ipcRenderer.invoke('get-patch-notes'),

  // getVersionDetails
  getVersionDetails: (versionId: string): Promise<VersionDetails | null> =>
    ipcRenderer.invoke('get-version-details', versionId),

  // Add launch and kill methods
  launchVersion: (
    versionId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> =>
    ipcRenderer.invoke('launch-version', versionId),
  killGame: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('kill-game'),

  // Version Management
  deleteVersion: (
    versionId: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('delete-version', versionId),

  openDirectory: (
    dirPath: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-directory', dirPath),

  // --- Add function to open external links ---
  openExternalLink: (url: string) =>
    ipcRenderer.invoke('open-external-link', url),

  // Listeners for feedback from main process
  onLaunchStatus: (
    callback: (event: IpcRendererEvent, args: LaunchStatusArgs) => void,
  ) => ipcRenderer.on('launch-status', callback),
  onDownloadProgress: (
    callback: (event: IpcRendererEvent, args: DownloadProgressArgs) => void,
  ) => ipcRenderer.on('download-progress', callback),
  onLaunchOutput: (
    callback: (event: IpcRendererEvent, args: LaunchOutputArgs) => void,
  ) => ipcRenderer.on('launch-output', callback),

  // Function to remove listeners (important for cleanup)
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
