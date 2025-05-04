import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { spawn, ChildProcess } from 'node:child_process'
import { BrowserWindow, app } from 'electron'
import { SettingsState } from '../config/settingsConfig'
import {
  VersionDetails,
  RuleBasedArgument,
  JvmRule,
  GameRule,
  OsName,
} from '../types/VersionDetails'
import { DownloadTask, downloadMultipleFiles } from './downloadManager'
import { AssetIndexDetails } from '../types/AssetsIndexDetails'
import { getErrorMessage } from '../utils/errorUtils'
import { LaunchStatus } from '../types/LaunchStatus'
import extract from 'extract-zip'

// Define paths structure (could be passed in or derived)
interface GamePaths {
  userDataPath: string
  versionsPath: string // Base directory for all versions
  versionPath: string // Specific version directory (e.g., .../versions/1.20.1)
  librariesPath: string // Base directory for libraries (e.g., .../libraries)
  assetsPath: string // Base directory for assets (e.g., .../assets)
  nativesPath: string // Directory for extracted natives for this version
}

// Placeholder for authentication details
interface AuthInfo {
  username: string
  uuid: string
  accessToken: string
  userType: string // e.g., 'msa'
  xuid?: string // Optional, for Xbox Live auth
}

let runningProcess: ChildProcess | null = null // Keep track of the running game process

/**
 * Determines if a rule allows an action based on OS and features.
 */
function checkRule(rule: JvmRule | GameRule): boolean {
  let osMatch = true
  if ('os' in rule && rule.os) {
    const currentOs = os.platform() // 'win32', 'darwin', 'linux'
    const currentArch = os.arch() // 'x64', 'arm64', etc.

    if (rule.os.name) {
      if (rule.os.name === OsName.Windows && currentOs !== 'win32')
        osMatch = false
      if (rule.os.name === OsName.Osx && currentOs !== 'darwin') osMatch = false
      if (rule.os.name === OsName.Linux && currentOs !== 'linux')
        osMatch = false
    }
    if (rule.os.arch && rule.os.arch !== currentArch) {
      osMatch = false
    }
    // TODO: Add OS version check if needed (rule.os.version)
  }

  let featuresMatch = true
  if ('features' in rule && rule.features) {
    // For now, assume no special features are enabled
    if (rule.features.is_demo_user) featuresMatch = false // Assume not demo
    if (rule.features.has_custom_resolution) featuresMatch = false // Assume default resolution
    // Add checks for other features if they become relevant
  }

  const ruleAllows = rule.action === 'allow'
  return ruleAllows ? osMatch && featuresMatch : !(osMatch && featuresMatch) // Allow if rule matches, Disallow if rule matches
}

/**
 * Processes rule-based arguments for JVM or Game.
 */
function processArguments(
  args: Array<RuleBasedArgument<JvmRule | GameRule> | string>,
  variables: Record<string, string>
): Array<string> {
  const processed: Array<string> = []

  args.forEach((arg) => {
    if (typeof arg === 'string') {
      // Replace placeholders in simple string arguments
      processed.push(replacePlaceholders(arg, variables))
    } else {
      // Check rules for complex arguments
      const allow = arg.rules ? arg.rules.every(checkRule) : true // Allow if no rules specified
      if (allow) {
        const values = Array.isArray(arg.value) ? arg.value : [arg.value]
        values.forEach((val) => {
          processed.push(replacePlaceholders(val, variables))
        })
      }
    }
  })

  return processed
}

/**
 * Replaces known placeholders in an argument string.
 */
function replacePlaceholders(
  template: string,
  variables: Record<string, string>
): string {
  // Basic replacement, extend as needed
  let result = template
  for (const key in variables) {
    // Use regex for global replacement
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), variables[key])
  }
  return result
}

/**
 * Reads and parses the asset index file.
 */
