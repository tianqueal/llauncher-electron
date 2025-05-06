export interface AssetIndexDetails {
  objects: { [key: string]: AssetObject };
  map_to_resources?: boolean; // For older versions
  virtual?: boolean; // For older versions
}

export interface AssetObject {
  hash: string;
  size: number;
}
