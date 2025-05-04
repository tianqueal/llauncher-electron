export enum DownloadStatus {
  QUEUED = 'Queued',
  DOWNLOADING = 'Downloading',
  VALIDATING = 'Validating',
  VALIDATED = 'Validated',
  DOWNLOADED_NO_CHECKSUM = 'Downloaded (No Checksum)',
  ERROR = 'Error',
  VALIDATION_FAILED = 'Validation Failed',
}

// export type DownloadStatus =
//   | 'Queued'
//   | 'Downloading'
//   | 'Validating'
//   | 'Validated'
//   | 'Downloaded (No Checksum)'
//   | 'Error'
//   | 'Validation Failed'