async function readAssetIndex(
  indexPath: string
): Promise<AssetIndexDetails | null> {
  try {
    if (!fs.existsSync(indexPath)) {
      console.error(`LaunchManager: Asset index not found at ${indexPath}`)
      return null
    }
    const rawData = await fs.promises.readFile(indexPath, 'utf-8')
    return JSON.parse(rawData) as AssetIndexDetails
  } catch (err) {
    console.error(
      `LaunchManager: Error reading or parsing asset index ${indexPath}:`,
      err
    )
    return null
  }
}

/**
 * Extracts native libraries from their JARs into the target directory.
 */
async function extractNatives(
  versionDetails: VersionDetails,
  paths: GamePaths,
  mainWindow: BrowserWindow | null
): Promise<boolean> {
  mainWindow?.webContents.send('launch-status', {
    status: LaunchStatus.PREPARING,
    message: 'Extracting native libraries...',
  })
  console.log('LaunchManager: Extracting natives...')

  const nativesDir = paths.nativesPath
  try {
    // Ensure natives directory exists and is empty
    await fs.promises.rm(nativesDir, { recursive: true, force: true })
    await fs.promises.mkdir(nativesDir, { recursive: true })

    const currentOs = os.platform() // 'win32', 'darwin', 'linux'
    const currentArch = os.arch() // 'x64', 'arm64', etc.

    let nativeOsName: 'windows' | 'osx' | 'linux' | null = null
    if (currentOs === 'win32') nativeOsName = 'windows'
    else if (currentOs === 'darwin') nativeOsName = 'osx'
    else if (currentOs === 'linux') nativeOsName = 'linux'

    if (!nativeOsName) {
      console.warn('LaunchManager: Unsupported OS for natives:', currentOs)
      return true // Proceed without natives if OS unknown? Or error?
    }

    let extractionCount = 0
    for (const lib of versionDetails.libraries) {
      // Check rules for the library itself
      const allowLib = lib.rules ? lib.rules.every(checkRule) : true
      if (!allowLib) continue

      // Check if this library has natives for the current OS
      const nativeClassifier = lib.natives?.[nativeOsName]?.replace(
        '${arch}',
        currentArch === 'arm64' ? 'arm64' : '64' // Handle arch placeholder (adjust if needed)
      )

      if (nativeClassifier && lib.downloads.classifiers?.[nativeClassifier]) {
        const nativeArtifact = lib.downloads.classifiers[nativeClassifier]
        const jarPath = path.join(paths.librariesPath, nativeArtifact.path)

        if (fs.existsSync(jarPath)) {
          console.log(
            `LaunchManager: Extracting from ${jarPath} to ${nativesDir}`
          )
          try {
            await extract(jarPath, {
              dir: nativesDir,
              // Handle extract rules (exclusions)
              onEntry: (entry) => {
                const excludePatterns = lib.extract?.exclude ?? []
                const shouldExclude = excludePatterns.some((pattern) =>
                  entry.fileName.startsWith(pattern)
                )
                if (shouldExclude) {
                  // console.log(`LaunchManager: Excluding ${entry.fileName}`);
                  return false // Skip extraction of this entry
                }
                return true // Extract this entry
              },
            })
            extractionCount++
          } catch (extractErr) {
            console.error(
              `LaunchManager: Failed to extract ${jarPath}:`,
              extractErr
            )
            mainWindow?.webContents.send('launch-status', {
              status: LaunchStatus.ERROR,
              message: `Failed to extract natives from ${path.basename(
                jarPath
              )}.`,
            })
            return false // Extraction failed
          }
        } else {
          console.warn(
            `LaunchManager: Native JAR not found, expected at ${jarPath}`
          )
          // This might indicate a download failure earlier
          mainWindow?.webContents.send('launch-status', {
            status: LaunchStatus.ERROR,
            message: `Required native library JAR not found: ${path.basename(
              jarPath
            )}. Try relaunching.`,
          })
          return false
        }
      }
    }
    console.log(
      `LaunchManager: Extracted natives from ${extractionCount} JARs.`
    )
    return true // Extraction successful or no natives needed
  } catch (err) {
    const errorMessage = getErrorMessage(
      err,
      'Error preparing natives directory'
    )
    console.error(`LaunchManager: ${errorMessage}`, err)
    mainWindow?.webContents.send('launch-status', {
      status: LaunchStatus.ERROR,
      message: errorMessage,
    })
    return false
  }
}

