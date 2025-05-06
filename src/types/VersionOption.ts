import { VersionType } from './VersionManifest';

export interface VersionOption {
  value: string;
  label: string;
  type: VersionType;
}
