import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { spawn, ChildProcess } from 'node:child_process';
import { BrowserWindow, app } from 'electron';
import { SettingsState } from '../types/SettingsState';
import {
  VersionDetails,
  RuleBasedArgument,
  JvmRule,
  GameRule,
  OsName,
} from '../types/VersionDetails';
import { DownloadTask, downloadMultipleFiles } from './downloadManager';
import { AssetIndexDetails } from '../types/AssetsIndexDetails';
import { getErrorMessage } from '../utils/errorUtils';
import { LaunchStatus } from '../types/LaunchStatus';
import extract from 'extract-zip';
import { UserType } from '../types/UserType';
import environments from '../utils/environments.node';
import { RuleContext } from '../types/RuleContext';
import { defaultSettingsState } from '../config/launcherProfilesConfig';

// Define paths structure (could be passed in or derived)
interface GamePaths {
  userDataPath: string;
  versionsPath: string; // Base directory for all versions
  versionPath: string; // Specific version directory (e.g., .../versions/1.20.1)
  librariesPath: string; // Base directory for libraries (e.g., .../libraries)
  assetsPath: string; // Base directory for assets (e.g., .../assets)
  nativesPath: string; // Directory for extracted natives for this version
}

// Placeholder for authentication details
interface AuthInfo {
  username: string;
  uuid: string;
  accessToken: string;
  userType: UserType;
  xuid?: string;
}

let runningProcess: ChildProcess | null = null; // Keep track of the running game process

/**
 * Determines if a rule allows an action based on OS and features.
 * @param rule The rule to check.
 * @param context Optional context to override OS and feature detection.
 */
function checkRule(rule: JvmRule | GameRule, context?: RuleContext): boolean {
  let osMatch = true;
  if ('os' in rule && rule.os) {
    const ruleOsName = rule.os.name;
    const ruleOsArch = rule.os.arch;
    // const ruleOsVersion = rule.os.version; // For future use

    let currentOsName: string;
    let currentArch: string;

    if (context) {
      // Use context if provided
      currentOsName = context.os.name;
      currentArch = context.os.arch;
      // currentVersion = context.os.version;
    } else {
      // Fallback to system detection
      const platform = os.platform();
      if (platform === 'win32') currentOsName = OsName.Windows;
      else if (platform === 'darwin') currentOsName = OsName.Osx;
      else if (platform === 'linux') currentOsName = OsName.Linux;
      else currentOsName = platform; // Should not happen for typical MC rules
      currentArch = os.arch();
      // currentVersion = os.release();
    }

    if (ruleOsName) {
      // Normalize comparison: rule.os.name can be 'osx', context.os.name can be 'osx' (from nativeOsName)
      // or os.platform() can be 'darwin' which we map to OsName.Osx
      const effectiveRuleOsName = ruleOsName;
      const effectiveCurrentOsName = currentOsName;

      // If context is not used, currentOsName is already an OsName type or 'win32'/'darwin'/'linux'
      // If context is used, context.os.name is 'windows', 'osx', or 'linux'
      // Rule OS names are 'windows', 'osx', 'linux' from OsName enum

      if (
        effectiveRuleOsName === OsName.Windows &&
        effectiveCurrentOsName !== OsName.Windows &&
        effectiveCurrentOsName !== 'win32'
      ) {
        osMatch = false;
      }
      if (
        effectiveRuleOsName === OsName.Osx &&
        effectiveCurrentOsName !== OsName.Osx &&
        effectiveCurrentOsName !== 'darwin'
      ) {
        osMatch = false;
      }
      if (
        effectiveRuleOsName === OsName.Linux &&
        effectiveCurrentOsName !== OsName.Linux &&
        effectiveCurrentOsName !== 'linux'
      ) {
        osMatch = false;
      }
    }

    if (ruleOsArch && ruleOsArch !== currentArch) {
      // Arch comparison is direct: 'x64' vs 'x64', 'arm64' vs 'arm64'
      // LWJGL might use 'x86_64' for 'x64' on Linux/macOS, or 'x86' for 'ia32' on Windows.
      // The 'currentArch' from os.arch() is 'x64', 'arm64', 'ia32'.
      // The rule.os.arch from JSON is usually 'x86' (for 32-bit) or implies 64-bit if not specified or matches 'x64'.
      // For simplicity, we'll do a direct comparison for now.
      // More complex mapping might be needed if rules use 'x86_64' and os.arch() is 'x64'.
      // However, the context provided by extractNatives already uses os.arch() directly.
      osMatch = false;
    }
    // TODO: Add OS version check if needed (rule.os.version vs currentVersion)
  }

  let featuresMatch = true;
  if ('features' in rule && rule.features) {
    const ruleFeatures = rule.features;
    if (context) {
      // Use features from context
      for (const featureKey in ruleFeatures) {
        if (
          ruleFeatures[featureKey as keyof typeof ruleFeatures] && // if rule requires this feature (e.g. "is_demo_user": true in rule)
          !context.features[featureKey] // and context says feature is not active
        ) {
          featuresMatch = false;
          break;
        }
      }
    } else {
      // Fallback to default assumptions (as originally in the function)
      // This part is for when processArguments calls checkRule without context
      if (ruleFeatures.is_demo_user) featuresMatch = false; // Assume not demo if context not provided
      if (ruleFeatures.has_custom_resolution) featuresMatch = false; // Assume default resolution if context not provided
      // Add checks for other features if they become relevant
    }
  }

  const ruleAllows = rule.action === 'allow';
  return ruleAllows ? osMatch && featuresMatch : !(osMatch && featuresMatch);
}

/**
 * Processes rule-based arguments for JVM or Game.
 */
function processArguments(
  args: Array<RuleBasedArgument<JvmRule | GameRule> | string>,
  variables: Record<string, string>,
): Array<string> {
  const processed: Array<string> = [];

  args.forEach((arg) => {
    if (typeof arg === 'string') {
      // Replace placeholders in simple string arguments
      processed.push(replacePlaceholders(arg, variables));
    } else {
      // Check rules for complex arguments
      const allow = arg.rules
        ? arg.rules.every((rule) => checkRule(rule))
        : true; // Allow if no rules specified
      if (allow) {
        const values = Array.isArray(arg.value) ? arg.value : [arg.value];
        values.forEach((val) => {
          processed.push(replacePlaceholders(val, variables));
        });
      }
    }
  });

  return processed;
}

