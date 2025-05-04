import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/16/solid'
import { CheckIcon } from '@heroicons/react/20/solid'
import { Dispatch, Fragment, SetStateAction } from 'react'

function PlaySelectVersionOption({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <ListboxOption
      key={value}
      value={value}
      className="group rounded-md relative cursor-default py-2 pr-9 pl-3 select-none data-focus:bg-white/10 dark:data-focus:text-white data-focus:outline-hidden"
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
  )
}

export default function PlaySelectVersion({
  versionOptionsGrouped,
  selectedVersion,
  setSelectedVersion,
}: {
  versionOptionsGrouped: {
    groups: Array<{
      label: string
      options: Array<{
        value: string
        label: string
      }>
    }>
    total: number
  }
  selectedVersion: string
  setSelectedVersion: Dispatch<SetStateAction<string>>
}) {
  return (
    <Listbox value={selectedVersion} onChange={setSelectedVersion}>
      {/* <Label className="text-sm/6 font-medium">Select a version</Label>
      <Description className="text-sm/6 dark:text-white/50">
        This is the version of the game that will be run.
      </Description> */}
      <div className="relative mt-2">
        <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md dark:bg-white/5 py-1.5 pr-2 pl-3 text-left focus:outline-2 focus:-outline-offset-2 focus:outline-white/25 sm:text-sm/6">
          <span className="col-start-1 row-start-1 flex items-center gap-3 pr-6">
            <span className="block truncate">{selectedVersion}</span>
          </span>
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md dark:bg-white/5 backdrop-blur-md p-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm border border-white/5"
        >
          {versionOptionsGrouped.groups.map((group) => (
            // Use Fragment with a key to group label and options
            <Fragment key={group.label}>
              {/* Render a non-interactive label for the group */}
              <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase dark:text-white/50 select-none">
                {group.label}
              </div>
              {/* Map the options within the group */}
              {group.options.map((option) => (
                <PlaySelectVersionOption
                  key={option.value} // Add unique key here
                  value={option.value}
                  label={option.label}
                />
              ))}
            </Fragment>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
