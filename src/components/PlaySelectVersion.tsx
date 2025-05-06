import { Dispatch, Fragment, SetStateAction } from 'react';
import SelectControlOption from './forms/SelectControlOption';
import SelectControl from './forms/SelectControl';

export default function PlaySelectVersion({
  versionOptionsGrouped,
  selectedVersion,
  setSelectedVersion,
}: {
  versionOptionsGrouped: {
    groups: Array<{
      label: string;
      options: Array<{
        value: string;
        label: string;
      }>;
    }>;
    total: number;
  };
  selectedVersion: string;
  setSelectedVersion: Dispatch<SetStateAction<string>>;
}) {
  return (
    <SelectControl value={selectedVersion} onChange={setSelectedVersion}>
      {versionOptionsGrouped.groups.map((group) => (
        // Use Fragment with a key to group label and options
        <Fragment key={group.label}>
          {/* Render a non-interactive label for the group */}
          <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase select-none dark:text-white/50">
            {group.label}
          </div>
          {/* Map the options within the group */}
          {group.options.map((option) => (
            <SelectControlOption
              key={option.value}
              value={option.value}
              label={option.label}
            />
          ))}
        </Fragment>
      ))}
    </SelectControl>
  );
}
