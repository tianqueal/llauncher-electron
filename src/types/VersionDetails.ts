export interface VersionDetails {
  arguments: Arguments;
  assetIndex: AssetIndex;
  assets: string;
  complianceLevel: number;
  downloads: VersionDownloads; // Renamed from ManifestDownloads
  id: string;
  javaVersion: JavaVersion;
  libraries: Array<Library>;
  logging: Logging;
  mainClass: string;
  minimumLauncherVersion: number;
  releaseTime: string; // ISO Date string
  time: string; // ISO Date string
  type: string;
}

export interface Arguments {
  game: Array<GameArgument | string>; // Renamed GameClass
  jvm: Array<JvmArgument | string>; // Renamed JVMClass
}

export type GameArgument = RuleBasedArgument<GameRule>;
export type JvmArgument = RuleBasedArgument<JvmRule>;

export interface RuleBasedArgument<T> {
  rules: Array<T>;
  value: Array<string> | string;
}

export interface GameRule {
  action: Action;
  features: Features;
}

export enum Action {
  Allow = 'allow',
  Disallow = 'disallow', // Added based on common usage
}

export interface Features {
  is_demo_user?: boolean;
  has_custom_resolution?: boolean;
  has_quick_plays_support?: boolean;
  is_quick_play_singleplayer?: boolean;
  is_quick_play_multiplayer?: boolean;
  is_quick_play_realms?: boolean;
}

export interface JvmRule {
  action: Action;
  os: OsRule; // Renamed PurpleOS
}

export interface OsRule {
  name?: OsName; // Renamed Name
  arch?: string;
  version?: string; // OS version might be relevant
}

export enum OsName {
  Linux = 'linux',
  Osx = 'osx',
  Windows = 'windows',
}

export interface AssetIndex {
  id: string;
  sha1: string;
  size: number;
  totalSize?: number;
  url: string;
}

export interface VersionDownloads {
  client: DownloadDetails; // Renamed ClientMappingsClass
  client_mappings: DownloadDetails;
  server: DownloadDetails;
  server_mappings: DownloadDetails;
}

export interface DownloadDetails {
  sha1: string;
  size: number;
  url: string;
  path?: string; // Often present in library downloads
}

export interface JavaVersion {
  component: string;
  majorVersion: number;
}

export interface Library {
  downloads: LibraryDownloads;
  name: string; // e.g., "com.mojang:patchy:1.1"
  rules?: Array<LibraryRule>;
  natives?: Natives; // For native libraries
  extract?: ExtractRule; // For extracting natives
}

export interface LibraryDownloads {
  artifact: DownloadDetails;
  classifiers?: { [key: string]: DownloadDetails }; // For natives like 'natives-windows'
}

// Natives might specify which classifier to use per OS
export interface Natives {
  linux?: string; // e.g., "natives-linux"
  osx?: string; // e.g., "natives-osx"
  windows?: string; // e.g., "natives-windows"
}

// Rules for extracting native libraries
export interface ExtractRule {
  exclude: Array<string>;
}

export interface LibraryRule {
  action: Action;
  os: OsRule; // Can reuse OsRule here
}

export interface Logging {
  client: LoggingClient;
}

export interface LoggingClient {
  argument: string;
  file: AssetIndex; // Reusing AssetIndex type for file details
  type: string;
}
