const environments = {
  get VITE_PATCH_NOTES_BASE_URL(): string | undefined {
    return import.meta.env.VITE_PATCH_NOTES_BASE_URL;
  },
};

export default environments;
