import { VersionType } from '../types/VersionManifest';

const remoteOptions: {
  [key: string]: {
    label: string;
    options: {
      types: Array<VersionType>;
      maxCount?: number | undefined;
    };
  };
} = {
  recommended: {
    label: 'Recommended Releases',
    options: {
      types: [VersionType.Release],
      maxCount: 20,
    },
  },
  allVersions: {
    label: 'All Available Versions',
    options: {
      types: [],
      maxCount: undefined,
    },
  },
};

export default remoteOptions;
