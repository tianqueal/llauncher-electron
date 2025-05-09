import { DownloadStatus } from './DownloadStatus';
import { LaunchStatus } from './LaunchStatus'; // Assuming LaunchStatus type exists

export interface LaunchStatusArgs {
  status: LaunchStatus;
  message?: string;
  code?: number; // Exit code when status is 'closed'
  totalFiles?: number; // Total files for the current download stage
}

export interface DownloadProgressArgs {
  file: string; // Label or filename
  progress: number; // Percentage (0-100), or -1 if total size unknown
  status: DownloadStatus;
  error?: string;
  downloadedBytes?: number;
  totalBytes?: number;
}

export interface LaunchOutputArgs {
  type: 'stdout' | 'stderr';
  message: string;
}