/**
 * Identifies required library, client JAR, and asset index downloads.
 * Does NOT include individual assets yet.
 */
function getRequiredInitialDownloads(
  versionDetails: VersionDetails,
  paths: GamePaths
): Array<DownloadTask> {
  const tasks: Array<DownloadTask> = []
  console.log('LaunchManager: Identifying initial downloads...')

  // 1. Client JAR
  if (versionDetails.downloads.client) {
    tasks.push({
      url: versionDetails.downloads.client.url,
      destination: path.join(paths.versionPath, `${versionDetails.id}.jar`),
      sha1: versionDetails.downloads.client.sha1,
      size: versionDetails.downloads.client.size,
      label: `${versionDetails.id}.jar`,
    })
  }

  // 2. Libraries
  versionDetails.libraries.forEach((lib) => {
    const allow = lib.rules ? lib.rules.every(checkRule) : true
    if (!allow) return

    if (lib.downloads.artifact?.path) {
      tasks.push({
        url: lib.downloads.artifact.url,
        destination: path.join(
          paths.librariesPath,
          lib.downloads.artifact.path
        ),
        sha1: lib.downloads.artifact.sha1,
        size: lib.downloads.artifact.size,
        label: path.basename(lib.downloads.artifact.path), // Add label
      })
    }
    // TODO: Natives handling
  })

  // 3. Asset Index
  if (versionDetails.assetIndex) {
    tasks.push({
      url: versionDetails.assetIndex.url,
      destination: path.join(
        paths.assetsPath,
        'indexes',
        `${versionDetails.assetIndex.id}.json`
      ),
      sha1: versionDetails.assetIndex.sha1,
      size: versionDetails.assetIndex.size,
      label: `Asset Index (${versionDetails.assetIndex.id})`, // Add label
    })
  }

  console.log(`LaunchManager: Found ${tasks.length} initial download tasks.`)
  return tasks
}

/**
 * Generates download tasks for individual assets based on the index.
 */
function getAssetDownloadTasks(
  assetIndex: AssetIndexDetails,
  paths: GamePaths
): Array<DownloadTask> {
  const tasks: Array<DownloadTask> = []
  const assetBaseUrl = 'https://resources.download.minecraft.net/'

  console.log(`LaunchManager: Generating asset download tasks from index...`)

  for (const key in assetIndex.objects) {
    const asset = assetIndex.objects[key]
    const hash = asset.hash
    const firstTwo = hash.substring(0, 2)
    const assetPath = path.join(paths.assetsPath, 'objects', firstTwo, hash)
    const assetUrl = `${assetBaseUrl}${firstTwo}/${hash}`

    tasks.push({
      url: assetUrl,
      destination: assetPath,
      sha1: hash,
      size: asset.size,
      label: key,
    })
  }
  console.log(`LaunchManager: Generated ${tasks.length} asset download tasks.`)
  return tasks
}

// /**
//  * Identifies required library and client JAR downloads.
//  */
// function getRequiredDownloads(
//   versionDetails: VersionDetails,
//   paths: GamePaths
// ): Array<DownloadTask> {
//   const tasks: Array<DownloadTask> = []

//   // 1. Client JAR
//   if (versionDetails.downloads.client) {
//     tasks.push({
//       url: versionDetails.downloads.client.url,
//       destination: path.join(paths.versionPath, `${versionDetails.id}.jar`),
//       sha1: versionDetails.downloads.client.sha1,
//       size: versionDetails.downloads.client.size,
//     })
//   }

//   // 2. Libraries
//   versionDetails.libraries.forEach((lib) => {
//     // Check rules first
//     const allow = lib.rules ? lib.rules.every(checkRule) : true
//     if (!allow) return

