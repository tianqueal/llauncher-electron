const environments = {
  get MANIFEST_URL(): string | undefined {
    return process.env.MANIFEST_URL;
  },
  get ASSET_BASE_URL(): string | undefined {
    return process.env.ASSET_BASE_URL;
  },
  get PATCH_NOTES_BASE_URL(): string | undefined {
    return process.env.PATCH_NOTES_BASE_URL;
  },
  get PATCH_NOTES_URL(): string | undefined {
    return process.env.PATCH_NOTES_URL;
  },
};

export default environments;
