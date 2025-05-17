export interface PatchNotes {
  version: number;
  entries: Array<PatchNotesEntry>; // Renamed Entry to avoid potential naming conflicts
}

export interface PatchNotesEntry {
  title: string;
  version: string;
  type: PatchNotesType;
  image: PatchNotesImage;
  contentPath: string;
  id: string; // Unique ID for the patch note entry itself
  date: string; // ISO Date string
  shortText: string;
}

export interface PatchNotesImage {
  title: string;
  url: string; // The image URL we want
}

export enum PatchNotesType {
  Release = 'release',
  Snapshot = 'snapshot',
  Experiment = 'experiment', // Added based on potential data
}
