import fs from 'node:fs';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import {
  loadLauncherProfiles,
  saveLauncherProfiles,
} from '../utils/launcherProfilesManager';
import {
  deleteVersion,
  getVersionDetails,
  listInstalledVersions,
} from './versionsManager';
import { readLocalManifest } from './manifestManager';
import { LauncherProfiles } from '../types/LauncherProfiles';
import { readLocalPatchNotes } from './patchNotesManager';
import path from 'node:path';
import { killRunningProcess, launchVersion } from './launchManager';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * Registers all IPC handlers for the main process.
 * @param launcherProfilesPath Absolute path to the launcher settings file.
 * @param versionsPath Absolute path to the versions directory.
 * @param manifestPath Absolute path to the local manifest file.
 * @param patchNotesPath Absolute path to the local patch notes file.
 */
export function registerIpcHandlers({
  launcherProfilesPath,
  versionsPath,
  manifestPath,
  patchNotesPath,
}: {
  launcherProfilesPath: string;
  versionsPath: string;
  manifestPath: string;
  patchNotesPath: string;
}): void {
  console.log('Registering IPC handlers...');

  // --- Data Retrieval Handlers ---
  // Settings
  ipcMain.handle('load-launcher-profiles', () => {
    console.log('IPC: Handling load-launcher-profiles');
    return loadLauncherProfiles(launcherProfilesPath);
  });
  ipcMain.handle(
    'save-launcher-profiles',
    (_event, launcherProfilesData: LauncherProfiles) => {
      console.log('IPC: Handling save-launcher-profiles');
      return saveLauncherProfiles(launcherProfilesPath, launcherProfilesData);
    },
  );

  // Installed Versions
  ipcMain.handle('list-versions', async () => {
    console.log('IPC: Handling list-versions');
    return await listInstalledVersions(versionsPath);
  });

  // Version Manifest
  ipcMain.handle('get-version-manifest', () => {
    console.log('IPC: Handling get-version-manifest');
    return readLocalManifest(manifestPath);
  });

  // Patch Notes
  ipcMain.handle('get-patch-notes', () => {
    console.log('IPC: Handling get-patch-notes');
    return readLocalPatchNotes(patchNotesPath);
  });

  // Version Details
  ipcMain.handle('get-version-details', async (_event, versionId: string) => {
    console.log(`IPC: Handling get-version-details for ${versionId}`);
    // Read the main manifest first to get the URL
    const mainManifest = readLocalManifest(manifestPath);
    if (!mainManifest) {
      console.error(
        'IPC: Could not read main manifest to get version details URL.',
      );
      return null; // Or throw an error
    }
    return await getVersionDetails(versionId, versionsPath, mainManifest);
  });

  // --- Action Handlers ---
  ipcMain.handle('launch-version', async (event, versionId: string) => {
    console.log(`IPC: Handling launch-version for ${versionId}`);
    const mainWindow = BrowserWindow.fromWebContents(event.sender); // Get window to send feedback

    try {
      // 1. Load Launcher Profiles
      const launcherProfiles = await loadLauncherProfiles(launcherProfilesPath);
      if (!launcherProfiles || !launcherProfiles.settings) {
        throw new Error('Failed to load launcher settings before launch.');
      }

      // 2. Get Version Details (re-fetch to ensure consistency)
      const mainManifest = readLocalManifest(manifestPath);
      if (!mainManifest) {
        throw new Error('Failed to load main manifest before launch.');
      }
      const versionDetails = await getVersionDetails(
        versionId,
        versionsPath,
        mainManifest,
      );
      if (!versionDetails) {
        throw new Error(`Failed to get version details for ${versionId}.`);
      }

      // 3. Define Paths
      const userDataPath = app.getPath('userData');
      const librariesPath = path.join(userDataPath, 'libraries');
      const assetsPath = path.join(userDataPath, 'assets');
      const versionPath = path.join(versionsPath, versionId);
      const nativesPath = path.join(versionPath, 'natives'); // Define natives path

      const gamePaths = {
        userDataPath,
        versionsPath,
        versionPath,
        librariesPath,
        assetsPath,
        nativesPath,
      };

      // 4. Trigger Launch (asynchronous, feedback via webContents.send)
      launchVersion(
        versionDetails,
        launcherProfiles.settings,
        gamePaths,
        mainWindow,
      );

      return { success: true, message: 'Launch process initiated.' }; // Initial confirmation
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(
        err,
        `Error during launch-version setup for ${versionId}`,
      );
      console.error(`IPC: ${errorMessage}:`, err);
      mainWindow?.webContents.send('launch-status', {
        status: 'error',
        message: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  });

  // Handler to kill the game process
  ipcMain.handle('kill-game', () => {
    console.log('IPC: Handling kill-game');
    try {
      killRunningProcess();
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error killing game process');
      console.error(`IPC: ${errorMessage}:`, err);
      return { success: false, error: errorMessage };
    }
  });

  // --- Version Management Handlers ---
  ipcMain.handle(
    'delete-version',
    async (
      _event,
      versionId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      console.log(`IPC: Handling delete-version for ${versionId}`);
      try {
        await deleteVersion(versionId, versionsPath);
        console.log(`IPC: Successfully deleted version ${versionId}`);
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(
          err,
          `Error deleting version ${versionId}`,
        );
        console.error(`IPC: ${errorMessage}:`, err);
        return { success: false, error: errorMessage };
      }
    },
  );

  ipcMain.handle(
    'open-directory',
    async (
      _event,
      dirPath: string,
    ): Promise<{ success: boolean; error?: string }> => {
      console.log(`IPC: Handling open-directory for ${dirPath}`);
      try {
        // Basic check if path exists before attempting to open
        if (!fs.existsSync(dirPath)) {
          throw new Error(`Directory not found: ${dirPath}`);
        }
        await shell.openPath(dirPath);
        console.log(`IPC: Successfully requested to open directory ${dirPath}`);
        return { success: true };
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(
          err,
          `Error opening directory ${dirPath}`,
        );
        console.error(`IPC: ${errorMessage}:`, err);
        return { success: false, error: errorMessage };
      }
    },
  );

  // --- Add handler for opening external links ---
  ipcMain.handle('open-external-link', async (_event, url) => {
    try {
      // Validate URL basic structure (optional but recommended)
      if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
        await shell.openExternal(url);
        return { success: true };
      } else {
        console.warn(`Attempted to open invalid external URL: ${url}`);
        return { success: false, error: 'Invalid URL format' };
      }
    } catch (error) {
      console.error(`IPC Error opening external link ${url}:`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  });

  console.log('IPC handlers registered.');
}
