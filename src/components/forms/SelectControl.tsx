import {
  Description,
  Label,
  Listbox,
  ListboxButton,
  ListboxOptions,
} from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';
import { ReactNode } from 'react';

export default function SelectControl({
  id,
  label,
  description,
  value,
  onChange,
  children,
}: {
  id?: string;
  label?: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Listbox value={value} onChange={onChange}>
      {label && (
        <Label htmlFor={id} className="text-sm/6 font-medium">
          {label}
        </Label>
      )}

      {description && (
        <Description className="text-sm/6 dark:text-white/50">
          {description}
        </Description>
      )}

      <div className="relative mt-2">
        <ListboxButton
          className={clsx(
            'grid w-full cursor-default grid-cols-1 rounded-md py-1.5 pr-2 pl-3 text-left sm:text-sm/6',
            'transition duration-150 ease-in-out',
            'focus:outline-none data-focus:ring-2 data-focus:ring-indigo-500 data-focus:outline-none dark:bg-white/5',
          )}
        >
          <span className="col-start-1 row-start-1 flex items-center gap-3 pr-6">
            <span className="block truncate">{value}</span>
          </span>
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-white/5 p-1 text-base shadow-lg ring-1 ring-black/5 backdrop-blur-md focus:outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm dark:bg-white/5"
        >
          {children}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
