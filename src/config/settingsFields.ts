import { UserType } from '../types/UserType';
import {
  SettingFieldConfig,
  SettingFieldType,
} from '../types/SettingFieldConfig';

/**
 * Array containing the configuration for each setting field in the SettingsView.
 */
export const settingsFields: Array<SettingFieldConfig> = [
  {
    id: 'username',
    label: 'Username',
    description: 'This is the name that will be displayed in the game',
    type: SettingFieldType.TEXT,
    required: true,
  },
  {
    id: 'parallelDownloads',
    label: 'Parallel downloads',
    description: 'Number of files being downloaded simultaneously (3-20)',
    type: SettingFieldType.NUMBER,
    required: true,
    validation: { min: 3, max: 20 },
  },
  {
    id: 'memoryMinimum',
    label: 'Minimum Memory (MB)',
    description: 'Initial memory allocated to the game (e.g., 512 MB)',
    type: SettingFieldType.NUMBER,
    required: true,
    validation: { min: 256, max: 8192 },
  },
  {
    id: 'memoryMaximum',
    label: 'Maximum Memory (MB)',
    description: 'Maximum memory allocated to the game (e.g., 4096 MB)',
    type: SettingFieldType.NUMBER,
    required: true,
    validation: { min: 512, max: 16384 },
  },
  {
    id: 'javaPath',
    label: 'Path to Java',
    description: 'Path or executable for Java Runtime (JRE/JDK)',
    type: SettingFieldType.TEXT, // Consider adding a file picker button later
    required: false,
    validation: {
      pattern: '\\S',
    },
  },
  {
    id: 'resolutionWidth',
    label: 'Window Width',
    description: 'Initial width of the game window in pixels',
    type: SettingFieldType.NUMBER,
    required: true,
    validation: { min: 320 },
  },
  {
    id: 'resolutionHeight',
    label: 'Window Height',
    description: 'Initial height of the game window in pixels',
    type: SettingFieldType.NUMBER,
    required: true,
    validation: { min: 240 },
  },
  {
    id: 'gameDirectory',
    label: 'Game Directory',
    description:
      'Folder for saves, resourcepacks, etc. (Leave blank for default)',
    type: SettingFieldType.TEXT, // Consider adding a directory picker button later
    required: false,
    validation: {
      pattern: '\\S',
    },
  },
  {
    id: 'jvmArguments',
    label: 'Advanced JVM Arguments',
    description:
      'Additional flags for the Java Virtual Machine (use with caution)',
    type: SettingFieldType.TEXTAREA, // Use textarea for potentially longer input
    required: false,
  },
  {
    id: 'keepLauncherOpen',
    label: 'Keep Launcher Open',
    description: 'Keep the launcher window open after the game starts',
    type: SettingFieldType.SWITCH,
    required: false,
  },
  {
    id: 'showAllVersions',
    label: 'Show All Versions',
    description:
      'Display all available game versions in the selector (possibly unstable)',
    type: SettingFieldType.SWITCH,
    required: false,
  },
  // --- Authentication Fields ---
  {
    id: 'accessToken',
    label: 'Access Token',
    description:
      'Authentication token for online play (leave blank for offline)',
    type: SettingFieldType.PASSWORD,
    required: false,
  },
  {
    id: 'uuid',
    label: 'UUID',
    description:
      'Player Universally Unique Identifier (from auth service or generated for offline)',
    type: SettingFieldType.TEXT,
    required: false,
  },
  {
    id: 'xuid',
    label: 'XUID (Xbox User ID)',
    description: 'Xbox User ID, obtained from Microsoft Account authentication',
    type: SettingFieldType.TEXT,
    required: false,
  },
  {
    id: 'userType',
    label: 'User Type',
    description: 'Type of account',
    type: SettingFieldType.SELECT,
    options: Object.values(UserType).map((type) => ({
      label: type,
      value: type,
    })),
    required: false,
  },
  // --- End Authentication Fields ---
];
