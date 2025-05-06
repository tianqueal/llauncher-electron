import { ListboxOption } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/16/solid';

export default function SelectControlOption({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <ListboxOption
      key={value}
      value={value}
      className="group relative cursor-default rounded-md py-2 pr-9 pl-3 select-none data-focus:bg-white/10 data-focus:outline-hidden dark:data-focus:text-white"
    >
      <span className="absolute inset-y-0 left-0 flex items-center pl-2 group-not-data-selected:hidden dark:group-data-focus:text-white">
        <CheckIcon aria-hidden="true" className="size-5" />
      </span>

      <div className="flex items-center">
        <span className="ml-6 block truncate font-normal group-data-selected:font-semibold">
          {label}
        </span>
      </div>
    </ListboxOption>
  );
}
