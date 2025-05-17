import { OsName } from './VersionDetails';

export interface RuleContext {
  os: {
    name: OsName | 'windows' | 'osx' | 'linux'; // Allow OsName enum or mapped strings
    arch: string;
    version?: string;
  };
  features: Record<string, boolean>; // e.g., { is_demo_user: false, has_custom_resolution: true }
}