//     // Standard artifact
//     if (lib.downloads.artifact) {
//       tasks.push({
//         url: lib.downloads.artifact.url,
//         // Construct path like .../libraries/com/mojang/patchy/1.1/patchy-1.1.jar
//         destination: path.join(
//           paths.librariesPath,
//           lib.downloads.artifact.path
//         ),
//         sha1: lib.downloads.artifact.sha1,
//         size: lib.downloads.artifact.size,
//       })
//     }

//     // Natives (if applicable for current OS)
//     // TODO: Implement native handling (finding classifier, adding download task)
//     // Need to determine the correct native classifier based on OS (e.g., 'natives-windows')
//     // The destination for natives might be different initially before extraction
//   })

//   // 3. Asset Index
//   // TODO: Add download task for asset index (versionDetails.assetIndex.url)
//   // Destination: path.join(paths.assetsPath, 'indexes', `${versionDetails.assetIndex.id}.json`)

//   // 4. Assets (requires parsing asset index first)
//   // TODO: Implement asset index parsing and add download tasks for individual assets

//   return tasks
// }

/**
 * Constructs the classpath string.
 */
function buildClasspath(
  versionDetails: VersionDetails,
  paths: GamePaths
): string {
  const separator = os.platform() === 'win32' ? ';' : ':'
  const classPathEntries: Array<string> = []

  // Add libraries
  versionDetails.libraries.forEach((lib) => {
    const allow = lib.rules ? lib.rules.every(checkRule) : true
    if (allow && lib.downloads.artifact?.path) {
      classPathEntries.push(
        path.join(paths.librariesPath, lib.downloads.artifact.path)
      )
    }
    // Natives are usually handled via java.library.path, not classpath
  })

  // Add client JAR
  classPathEntries.push(
    path.join(paths.versionPath, `${versionDetails.id}.jar`)
  )

  return classPathEntries.join(separator)
}

/**
 * Prepares and launches the Game version.
 */
