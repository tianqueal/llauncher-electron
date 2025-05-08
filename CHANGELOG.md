# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.0.0-beta.1] - 2025-05-08

### Added

- Initial project commit and core React dependencies. (aac8733)
- Adaptation of 'Hello World' to React. (5c23651)
- Main application menu with theme options. (94d66c9)
- Types for `electron-squirrel-startup`. (8720871)
- Tailwind CSS support and updated renderer configuration. (df663e6)
- `react-router` dependency for routing functionality. (30067a3)
- `@headlessui/react` dependency for UI components. (872fee7)
- `@heroicons/react` dependency for icon components. (34cf19e)
- GitHub URL to author information in `package.json`. (ea8c4f2)
- Game version installation and management core functionality. (908f391)
- Settings validation and error handling in `SettingsField` and `useSettings`. (4174d6e)
- GitHub Actions workflow for building the Electron application. (50e05c6)
- New icon assets in various formats (icns, ico, png). (0d92101)
- Enhanced forge configuration with DMG support and updated maker options. (0f9a819)
- Prettier for code formatting and linting scripts. (8e81fd8)
- CI workflow for linting and formatting checks. (30146fe)
- Edit menu role to the main application menu. (e13ea23)
- `react-toastify` dependency for notifications. (436c32b)
- `ToastContainer` for notifications in the `Layout` component. (4e612a4)
- Integration of toast notifications for general status errors. (3d0b5ad)
- 'Show All Versions' setting to configuration. (85b689e)
- Custom ESLint rules for unused variables. (58f2348)
- ESLint plugins for improved linting and TypeScript support. (30d7e96)
- `dotenv` configuration for environment variable management. (b41f00b)
- `ImportMetaEnv` interface for `VITE_PATCH_NOTES_BASE_URL` configuration. (6993d1b)
- Example environment configuration file for project setup. (d995049)
- `SelectControl` and `SelectControlOption` components for improved version selection. (b099a66)
- `UserType` enum for user state management. (7cedac2)
- Environments configuration for Vite and Node.js. (0d05e66)
- Authentication fields and user type configuration in settings. (e5512e3)
- `VITE_PATCH_NOTES_BASE_URL` to `.env.example` for enhanced configuration. (8926493)
- Enhanced build workflow to include release creation and artifact management. (5814995)
- Initial `README.md` with project overview, features, tech stack, and setup instructions. (0fd4207)
- MIT License file to the project. (9cd2eab)
- GitHub Actions workflow to check for required secrets. (2c01961)
- Environment variable definitions for asset and patch notes URLs. (613302c)

### Changed

- Updated title in `index.html` to 'LLauncher'. (142a97b)
- Switched from `createBrowserRouter` to `createHashRouter` for routing. (0839284)
- Updated `productName` in `package.json`. (3139c82)
- Updated devDependencies for Electron packaging and versioning. (258fb2d)
- Applied Prettier formatting across the codebase. (3cf099e)
- Renamed `Card` to `Container` component for layout management. (896baca)
- Updated ESLint configuration to enhance TypeScript support and import rules. (f4f31f7)
- Updated `patchNotesBaseUrl` to use environment variable. (e58c706)
- Updated Vite configuration to conditionally drop console and debugger statements in production mode. (0f560fa)
- Moved `FormButton` component. (25c2859)
- Replaced `Card` component with `Container` in `VersionImage` for improved layout. (3210c21)
- Moved `trimStringSettings` and `validateSettings` functions to separate utility files. (969c80f)
- Replaced hardcoded URLs with environment variables for better configuration management. (2ebb301)
- Moved `ensureVersionsDirExists` function to `fsUtils` for better organization. (e607859)
- Replaced `Card` component with `Container` for consistent layout across views. (4c90ee4)
- Updated `FormButton` import path for better module organization. (3b287a8)
- Standardized import statement quotes in `remoteOptions.ts`. (a457acd)
- Updated product name and description in `package.json`; enhanced `AboutView` with dynamic content. (c4266df)
- Updated build workflow to include package version and modify executable name in `forge.config.ts`. (83fcf31)

### Fixed

- Commented out DevTools opening in `createWindow` function. (592508c)
- Simplified error messages in `launchVersion` function. (bf66099)
- Updated module setting in `tsconfig` to `ESNext` for better compatibility. (de7a6a8)
- Replaced dynamic product name with static value in `forge.config.ts`. (cd048a9)
- Streamlined dependency installation and enhanced package version retrieval for cross-platform compatibility. (c34dfbd)
- Corrected asset URL construction in `getAssetDownloadTasks` function. (d319565)
- Reordered `MANIFEST_URL` in `.env.example` for consistency. (82fe25d)
- Improved artifact upload process by handling subdirectory structures in GitHub Actions. (c710e7a)

### Removed

- `HelloWorld` component. (466e4bd)
- `Dialog` component and its associated styles. (c4f6f20)
- Unnecessary comment from electron constants in `global.d.ts`. (045f343)

### Chore

- Initial commit. (aac8733) - _Also listed under Added as it's foundational_
