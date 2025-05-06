import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { useState } from 'react';
import { VersionOption } from '../types/VersionOption';
import FormButton from './FormButton';

export default function SelectVersion({
  versionOptions,
  handleInstall,
  disabled = false,
}: {
  versionOptions: Array<VersionOption>;
  handleInstall: (versionOption: VersionOption) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filteredVersionOptions =
    query === ''
      ? versionOptions
      : versionOptions.filter((versionOption) => {
          return versionOption.label
            .toLowerCase()
            .includes(query.toLowerCase());
        });

  return (
    <section className="flex items-center gap-2">
      <Combobox
        value={selected}
        onChange={(value) => setSelected(value)}
        onClose={() => setQuery('')}
        disabled={disabled}
      >
        <div className="relative">
          <ComboboxInput<VersionOption>
            className={clsx(
              'w-full rounded-lg border-none py-1.5 pr-8 pl-3 text-sm/6 dark:bg-white/5',
              'focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 dark:data-focus:outline-white/25',
            )}
            displayValue={(versionOption) => versionOption?.label}
            placeholder="Install another version..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <ComboboxButton className="group absolute inset-y-0 right-0 px-2.5">
            <ChevronDownIcon className="size-4 dark:fill-white/60 dark:group-data-hover:fill-white" />
          </ComboboxButton>
        </div>

        <ComboboxOptions
          anchor="bottom"
          transition
          className={clsx(
            'w-(--input-width) rounded-xl border p-1 [--anchor-gap:--spacing(1)] empty:invisible dark:border-white/5 dark:bg-white/5',
            'backdrop-blur-sm transition duration-100 ease-in data-leave:data-closed:opacity-0',
          )}
        >
          {filteredVersionOptions.map((versionOption) => (
            <ComboboxOption
              key={versionOption.value}
              value={versionOption}
              className="group flex cursor-default items-center gap-2 rounded-lg px-3 py-1.5 select-none dark:data-focus:bg-white/10"
            >
              <CheckIcon className="invisible size-4 group-data-selected:visible" />
              <div className="text-sm/6">{versionOption.label}</div>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>

      <FormButton
        variant="primary"
        onClick={() => handleInstall(selected)}
        disabled={disabled || !selected}
        className="inline-flex items-center gap-2"
      >
        <ArrowDownTrayIcon className="size-4" />
        <span className="sr-only">Install New Version</span>
      </FormButton>
    </section>
  );
}
