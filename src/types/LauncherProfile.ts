/**
 * Defines the structure for a single launcher profile
 */
export interface LauncherProfile {
  created: string;
  gameDir: string;
  lastUsed: string;
  lastVersionId: string;
  name: string;
  type: string;
}
