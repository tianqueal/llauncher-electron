import { DownloadStatus } from "./DownloadStatus"

export interface FileProgress {
  progress: number // -1 if total size unknown, 0-100 otherwise
  status: DownloadStatus
  downloadedBytes?: number
  totalBytes?: number
}