export async function launchVersion(
  versionDetails: VersionDetails,
  settings: SettingsState,
  paths: GamePaths,
  mainWindow: BrowserWindow | null
): Promise<{ success: boolean; error?: string }> {
  if (runningProcess) {
    console.warn('LaunchManager: Game is already running.')
    mainWindow?.webContents.send('launch-status', {
      status: 'error',
      message: 'Game already running',
    })
    return
  }

  try {
    mainWindow?.webContents.send('launch-status', {
      status: 'preparing',
      message: 'Identifying files...',
    })

    // --- 1. Download Initial Files (JARs, Libraries, Asset Index) ---
    const initialDownloads = getRequiredInitialDownloads(versionDetails, paths)
    if (initialDownloads.length > 0) {
      mainWindow?.webContents.send('launch-status', {
        status: 'downloading',
        message: `Downloading core files (${initialDownloads.length})...`,
        totalFiles: initialDownloads.length,
      })
      const initialResults = await downloadMultipleFiles(
        initialDownloads,
        settings.parallelDownloads || 5,
        mainWindow
      )
      if (
        initialResults.failureCount > 0 ||
        initialResults.validationFailures > 0
      ) {
        const errorMsg = `Failed to download or validate ${
          initialResults.failureCount + initialResults.validationFailures
        } core files. Check logs.`
        console.error(`LaunchManager: ${errorMsg}`)
        mainWindow?.webContents.send('launch-status', {
          status: 'error',
          message: errorMsg,
        })
        return { success: false, error: errorMsg }
      }
    } else {
      console.log(
        'LaunchManager: No initial downloads required (already cached/validated).'
      )
    }

    // --- 2. Download Assets ---
    mainWindow?.webContents.send('launch-status', {
      status: 'preparing',
      message: 'Reading asset index...',
    })
    const assetIndexPath = path.join(
      paths.assetsPath,
      'indexes',
      `${versionDetails.assetIndex.id}.json`
    )
    const assetIndex = await readAssetIndex(assetIndexPath)

    if (!assetIndex) {
      const errorMsg = `Failed to read or parse asset index: ${assetIndexPath}`
      console.error(`LaunchManager: ${errorMsg}`)
      mainWindow?.webContents.send('launch-status', {
        status: 'error',
        message: errorMsg,
      })
      return {
        success: false,
        error: `Failed to read asset index: ${assetIndexPath}`,
      }
    }

    const assetDownloads = getAssetDownloadTasks(assetIndex, paths)
    if (assetDownloads.length > 0) {
      mainWindow?.webContents.send('launch-status', {
        status: 'downloading',
        message: `Downloading assets (${assetDownloads.length})...`,
        totalFiles: assetDownloads.length,
      })
      const assetResults = await downloadMultipleFiles(
        assetDownloads,
        settings.parallelDownloads || 10, // Maybe allow more parallelism for small assets
        mainWindow
      )
      if (
        assetResults.failureCount > 0 ||
        assetResults.validationFailures > 0
      ) {
        const errorMsg = `Failed to download or validate ${
          assetResults.failureCount + assetResults.validationFailures
        } assets. Check logs.`
        console.error(`LaunchManager: ${errorMsg}`)
        mainWindow?.webContents.send('launch-status', {
          status: 'error',
          message: errorMsg,
        })
        return {
          success: false,
          error: `Failed to download or validate ${
            assetResults.failureCount + assetResults.validationFailures
          } assets.`,
        }
      }
    } else {
      console.log(
        'LaunchManager: No asset downloads required (index empty or files cached/validated).'
      )
    }

    mainWindow?.webContents.send('launch-status', {
      status: 'preparing',
      message: 'Downloads complete. Preparing launch arguments...',
    })

    // --- 3. Extract Natives ---
    const nativesExtracted = await extractNatives(
      versionDetails,
      paths,
      mainWindow
    )
    if (!nativesExtracted) {
      // Error message already sent by extractNatives
      return { success: false, error: 'Failed to extract native libraries.' } // Return error
    }

    mainWindow?.webContents.send('launch-status', {
      status: LaunchStatus.PREPARING,
      message: 'Preparing launch arguments...',
    })

    // --- 4. Prepare Launch Variables ---
    const classpath = buildClasspath(versionDetails, paths)
    const authInfo: AuthInfo = {
      // Use placeholders or integrate real auth later
      username: settings.username || 'Player',
      uuid: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      accessToken: '0', // Placeholder token
      userType: 'msa', // Placeholder type
    }

    // Determine Game Directory: Use setting if provided, otherwise default (e.g., userData)
    const gameDirectory = String(settings.gameDirectory) || paths.userDataPath
    // Ensure game directory exists (important for options.txt, saves, etc.)
    try {
      await fs.promises.mkdir(gameDirectory, { recursive: true })
    } catch (err) {
      console.warn(
        `LaunchManager: Could not create game directory ${gameDirectory}:`,
        err
      )
      // Proceed, but game might fail if it can't write here
    }

    const variables: Record<string, string> = {
      natives_directory: paths.nativesPath,
      launcher_name: 'LLauncher',
      launcher_version: app.getVersion(),
      classpath: classpath, // Ensure classpath is calculated correctly
      game_directory: gameDirectory,
      assets_root: paths.assetsPath,
      assets_index_name: versionDetails.assetIndex.id,
      auth_player_name: authInfo.username,
      auth_uuid: authInfo.uuid,
      auth_access_token: authInfo.accessToken,
      user_type: authInfo.userType,
      auth_xuid: authInfo.xuid || '',
      version_name: versionDetails.id,
      version_type: versionDetails.type,
      clientid: '',
      resolution_width: String(settings.resolutionWidth || 854),
      resolution_height: String(settings.resolutionHeight || 480),
      quickPlayPath: '',
      quickPlaySingleplayer: '',
      quickPlayMultiplayer: '',
      quickPlayRealms: '',
    }

    // --- 5. Process Arguments ---
    const baseJvmArgs = processArguments(
      versionDetails.arguments.jvm,
      variables
    )
    const gameArgs = processArguments(versionDetails.arguments.game, variables)

    // --- Add JVM Memory Arguments ---
    const minMemory = settings.memoryMinimum || 512
    const maxMemory = settings.memoryMaximum || 4096
    const memoryArgs = [
      `-Xms${minMemory}M`, // Minimum memory
      `-Xmx${maxMemory}M`, // Maximum memory
    ]

    // --- Add Custom JVM Arguments ---
    // Use const and assign directly. Handle empty/null string with '|| ""'.
    const customJvmArgs: Array<string> = (settings.jvmArguments || '')
      .split(' ')
      .map((arg) => arg.trim())
      .filter((arg) => arg !== '')

    // Log only if arguments were actually added
    if (customJvmArgs.length > 0) {
      console.log('LaunchManager: Adding custom JVM arguments:', customJvmArgs)
    }

    // Combine JVM arguments (Memory args often need to be early)
    const jvmArgs = [
      ...memoryArgs,
      ...baseJvmArgs,
      ...customJvmArgs, // Add custom args
    ]

    // --- 6. Construct Command ---
    const javaPath = settings.javaPath || 'java'
    const finalArgs = [...jvmArgs, versionDetails.mainClass, ...gameArgs]

    // --- 7. Spawn Process ---
    console.log('LaunchManager: Launching Java:', javaPath)
    console.log('LaunchManager: Arguments:', finalArgs.join(' '))
    mainWindow?.webContents.send('launch-status', {
      status: 'launching',
      message: 'Starting Java process...',
    })

    const cwd = settings.gameDirectory ? gameDirectory : paths.userDataPath
    console.log('LaunchManager: Using CWD:', cwd)

    runningProcess = spawn(javaPath, finalArgs, { cwd, detached: false })

    // --- Handle Process Output/Events ---
    runningProcess.stdout?.on('data', (data) => {
      const message = data.toString()
      console.log(`[Game STDOUT]: ${message}`)

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-output', {
          type: 'stdout',
          message,
        })
      }
    })

    runningProcess.stderr?.on('data', (data) => {
      const message = data.toString()
      console.error(`[Game STDERR]: ${message}`)

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-output', {
          type: 'stderr',
          message,
        })
      }
    })

    runningProcess.on('close', (code) => {
      console.log(`LaunchManager: Game process exited with code ${code}`)
      // Check if window exists and is not destroyed before sending
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-status', {
          status: 'closed',
          code,
        })
      }
      runningProcess = null // Reset process tracker
    })

    runningProcess.on('error', (err) => {
      console.error('LaunchManager: Failed to start Game process:', err)
      mainWindow?.webContents.send('launch-status', {
        status: 'error',
        message: `Failed to start Java: ${err.message}`,
      })
      runningProcess = null
    })

    // --- Close Launcher if keepLauncherOpen is false ---
    if (!settings.keepLauncherOpen && mainWindow && !mainWindow.isDestroyed()) {
      console.log(
        'LaunchManager: Closing launcher window as keepLauncherOpen is false.'
      )

      // Use a small delay to ensure the game window has a chance to appear
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close()
        }
      }, 500)
    }

    // --- Return success ---
    return { success: true }
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(
      err,
      'An unexpected error occurred during launch preparation'
    )
    console.error(`LaunchManager: ${errorMessage}`, err)
    mainWindow?.webContents.send('launch-status', {
      status: 'error',
      message: errorMessage,
    })
    runningProcess = null // Reset process tracker
    return { success: false, error: errorMessage }
  }
}

/**
 * Attempts to kill the running Game process.
 */
export function killRunningProcess() {
  if (runningProcess) {
    console.log('LaunchManager: Attempting to kill running Game process...')
    const killed = runningProcess.kill() // Sends SIGTERM by default
    if (!killed) {
      console.warn(
        'LaunchManager: Failed to send kill signal (process might already be dead).'
      )
      // Consider forceful kill (SIGKILL) after a timeout if needed
    }
    runningProcess = null // Assume killed for now
  } else {
    console.log('LaunchManager: No Game process seems to be running.')
  }
}
