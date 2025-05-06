import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import setMainMenu from './config/menu';
import { registerIpcHandlers } from './main/ipcHandlers';
import { ensureVersionsDirExists } from './main/versionsManager';
import fs from 'node:fs';
import {
  ensureManifestExists,
  updateLocalManifest,
} from './main/manifestManager';
import {
  ensurePatchNotesExist,
  updateLocalPatchNotes,
} from './main/patchNotesManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// --- Paths ---
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');
const versionsPath = path.join(userDataPath, 'versions');
const manifestPath = path.join(userDataPath, 'version_manifest_v2.json');
const patchNotesPath = path.join(userDataPath, 'javaPatchNotes.json');
// --- End Paths ---

// --- Register IPC Handlers ---
// Call this early, before the window is created and tries to use IPC
registerIpcHandlers({
  settingsPath,
  versionsPath,
  manifestPath,
  patchNotesPath,
});
// --- End Register IPC Handlers ---

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Set the application menu
  setMainMenu(/* mainWindow */);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Make ready handler async
  console.log('App ready. User data path:', userDataPath);

  // Ensure directories and initial manifest exist before creating the window
  try {
    ensureVersionsDirExists(versionsPath);
    const settingsDir = path.dirname(settingsPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
      console.log('Settings directory created at:', settingsDir);
    }
    // Ensure manifest exists (fetches if it doesn't) - await this before window creation
    await Promise.all([
      ensureManifestExists(manifestPath),
      ensurePatchNotesExist(patchNotesPath),
    ]);
  } catch (err) {
    console.error('Error ensuring directories/manifest exist on ready:', err);
    // Consider how to handle critical startup errors
  }

  createWindow();

  // Trigger background updates for manifest and patch notes
  console.log('Triggering background data update checks...');
  updateLocalManifest(manifestPath).catch((err) => {
    console.error('Background manifest update failed:', err);
  });
  updateLocalPatchNotes(patchNotesPath).catch((err) => {
    console.error('Background patch notes update failed:', err);
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
