import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'assets/icon',
    name: 'LLauncher (Beta)',
    appBundleId: 'com.doctonight.llauncher',
    win32metadata: {
      CompanyName: 'Doctonight',
      ProductName: 'LLauncher (Beta)',
      FileDescription: 'LLauncher Game Runner (Beta)',
      OriginalFilename: 'LLauncher.exe',
    },
    appCategoryType: 'public.app-category.games',
  },
  rebuildConfig: {},
  makers: [
    // Windows: Squirrel creates an installer (.exe)
    new MakerSquirrel({
      // Icon for the Setup.exe installer itself
      setupIcon: 'assets/icon.ico',
      // Optional: Add certificate details if needed, though env vars are preferred
      // certificateFile: './certs/cert.pfx',
      // certificatePassword: process.env.CERT_PASSWORD,
    }),
    // macOS: DMG is the standard distributable format
    new MakerDMG({
      // Icon shown in the DMG window
      icon: 'assets/icon.icns',
      // Optional: DMG specific options like background image, icon size, etc.
      // format: 'ULFO' // Example format setting
    }),
    // Linux: Standard package formats
    new MakerRpm({
      options: {
        // Icon for the RPM package
        icon: 'assets/icon.png',
      },
    }),
    new MakerDeb({
      options: {
        // Icon for the DEB package
        icon: 'assets/icon.png',
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