/**
 * Replaces known placeholders in an argument string.
 */
function replacePlaceholders(
  template: string,
  variables: Record<string, string>,
): string {
  // Basic replacement, extend as needed
  let result = template;
  for (const key in variables) {
    // Use regex for global replacement
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), variables[key]);
  }
  return result;
}

/**
 * Reads and parses the asset index file.
 */
async function readAssetIndex(
  indexPath: string,
): Promise<AssetIndexDetails | null> {
  try {
    if (!fs.existsSync(indexPath)) {
      console.error(`LaunchManager: Asset index not found at ${indexPath}`);
      return null;
    }
    const rawData = await fs.promises.readFile(indexPath, 'utf-8');
    return JSON.parse(rawData) as AssetIndexDetails;
  } catch (err) {
    console.error(
      `LaunchManager: Error reading or parsing asset index ${indexPath}:`,
      err,
    );
    return null;
  }
}

/**
 * Extracts native libraries from their JARs into the target directory.
 */
async function extractNatives(
  versionDetails: VersionDetails,
  paths: GamePaths,
  mainWindow: BrowserWindow | null,
): Promise<boolean> {
  mainWindow?.webContents.send('launch-status', {
    status: LaunchStatus.PREPARING,
    message: 'Extracting native libraries...',
  });
  console.log('LaunchManager: Extracting natives...');

  const nativesDir = paths.nativesPath;
  try {
    if (fs.existsSync(nativesDir)) {
      await fs.promises.rm(nativesDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(nativesDir, { recursive: true });

    const currentOsPlatform = os.platform(); // 'darwin', 'win32', 'linux'
    const currentArch = os.arch(); // 'arm64', 'x64', 'ia32'

    let nativeOsName: 'windows' | 'osx' | 'linux' | null = null;
    if (currentOsPlatform === 'win32') nativeOsName = 'windows';
    else if (currentOsPlatform === 'darwin') nativeOsName = 'osx';
    else if (currentOsPlatform === 'linux') nativeOsName = 'linux';

    if (!nativeOsName) {
      console.warn(
        'LaunchManager: Unsupported OS for natives:',
        currentOsPlatform,
      );
      return true; // No OS mapping, can't determine natives, proceed without them.
    }
    console.log(
      `LaunchManager: System - OS: ${nativeOsName}, Arch: ${currentArch}`,
    );

    let extractionCount = 0;
    console.log(`LaunchManager: --- Start Native Extraction Detail ---`);
    // Temporary log to inspect all libraries being considered for native extraction
    console.log(
      'LaunchManager: Libraries to check for natives:',
      JSON.stringify(versionDetails.libraries.map((l) => l.name)),
    );
    for (const lib of versionDetails.libraries) {
      const featuresForRules = {
        /* Populate with relevant features if any rules need them */
      };
      const ruleContextForExtraction: RuleContext = {
        os: {
          name: nativeOsName,
          arch: currentArch,
          version: os.release(),
        },
        features: featuresForRules,
      };

      const allowLibByRules = lib.rules
        ? lib.rules.every((rule) => checkRule(rule, ruleContextForExtraction))
        : true;

      if (lib.name.includes('lwjgl')) {
        console.log(`LaunchManager: [Natives] Checking lib: ${lib.name}`);
        console.log(
          `LaunchManager: [Natives]   - Rules allow: ${allowLibByRules}`,
        );
        if (lib.rules) {
          lib.rules.forEach((r, i) => {
            console.log(
              `LaunchManager: [Natives]     Rule ${i}: ${JSON.stringify(r)} -> ${checkRule(r, ruleContextForExtraction)}`,
            );
          });
        }
      }

      if (!allowLibByRules) {
        // console.log(`LaunchManager: Rules disallow library: ${lib.name}`);
        continue;
      }

      // Primary method: Check if the library name itself indicates it's a native package for the current OS
      const nameParts = lib.name.split(':');
      const classifier =
        nameParts.length > 3 ? nameParts.slice(3).join('-') : null;

      let extractedThisLib = false;

      if (lib.name === 'org.lwjgl:lwjgl:3.3.3:natives-macos-arm64') {
        console.log(
          `DEBUG: Processing ${lib.name}. Classifier: ${classifier}. nativeOsName: ${nativeOsName}`,
        );
        console.log(
          `DEBUG: Original condition check: ${classifier && classifier.startsWith(`natives-${nativeOsName}`)}`,
        );
      }

      let primaryConditionMet = false;
      if (classifier) {
        if (nativeOsName === 'osx') {
          primaryConditionMet =
            classifier.startsWith('natives-macos') ||
            classifier.startsWith('natives-osx');
        } else {
          primaryConditionMet = classifier.startsWith(
            `natives-${nativeOsName}`,
          );
        }
      }

      if (lib.name.includes('natives-macos-arm64')) {
        console.log(
          `DEBUG: New condition check for ${lib.name} (classifier: ${classifier}): ${primaryConditionMet}`,
        );
      }

      if (primaryConditionMet) {
        if (lib.name.includes('lwjgl')) {
          let conditionString = `natives-${nativeOsName}`;
          if (nativeOsName === 'osx') {
            conditionString = `'natives-macos' or 'natives-osx'`;
          }
          console.log(
            `LaunchManager: [Natives]   - Classifier match for primary logic: '${classifier}' matches ${conditionString}`,
          );
        }
        if (lib.downloads?.artifact?.path) {
          const artifactPathForLogging = lib.downloads.artifact.path;
          const jarPathToExtract = path.join(
            paths.librariesPath,
            artifactPathForLogging,
          );
          const jarExists = fs.existsSync(jarPathToExtract);

          if (lib.name.includes('lwjgl-')) {
            console.log(
              `LaunchManager: [Natives]     Attempting to extract: ${lib.name}`,
            );
            console.log(
              `LaunchManager: [Natives]       - Artifact Path: ${artifactPathForLogging}`,
            );
            console.log(
              `LaunchManager: [Natives]       - Expected JAR at: ${jarPathToExtract}`,
            );
            console.log(
              `LaunchManager: [Natives]       - JAR exists for extraction: ${jarExists}`,
            );
          }

          if (jarExists) {
            console.log(
              `LaunchManager: EXTRACTING NATIVE from ${artifactPathForLogging} (lib: ${lib.name}) to ${nativesDir}`,
            );
            try {
              await extract(jarPathToExtract, {
                dir: nativesDir,
                onEntry: (entry) => {
                  const excludePatterns = lib.extract?.exclude ?? [];
                  return !excludePatterns.some((pattern) =>
                    entry.fileName.startsWith(pattern),
                  );
                },
              });
              extractionCount++;
              extractedThisLib = true;
            } catch (extractErr) {
              console.error(
                `LaunchManager: Failed to extract ${artifactPathForLogging} for lib ${lib.name}:`,
                extractErr,
              );
            }
          } else if (
            lib.name.includes('lwjgl-') &&
            classifier.includes('macos-arm64')
          ) {
            // Log más enfático si falta un JAR esperado
            console.warn(
              `LaunchManager: CRITICAL - Native JAR for osx-arm64 NOT FOUND: ${jarPathToExtract} for library ${lib.name}`,
            );
          }
        } else if (
          lib.name.includes('lwjgl-') &&
          classifier.includes('macos-arm64')
        ) {
          // Si no hay downloads.artifact.path
          console.warn(
            `LaunchManager: [Natives]     - No artifact path defined for expected native library: ${lib.name}`,
          );
        }
      }

      // Fallback method: For libraries with 'natives' object and 'classifiers'
      // This is less common for modern LWJGL but might apply to other libs or older formats.
      if (
        !extractedThisLib &&
        lib.natives &&
        lib.natives[nativeOsName] &&
        lib.downloads?.classifiers
      ) {
        // console.log(`LaunchManager: Attempting fallback (lib.natives structure) for ${lib.name}`);
        const archPlaceholder = lib.natives[nativeOsName];
        let nativeClassifierKey: string | undefined;

        if (archPlaceholder) {
          if (archPlaceholder.includes('${arch}')) {
            let archToken = currentArch;
            if (nativeOsName === 'linux') {
              if (currentArch === 'x64') archToken = 'x86_64';
              else if (currentArch === 'arm64') archToken = 'aarch_64';
            } else if (nativeOsName === 'windows') {
              if (currentArch === 'x64')
                archToken = '64'; // Common for Windows x64
              else if (currentArch === 'ia32') archToken = 'x86';
              // arm64 on Windows might use 'arm64'
            } else if (nativeOsName === 'osx') {
              if (currentArch === 'x64') archToken = 'x86_64';
              // arm64 on osx often uses 'arm64' or implies x86_64 compatibility for non-suffixed natives
            }
            nativeClassifierKey = archPlaceholder.replace('${arch}', archToken);
          } else {
            nativeClassifierKey = archPlaceholder; // Fixed classifier name
          }
        }

        if (
          nativeClassifierKey &&
          lib.downloads.classifiers[nativeClassifierKey]
        ) {
          const nativeArtifact = lib.downloads.classifiers[nativeClassifierKey];
          const jarPathToExtract = path.join(
            paths.librariesPath,
            nativeArtifact.path,
          );
          const artifactPathForLogging = nativeArtifact.path;

          if (fs.existsSync(jarPathToExtract)) {
            console.log(
              `LaunchManager: EXTRACTING NATIVE (fallback structure) from ${artifactPathForLogging} (lib: ${lib.name}) to ${nativesDir}`,
            );
            try {
              await extract(jarPathToExtract, {
                dir: nativesDir,
                onEntry: (entry) => {
                  const excludePatterns = lib.extract?.exclude ?? [];
                  return !excludePatterns.some((pattern) =>
                    entry.fileName.startsWith(pattern),
                  );
                },
              });
              extractionCount++;
            } catch (extractErr) {
              console.error(
                `LaunchManager: Failed to extract (fallback) ${artifactPathForLogging} for lib ${lib.name}:`,
                extractErr,
              );
            }
          } else {
            console.warn(
              `LaunchManager: Native JAR (fallback) NOT FOUND for extraction, expected at ${jarPathToExtract} for library ${lib.name}`,
            );
          }
        }
      }
    }

    console.log(`LaunchManager: --- End Native Extraction Detail ---`);
    console.log(
      `LaunchManager: Extracted natives from ${extractionCount} JARs.`,
    );
    if (
      extractionCount === 0 &&
      versionDetails.libraries.some((l) => l.name.includes('lwjgl'))
    ) {
      console.warn(
        'LaunchManager: WARNING - No native libraries were extracted. This is likely the cause of UnsatisfiedLinkError or ClassNotFoundException if LWJGL is used.',
      );
    }
    return true;
  } catch (err) {
    const errorMessage = getErrorMessage(
      err,
      'Error preparing natives directory',
    );
    console.error(`LaunchManager: ${errorMessage}`, err);
    mainWindow?.webContents.send('launch-status', {
      status: LaunchStatus.ERROR,
      message: errorMessage,
    });
    return false;
  }
}

/**
 * Identifies required library, client JAR, and asset index downloads.
 * Does NOT include individual assets yet.
 */
function getRequiredInitialDownloads(
  versionDetails: VersionDetails,
  paths: GamePaths,
): Array<DownloadTask> {
  const tasks: Array<DownloadTask> = [];
  console.log('LaunchManager: Identifying initial downloads...');

  // 1. Client JAR
  if (versionDetails.downloads.client) {
    tasks.push({
      url: versionDetails.downloads.client.url,
      destination: path.join(paths.versionPath, `${versionDetails.id}.jar`),
      sha1: versionDetails.downloads.client.sha1,
      size: versionDetails.downloads.client.size,
      label: `${versionDetails.id}.jar`,
    });
  }

  // 2. Libraries
  versionDetails.libraries.forEach((lib) => {
    // Ensure the library object and its name are valid before proceeding
    if (!lib || typeof lib.name !== 'string') {
      console.warn(
        'LaunchManager: Skipping invalid library entry during initial download scan:',
        lib,
      );
      return; // Skip this library entry
    }

    // Apply rules for library inclusion (simple check, context-aware check is done during extraction/classpath)
    // For downloads, we generally download if rules don't explicitly disallow for *any* OS,
    // as the exact OS context might only be known at launch time.
    // A more accurate rule check could be done here if needed, but often not necessary for downloads.
    const allowDownloadBasedOnSimpleRules = lib.rules
      ? lib.rules.every((rule) => {
          // Basic check: if an OS rule exists, it must be 'allow'.
          // This is a simplification; proper rule checking needs OS context.
          // For downloads, we are often more permissive.
          if (rule.os && rule.action === 'disallow') return false; // Basic disallow
          return true;
        })
      : true;

    if (!allowDownloadBasedOnSimpleRules) {
      // console.log(`LaunchManager: Skipping download for library ${lib.name} due to restrictive rules.`);
      return;
    }

    if (lib.downloads?.artifact?.path) {
      // Optional chaining for lib.downloads and lib.downloads.artifact
      tasks.push({
        url: lib.downloads.artifact.url,
        destination: path.join(
          paths.librariesPath,
          lib.downloads.artifact.path,
        ),
        sha1: lib.downloads.artifact.sha1,
        size: lib.downloads.artifact.size,
        label: path.basename(lib.downloads.artifact.path),
      });
    } else if (!lib.name.includes(':natives-')) {
      // Don't log for typical native-only entries that lack a main artifact
      console.log(
        `LaunchManager: Library ${lib.name} does not have downloadable artifact details. Skipping download. (May be expected for modloader-provided or local libs).`,
      );
    }
    // Natives are often listed as separate library entries with their own artifact paths,
    // or under lib.downloads.classifiers. The primary artifact download handles the main JAR.
    // Native extraction logic will handle classifiers if present.
  });

  // 3. Asset Index
  if (versionDetails.assetIndex?.url) {
    tasks.push({
      url: versionDetails.assetIndex.url,
      destination: path.join(
        paths.assetsPath,
        'indexes',
        `${versionDetails.assetIndex.id}.json`,
      ),
      sha1: versionDetails.assetIndex.sha1,
      size: versionDetails.assetIndex.size,
      label: `Asset Index (${versionDetails.assetIndex.id})`, // Add label
    });
  }

  // 4. Logging Configuration File
  if (
    versionDetails.logging?.client?.file?.id &&
    versionDetails.logging.client.file.url &&
    versionDetails.logging.client.file.sha1 &&
    typeof versionDetails.logging.client.file.size === 'number'
  ) {
    const logConfigFile = versionDetails.logging.client.file;
    const logConfigDestDir = path.join(paths.assetsPath, 'logging');
    tasks.push({
      url: logConfigFile.url,
      destination: path.join(logConfigDestDir, logConfigFile.id),
      sha1: logConfigFile.sha1,
      size: logConfigFile.size,
      label: `Log Config (${logConfigFile.id})`,
    });
    console.log(
      `LaunchManager: Added Log4j config file ${logConfigFile.id} to download tasks.`,
    );
  } else if (versionDetails.logging?.client?.argument?.includes('${path}')) {
    console.warn(
      `LaunchManager: Version ${versionDetails.id} has a Log4j argument referencing \${path}, but logging file details for download are incomplete or missing. Download of Log4j config skipped.`,
    );
  }

  console.log(`LaunchManager: Found ${tasks.length} initial download tasks.`);
  return tasks;
}

/**
 * Generates download tasks for individual assets based on the index.
 */
function getAssetDownloadTasks(
  assetIndex: AssetIndexDetails,
  paths: GamePaths,
): Array<DownloadTask> {
  const tasks: Array<DownloadTask> = [];
  const assetBaseUrl = environments.ASSET_BASE_URL;

  console.log(`LaunchManager: Generating asset download tasks from index...`);

  for (const key in assetIndex.objects) {
    const asset = assetIndex.objects[key];
    const hash = asset.hash;
    const firstTwo = hash.substring(0, 2);
    const assetPath = path.join(paths.assetsPath, 'objects', firstTwo, hash);
    const assetUrl = `${assetBaseUrl}/${firstTwo}/${hash}`;

    tasks.push({
      url: assetUrl,
      destination: assetPath,
      sha1: hash,
      size: asset.size,
      label: key,
    });
  }
  console.log(`LaunchManager: Generated ${tasks.length} asset download tasks.`);
  return tasks;
}

/**
 * Constructs the classpath string.
 * This function now handles library deduplication by prioritizing the last encountered
 * library for a given groupId:artifactId. It also ensures the base client JAR is included.
 */
function buildClasspath(
  versionDetails: VersionDetails,
  paths: GamePaths,
): string {
  console.log(
    `LaunchManager: buildClasspath received paths.librariesPath: ${paths.librariesPath}`,
  );
  const separator = os.platform() === 'win32' ? ';' : ':';
  // Using a Map to handle deduplication: key is "groupId:artifactId", value is the full JAR path.
  // The last one encountered for a given groupId:artifactId wins, effectively allowing overrides
  // if the versionDetails.libraries array is ordered with overrides later.
  const libraryPathMap = new Map<string, string>();

  console.log('LaunchManager: Building classpath...');

  versionDetails.libraries.forEach((lib) => {
    if (!lib || typeof lib.name !== 'string') {
      console.warn(
        'LaunchManager: Skipping invalid library entry during classpath construction:',
        lib,
      );
      return;
    }

    // Basic rule check: if rules exist, assume they need to allow.
    // Context-specific rule checking for classpath isn't typically done here,
    // as libraries are usually included if not OS-specific natives for a *different* OS.
    // The primary filtering for natives happens by their name/type.
    const allowBySimpleRules = lib.rules
      ? lib.rules.every((rule) => rule.action === 'allow' || !rule.os) // Simplistic: allow if no OS rule or action is allow
      : true;

    if (!allowBySimpleRules) {
      // This might be too aggressive if a library has OS-specific rules but is still needed on others.
      // For classpath, we primarily care about excluding natives of *other* OSes.
      // The isLikelyNativeOnlyJar check below is more important for classpath.
      // console.log(`LaunchManager: Skipping library ${lib.name} from classpath due to rules (simple check).`);
      // return;
    }

    const nameParts = lib.name.split(':');
    if (nameParts.length < 2) {
      console.warn(
        `LaunchManager: Library ${lib.name} has an unexpected name format for classpath. Skipping.`,
      );
      return;
    }
    const groupId = nameParts[0];
    const artifactId = nameParts[1];
    // Use groupId:artifactId as the unique key for the library's main JAR.
    // Classifiers are typically handled separately (e.g., natives).
    const libraryKey = `${groupId}:${artifactId}`;

    let libFullPath: string | null = null;

    if (lib.downloads?.artifact?.path) {
      // Standard case: library has a defined artifact path.
      libFullPath = path.join(paths.librariesPath, lib.downloads.artifact.path);
      console.log(
        `DEBUG_BUILDPATH: For lib ${lib.name}, paths.librariesPath = "${paths.librariesPath}", artifact.path = "${lib.downloads.artifact.path}", constructed libFullPath = "${libFullPath}"`,
      );
    } else if (nameParts.length >= 3) {
      // Fallback for libraries without explicit artifact path but with a standard name
      const version = nameParts[2]; // Could also include a classifier if nameParts.length > 3
      const groupIdPath = groupId.replace(/\./g, '/');

      // Handle potential classifier in the version part for fallback path construction
      const libFileNameBase = artifactId;
      let versionPart = version;
      if (nameParts.length > 3) {
        const classifierInName = nameParts.slice(3).join('-');
        // Avoid adding natives to versionPart if they are already part of the name for path construction
        if (!classifierInName.startsWith('natives-')) {
          versionPart = `${version}-${classifierInName}`;
        }
      }
      const libFileName = `${libFileNameBase}-${versionPart}.jar`;
      const libRelativePath = path.join(
        groupIdPath,
        artifactId,
        version,
        libFileName,
      );
      libFullPath = path.join(paths.librariesPath, libRelativePath);
      console.log(
        `DEBUG_BUILDPATH: For lib ${lib.name} (fallback), paths.librariesPath = "${paths.librariesPath}", libRelativePath = "${libRelativePath}", constructed libFullPath = "${libFullPath}"`,
      );
      console.log(
        `LaunchManager: Fallback path construction for ${lib.name}: ${libFullPath}`,
      );
    }

    if (libFullPath) {
      const artifactFileName = path.basename(libFullPath);

      const isNativeJarByName = lib.name.includes(':natives-');
      const isNativeJarByFileName = artifactFileName.includes('-natives-');
      const hasNativesObject = !!lib.natives; // Indicates this library entry itself is primarily for natives

      const isLikelyNativeOnlyJar =
        isNativeJarByName || isNativeJarByFileName || hasNativesObject;

      if (!isLikelyNativeOnlyJar) {
        if (fs.existsSync(libFullPath)) {
          libraryPathMap.set(libraryKey, libFullPath);
        } else {
          console.warn(
            `LaunchManager: Library JAR for classpath not found: ${libFullPath} (for ${lib.name}). It will be skipped.`,
          );
        }
      } else {
        console.log(
          `LaunchManager: Skipping ${artifactFileName} (from lib ${lib.name}) from Java classpath as it appears to be a native library.`,
        );
      }
    } else if (!lib.name.includes(':natives-')) {
      // Avoid warning for typical native entries that don't have a main JAR path
      console.log(
        `LaunchManager: Could not determine path for library ${lib.name}. It might be a virtual library or require special handling (e.g. provided by modloader). Skipping from classpath.`,
      );
    }
  });

  const finalClassPathEntries = Array.from(libraryPathMap.values());

  // Add the main client JAR of the base version
  const baseVersionId = versionDetails.inheritsFrom || versionDetails.id;

  // Use the determined baseVersionId to construct the client JAR details
  const clientJarName = `${baseVersionId}.jar`;
  const clientJarPath = path.join(
    paths.versionsPath,
    baseVersionId,
    clientJarName,
  );
  console.log(
    `DEBUG_BUILDPATH: Client JAR: paths.versionsPath = "${paths.versionsPath}", baseVersionId = "${baseVersionId}", clientJarName = "${clientJarName}", constructed clientJarPath = "${clientJarPath}"`,
  );

  if (!finalClassPathEntries.includes(clientJarPath)) {
    if (fs.existsSync(clientJarPath)) {
      finalClassPathEntries.push(clientJarPath);
      console.log(
        `LaunchManager: Added base client JAR to classpath: ${clientJarPath}`,
      );
    } else {
      console.warn(
        `LaunchManager: Base client JAR NOT FOUND at ${clientJarPath}. Classpath may be incomplete. This is critical.`,
      );
    }
  }

  console.log(
    `LaunchManager: Final classpath contains ${finalClassPathEntries.length} entries.`,
  );
  return finalClassPathEntries.join(separator);
}

/**
 * Prepares and launches the Game version.
 */
export async function launchVersion(
  versionDetails: VersionDetails,
  settings: SettingsState,
  paths: GamePaths,
  mainWindow: BrowserWindow | null,
): Promise<{ success: boolean; error?: string }> {
  console.log('LaunchManager: launchVersion called for:', versionDetails.id);

  console.log(
    'LaunchManager: Received versionDetails.arguments.jvm:',
    JSON.stringify(versionDetails.arguments.jvm, null, 2),
  );

  console.log(
    'LaunchManager: Received versionDetails.arguments.game:',
    JSON.stringify(versionDetails.arguments.game, null, 2),
  );

  if (runningProcess) {
    console.warn('LaunchManager: Game is already running.');
    mainWindow?.webContents.send('launch-status', {
      status: 'error',
      message: 'Game already running',
    });
    return { success: false, error: 'Game already running' };
  }

  try {
    mainWindow?.webContents.send('launch-status', {
      status: 'preparing',
      message: 'Identifying files...',
    });

    // --- 1. Download Initial Files (JARs, Libraries, Asset Index) ---
    const initialDownloads = getRequiredInitialDownloads(versionDetails, paths);
    if (initialDownloads.length > 0) {
      mainWindow?.webContents.send('launch-status', {
        status: 'downloading',
        message: `Downloading core files (${initialDownloads.length})...`,
        totalFiles: initialDownloads.length,
      });
      const initialResults = await downloadMultipleFiles(
        initialDownloads,
        settings.parallelDownloads || 3,
        mainWindow,
      );
      if (
        initialResults.failureCount > 0 ||
        initialResults.validationFailures > 0
      ) {
        const errorMsg = `Failed to download or validate ${
          initialResults.failureCount + initialResults.validationFailures
        } core files.`;
        console.error(`LaunchManager: ${errorMsg}`);
        mainWindow?.webContents.send('launch-status', {
          status: 'error',
          message: errorMsg,
        });
        return { success: false, error: errorMsg };
      }
    } else {
      console.log(
        'LaunchManager: No initial downloads required (already cached/validated).',
      );
    }

    // --- 2. Download Assets ---
    mainWindow?.webContents.send('launch-status', {
      status: 'preparing',
      message: 'Reading asset index...',
    });
    const assetIndexPath = path.join(
      paths.assetsPath,
      'indexes',
      `${versionDetails.assetIndex.id}.json`,
    );
    const assetIndex = await readAssetIndex(assetIndexPath);

    if (!assetIndex) {
      const errorMsg = `Failed to read or parse asset index: ${assetIndexPath}`;
      console.error(`LaunchManager: ${errorMsg}`);
      mainWindow?.webContents.send('launch-status', {
        status: 'error',
        message: errorMsg,
      });
      return {
        success: false,
        error: `Failed to read asset index: ${assetIndexPath}`,
      };
    }

    const assetDownloads = getAssetDownloadTasks(assetIndex, paths);
    if (assetDownloads.length > 0) {
      mainWindow?.webContents.send('launch-status', {
        status: 'downloading',
        message: `Downloading assets (${assetDownloads.length})...`,
        totalFiles: assetDownloads.length,
      });
      const assetResults = await downloadMultipleFiles(
        assetDownloads,
        settings.parallelDownloads || 10, // Maybe allow more parallelism for small assets
        mainWindow,
      );
      if (
        assetResults.failureCount > 0 ||
        assetResults.validationFailures > 0
      ) {
        const errorMsg = `Failed to download or validate ${
          assetResults.failureCount + assetResults.validationFailures
        } assets.`;
        console.error(`LaunchManager: ${errorMsg}`);
        mainWindow?.webContents.send('launch-status', {
          status: 'error',
          message: errorMsg,
        });
        return {
          success: false,
          error: `Failed to download or validate ${
            assetResults.failureCount + assetResults.validationFailures
          } assets.`,
        };
      }
    } else {
      console.log(
        'LaunchManager: No asset downloads required (index empty or files cached/validated).',
      );
    }

    mainWindow?.webContents.send('launch-status', {
      status: 'preparing',
      message: 'Downloads complete. Preparing launch arguments...',
    });

    // --- 3. Extract Natives ---
    const nativesExtracted = await extractNatives(
      versionDetails,
      paths,
      mainWindow,
    );
    if (!nativesExtracted) {
      // Error message already sent by extractNatives
      return { success: false, error: 'Failed to extract native libraries.' }; // Return error
    }

    mainWindow?.webContents.send('launch-status', {
      status: LaunchStatus.PREPARING,
      message: 'Preparing launch arguments...',
    });

    // --- 4. Prepare Launch Variables ---
    const canonicalPathsForClasspath = { ...paths };
    try {
      if (fs.existsSync(paths.librariesPath)) {
        const realLibrariesPath = fs.realpathSync(paths.librariesPath);
        console.log(
          `LaunchManager: Canonicalizing librariesPath: "${paths.librariesPath}" -> "${realLibrariesPath}"`,
        );
        canonicalPathsForClasspath.librariesPath = realLibrariesPath;
      }
      if (fs.existsSync(paths.versionsPath)) {
        const realVersionsPath = fs.realpathSync(paths.versionsPath);
        console.log(
          `LaunchManager: Canonicalizing versionsPath: "${paths.versionsPath}" -> "${realVersionsPath}"`,
        );
        canonicalPathsForClasspath.versionsPath = realVersionsPath;
      }
      // Note: paths.versionPath is derived from paths.versionsPath.
      // If buildClasspath constructs client JAR path using canonicalPathsForClasspath.versionsPath,
      // the specific version sub-path will be joined to a canonical base.
      // paths.assetsPath and paths.userDataPath in canonicalPathsForClasspath remain as they were in 'paths'.
    } catch (e) {
      console.warn(
        `LaunchManager: Error canonicalizing paths for classpath, proceeding with original paths from 'paths' object. Error: ${getErrorMessage(e)}`,
      );
      // canonicalPathsForClasspath will retain original paths if realpathSync fails for any
    }

    console.log(
      `LaunchManager: Using librariesPath for buildClasspath: ${canonicalPathsForClasspath.librariesPath}`,
    );
    console.log(
      `LaunchManager: Using versionsPath for buildClasspath: ${canonicalPathsForClasspath.versionsPath}`,
    );

    const classpath = buildClasspath(
      versionDetails,
      canonicalPathsForClasspath,
    );
    const authInfo: AuthInfo = {
      username: settings.username || 'Player',
      uuid: settings.uuid || '00000000-0000-0000-0000-000000000000',
      accessToken: settings.accessToken || '0',
      userType: settings.userType || UserType.OFFLINE,
      xuid: settings.xuid || '',
    };

    console.log(`DEBUG: app.getPath('userData') = ${app.getPath('userData')}`);
    const rawGameDirectoryPath =
      String(settings.gameDirectory) || paths.userDataPath;
    const rawAssetsPath = paths.assetsPath; // From input GamePaths
    const rawNativesPath = paths.nativesPath; // From input GamePaths, used by extractNatives

    const preferredUserBasePath = app.getPath('userData');

    // Ensure game directory exists using the raw path first
    try {
      await fs.promises.mkdir(rawGameDirectoryPath, { recursive: true });
    } catch (err) {
      console.warn(
        `LaunchManager: Could not create game directory ${rawGameDirectoryPath}:`,
        err,
      );
    }
    // Natives directory should have been created by extractNatives using rawNativesPath

    // Resolve critical paths to their canonical form for JVM arguments and CWD
    // This aligns them with the canonical paths typically found in the classpath.
    let resolvedGameDirectory = rawGameDirectoryPath;
    if (fs.existsSync(rawGameDirectoryPath)) {
      try {
        const realPath = fs.realpathSync(rawGameDirectoryPath);
        if (
          rawGameDirectoryPath.startsWith(preferredUserBasePath) &&
          !realPath.startsWith(preferredUserBasePath)
        ) {
          console.warn(
            `LaunchManager: realpathSync for gameDirectory changed "${rawGameDirectoryPath}" to "${realPath}". Preferring original base: "${rawGameDirectoryPath}"`,
          );
          resolvedGameDirectory = rawGameDirectoryPath; // Or path.resolve(rawGameDirectoryPath)
        } else {
          resolvedGameDirectory = realPath;
        }
      } catch (e) {
        console.warn(
          `LaunchManager: realpathSync failed for gameDirectory "${rawGameDirectoryPath}", using path.resolve. Error: ${getErrorMessage(e)}`,
        );
        resolvedGameDirectory = path.resolve(rawGameDirectoryPath);
      }
    } else {
      resolvedGameDirectory = path.resolve(rawGameDirectoryPath);
      console.warn(
        `LaunchManager: gameDirectory "${rawGameDirectoryPath}" did not exist for realpathSync, resolved to "${resolvedGameDirectory}"`,
      );
    }

    let resolvedAssetsPath = rawAssetsPath;
    if (fs.existsSync(rawAssetsPath)) {
      try {
        const realPath = fs.realpathSync(rawAssetsPath);
        if (
          rawAssetsPath.startsWith(preferredUserBasePath) &&
          !realPath.startsWith(preferredUserBasePath) &&
          rawAssetsPath.includes(path.basename(preferredUserBasePath))
        ) {
          // check if rawAssetsPath contains the user's home dir name
          console.warn(
            `LaunchManager: realpathSync for assetsPath changed "${rawAssetsPath}" to "${realPath}". Preferring original base: "${rawAssetsPath}"`,
          );
          resolvedAssetsPath = rawAssetsPath;
        } else {
          resolvedAssetsPath = realPath;
        }
      } catch (e) {
        console.warn(
          `LaunchManager: realpathSync failed for assetsPath "${rawAssetsPath}", using path.resolve. Error: ${getErrorMessage(e)}`,
        );
        resolvedAssetsPath = path.resolve(rawAssetsPath);
      }
    } else {
      resolvedAssetsPath = path.resolve(rawAssetsPath);
      console.warn(
        `LaunchManager: assetsPath "${rawAssetsPath}" did not exist for realpathSync, resolved to "${resolvedAssetsPath}"`,
      );
    }

    let resolvedNativesPath = rawNativesPath;
    if (fs.existsSync(rawNativesPath)) {
      // Natives path should exist after extractNatives
      try {
        const realPath = fs.realpathSync(rawNativesPath);
        if (
          rawNativesPath.startsWith(preferredUserBasePath) &&
          !realPath.startsWith(preferredUserBasePath) &&
          rawNativesPath.includes(path.basename(preferredUserBasePath))
        ) {
          console.warn(
            `LaunchManager: realpathSync for nativesPath changed "${rawNativesPath}" to "${realPath}". Preferring original base: "${rawNativesPath}"`,
          );
          resolvedNativesPath = rawNativesPath;
        } else {
          resolvedNativesPath = realPath;
        }
      } catch (e) {
        console.warn(
          `LaunchManager: realpathSync failed for nativesPath "${rawNativesPath}", using path.resolve. Error: ${getErrorMessage(e)}`,
        );
        resolvedNativesPath = path.resolve(rawNativesPath);
      }
    } else {
      resolvedNativesPath = path.resolve(rawNativesPath); // Should have been created by extractNatives
      console.warn(
        `LaunchManager: nativesPath "${rawNativesPath}" did not exist for realpathSync (unexpected), resolved to "${resolvedNativesPath}"`,
      );
    }

    console.log(`LaunchManager: Path resolutions --`);
    console.log(
      `  Raw GameDir: ${rawGameDirectoryPath} -> Resolved: ${resolvedGameDirectory}`,
    );
    console.log(
      `  Raw Assets : ${rawAssetsPath} -> Resolved: ${resolvedAssetsPath}`,
    );
    console.log(
      `  Raw Natives: ${rawNativesPath} -> Resolved: ${resolvedNativesPath}`,
    );

    let log4jConfigFilePath = '';
    const log4jConfigFileId = versionDetails.logging?.client?.file?.id;
    const log4jArgumentString = versionDetails.logging?.client?.argument;

    if (log4jConfigFileId) {
      log4jConfigFilePath = path.join(
        resolvedAssetsPath,
        'logging',
        log4jConfigFileId,
      );
    }

    const variables: Record<string, string> = {
      natives_directory: resolvedNativesPath,
      launcher_name: 'LLauncher',
      launcher_version: app.getVersion(),
      classpath,
      game_directory: resolvedGameDirectory,
      assets_root: resolvedAssetsPath,
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
      clientId: '',
    };

    console.log(
      `LaunchManager: Value of variables['classpath'] before processing JVM args: ${variables['classpath']}`,
    ); // NUEVO LOG

    const testTemplate = 'TEST_NATIVES_PATH=${natives_directory}';
    const testReplaced = replacePlaceholders(testTemplate, variables);
    console.log(
      `LaunchManager: TEST replacePlaceholders: Input='${variables['natives_directory']}', Output='${testReplaced}'`,
    );

    if (log4jArgumentString?.includes('${path}')) {
      if (log4jConfigFilePath && fs.existsSync(log4jConfigFilePath)) {
        variables['path'] = log4jConfigFilePath; // Key is 'path' for ${path}
      } else {
        console.warn(
          `LaunchManager: Log4j configuration file (id: ${log4jConfigFileId || 'unknown'}) expected for argument "${log4jArgumentString}" was not found at: ${log4jConfigFilePath}. The placeholder \${path} will not be resolved.`,
        );
      }
    }

    // --- 5. Process Arguments ---
    const jvmArgsFromManifest = versionDetails.arguments?.jvm || [];
    const gameArgsFromManifest = versionDetails.arguments?.game || [];

    console.log(
      `LaunchManager: Value of variables['natives_directory'] before processing JVM args: ${variables['natives_directory']}`,
    );
    const processedBaseJvmArgs = processArguments(
      jvmArgsFromManifest,
      variables,
    );
    console.log(
      'LaunchManager: Processed JVM args (before custom/memory):',
      processedBaseJvmArgs,
    );
    const processedGameArgs = processArguments(gameArgsFromManifest, variables);

    // --- Add JVM Memory Arguments ---
    const minMemory =
      settings.memoryMinimum || defaultSettingsState.memoryMinimum;
    const maxMemory = settings.memoryMaximum || 4096;
    const memoryArgs = [
      `-Xms${minMemory}M`, // Minimum memory
      `-Xmx${maxMemory}M`, // Maximum memory
    ];

    // --- Add Custom JVM Arguments ---
    // Use const and assign directly. Handle empty/null string with '|| ""'.
    const customJvmArgs: Array<string> = (settings.jvmArguments || '')
      .split(' ')
      .map((arg) => arg.trim())
      .filter((arg) => arg !== '');

    // Log only if arguments were actually added
    if (customJvmArgs.length > 0) {
      console.log('LaunchManager: Adding custom JVM arguments:', customJvmArgs);
    }

    // Combine JVM arguments (Memory args often need to be early)
    const assembledJvmArgs = [
      ...memoryArgs,
      ...processedBaseJvmArgs, // Contains manifest JVM args with ${classpath} resolved if present
      ...customJvmArgs,
    ];

    // --- 6. Construct Command ---
    const javaPath = settings.javaPath || 'java';
    let finalCommandArgs: Array<string>;

    // Check if -cp was already provided by the manifest's JVM arguments.
    // processArguments would have replaced ${classpath} with the actual classpath string
    // if "-cp", "${classpath}" was in versionDetails.arguments.jvm.
    const cpFlagInManifestArgs = processedBaseJvmArgs.includes('-cp');

    if (cpFlagInManifestArgs) {
      // If manifest provided -cp (and by extension ${classpath} which is now resolved by processArguments),
      // then assembledJvmArgs already contains the classpath argument correctly.
      // We just need to append the main class and game arguments.
      console.log(
        'LaunchManager: Classpath argument (-cp) was processed from the version manifest.',
      );
      finalCommandArgs = [
        ...assembledJvmArgs, // Already contains -cp and the resolved classpath from manifest
        versionDetails.mainClass,
        ...processedGameArgs,
      ];
    } else {
      // If manifest did NOT provide -cp, the launcher must add it.
      console.log(
        'LaunchManager: Classpath argument (-cp) was NOT found in version manifest. Adding it now.',
      );
      finalCommandArgs = [
        ...assembledJvmArgs, // Does not contain -cp from manifest
        '-cp',
        classpath, // The classpath string built by buildClasspath()
        versionDetails.mainClass,
        ...processedGameArgs,
      ];
    }

    // --- 7. Spawn Process ---
    console.log('LaunchManager: Launching Java:', javaPath);
    console.log('LaunchManager: Arguments:', finalCommandArgs.join(' '));
    mainWindow?.webContents.send('launch-status', {
      status: 'launching',
      message: 'Starting Java process...',
    });

    const cwd = resolvedGameDirectory;
    console.log('LaunchManager: Using CWD:', cwd);

    runningProcess = spawn(javaPath, finalCommandArgs, {
      cwd,
      detached: false,
    });

    // --- Handle Process Output/Events ---
    runningProcess.stdout?.on('data', (data) => {
      const message = data.toString();
      console.log(`[Game STDOUT]: ${message}`);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-output', {
          type: 'stdout',
          message,
        });
      }
    });

    runningProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      console.error(`[Game STDERR]: ${message}`);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-output', {
          type: 'stderr',
          message,
        });
      }
    });

    runningProcess.on('close', (code) => {
      console.log(`LaunchManager: Game process exited with code ${code}`);
      // Check if window exists and is not destroyed before sending
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('launch-status', {
          status: 'closed',
          code,
        });
      }
      runningProcess = null; // Reset process tracker
    });

    runningProcess.on('error', (err) => {
      console.error('LaunchManager: Failed to start Game process:', err);
      mainWindow?.webContents.send('launch-status', {
        status: 'error',
        message: `Failed to start Java: ${err.message}`,
      });
      runningProcess = null;
    });

    // --- Close Launcher if keepLauncherOpen is false ---
    if (!settings.keepLauncherOpen && mainWindow && !mainWindow.isDestroyed()) {
      console.log(
        'LaunchManager: Closing launcher window as keepLauncherOpen is false.',
      );

      // Use a small delay to ensure the game window has a chance to appear
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
        }
      }, 500);
    }

    // --- Return success ---
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(
      err,
      'An unexpected error occurred during launch preparation',
    );
    console.error(`LaunchManager: ${errorMessage}`, err);
    mainWindow?.webContents.send('launch-status', {
      status: 'error',
      message: errorMessage,
    });
    runningProcess = null; // Reset process tracker
    return { success: false, error: errorMessage };
  }
}

/**
 * Attempts to kill the running Game process.
 */
export function killRunningProcess() {
  if (runningProcess) {
    console.log('LaunchManager: Attempting to kill running Game process...');
    const killed = runningProcess.kill(); // Sends SIGTERM by default
    if (!killed) {
      console.warn(
        'LaunchManager: Failed to send kill signal (process might already be dead).',
      );
      // Consider forceful kill (SIGKILL) after a timeout if needed
    }
    runningProcess = null; // Assume killed for now
  } else {
    console.log('LaunchManager: No Game process seems to be running.');
  }
}
