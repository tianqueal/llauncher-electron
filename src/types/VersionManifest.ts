export interface VersionManifest {
  latest: Latest;
  versions: Array<VersionInfo>;
}

export interface Latest {
  release: string;
  snapshot: string;
}

export interface VersionInfo {
  id: string;
  type: VersionType;
  url: string;
  time: string;
  releaseTime: string;
  sha1: string;
  complianceLevel: number;
}

export enum VersionType {
  OldAlpha = 'old_alpha',
  OldBeta = 'old_beta',
  Release = 'release',
  Snapshot = 'snapshot',
}
