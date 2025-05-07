<div align="center">
  <img src="assets/icon.png" width="200" alt="LLauncher Logo" />
  <h1>LLauncher</h1>
</div>

<p align="center">
  <strong>An open-source, cross-platform custom game runner.</strong>
</p>

<p align="center">
  <a href="https://github.com/tianqueal/llauncher-electron/releases">
    <img src="https://img.shields.io/github/v/release/tianqueal/llauncher-electron?include_prereleases&label=latest%20version&color=blueviolet" alt="Latest Release">
  </a>
  <a href="https://github.com/tianqueal/llauncher-electron/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/tianqueal/llauncher-electron?color=blue" alt="License">
  </a>
  <a href="https://github.com/tianqueal/llauncher-electron/actions/workflows/build.yml">
    <img src="https://github.com/tianqueal/llauncher-electron/actions/workflows/build.yml/badge.svg" alt="Build Status">
  </a>
</p>

---

**Important Disclaimer:** LLauncher is an unofficial, open-source project and is not affiliated with Mojang Studios or Microsoft Corporation. A legitimate copy of Minecraft Java Edition is required to use this launcher. LLauncher complies with Mojang’s End User Licence Agreement (EULA). No proprietary game files are included or distributed with this software. Playing the game without a valid account purchased from Mojang is not permitted.

---

LLauncher offers a simple and efficient way to manage and play your favourite game versions, built with modern technologies for a smooth user experience.

## ✨ Key Features

- **Cross-Platform:** Runs natively on Windows, macOS, and Linux.
- **Version Management:** Easily browse, select, and launch different game versions.
- **Modern UI:** A clean, intuitive, and responsive interface built with React and Tailwind CSS.
- **Customisable Settings:** Tailor your experience with various application settings.
- **Launch Monitoring:** Keep an eye on the game launch process with clear progress indicators.
- **Theme Support:** Adapts to your system's light or dark theme preferences.
- **Open Source:** Freedom to inspect, modify, and contribute to the project.

## 🛠️ Tech Stack

- **[Electron](https://www.electronjs.org/):** For building cross-platform desktop applications.
- **[React](https://reactjs.org/):** For building the user interface.
- **[TypeScript](https://www.typescriptlang.org/):** For robust, type-safe JavaScript development.
- **[Vite](https://vitejs.dev/):** For a fast and modern frontend build tooling experience.
- **[Tailwind CSS](https://tailwindcss.com/):** For a utility-first CSS framework.
- **[Electron Forge](https://www.electronforge.io/):** For packaging and distributing the Electron application.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended, v22 used in CI)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Development

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/tianqueal/llauncher-electron.git
    cd llauncher-electron
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Variables:**

    For local development, LLauncher may require certain environment variables to be set, primarily for defining external resource URLs. These are **not hardcoded into the application** for security and flexibility reasons.

    Instead, create a `.env` file in the root of the project by copying the example file:

    ```bash
    cp .env.example .env
    ```

    Then, edit the newly created `.env` file with your specific local or development URLs.

    **`.env.example`:**

    ```dotenv
    # URLs for game manifests and assets - replace with your actual URLs for local dev
    MANIFEST_URL="YOUR_MANIFEST_URL_HERE"
    ASSET_BASE_URL="YOUR_ASSET_BASE_URL_HERE"
    PATCH_NOTES_BASE_URL="YOUR_PATCH_NOTES_BASE_URL_HERE"
    PATCH_NOTES_URL="YOUR_PATCH_NOTES_URL_HERE"
    VITE_PATCH_NOTES_BASE_URL="YOUR_VITE_PATCH_NOTES_BASE_URL_HERE"

    # Note: For production builds via GitHub Actions, these values are supplied
    # via Repository Variables/Secrets in the GitHub repository settings.
    # Do NOT commit your actual .env file with real values.
    ```

    Ensure your `.env` file is listed in your `.gitignore` file to prevent accidental commits. The application is configured to load these variables from the `.env` file during local development.

4.  **Run in development mode:**
    This will start the application with Vite's development server, enabling hot reloading.
    ```bash
    npm run start
    ```

## 📦 Building for Production

To create distributable packages for your operating system:

```bash
npm run make
```

This command utilises Electron Forge to build the application based on the configuration in `forge.config.ts`. The output will be located in the `out` directory.

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature suggestions, or code contributions, please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

Please ensure your code adheres to the project's linting and formatting standards:

```bash
npm run lint
npm run format # To automatically format
npm run format:check # To check formatting
```

## 📜 Licence

This project is licensed under the MIT Licence - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Happy gaming!
</p>
