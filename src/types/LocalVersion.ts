export interface LocalVersion {
  id: string
  name: string
  status: LocalVersionStatus
  path: string
  sizeBytes?: number
}

export enum LocalVersionStatus {
  Downloaded = 'Downloaded',
  Corrupted = 'Corrupted',
  NeedsUpdate = 'Needs Update',
  Unknown = 'Unknown',
}
