import { SettingsFieldProps } from '../types/SettingsFieldProps'
import {
  Checkbox,
  Description,
  Field,
  Input,
  Label,
  Select,
  Switch,
  Textarea,
} from '@headlessui/react'
import clsx from 'clsx'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { SettingFieldType } from '../types/SettingFieldConfig'

const inputClasses = clsx(
  'mt-3 block w-full rounded-lg border-none dark:bg-white/5 px-3 py-1.5 text-sm/6',
  'focus:not-data-focus:outline-none data-focus:outline-2 data-focus:-outline-offset-2 dark:data-focus:outline-white/25'
)

const selectClasses = clsx(inputClasses, 'appearance-none', 'dark:*:text-black')

export default function SettingsField({
  config,
  value,
  onChange,
}: SettingsFieldProps) {
  const { id, label, description, placeholder, type, options, validation } =
    config

  const handleChange = (v: string | number | boolean) => {
    const targetValue =
      type === 'number'
        ? v === ''
          ? '' // Allow empty string temporarily for number inputs
          : parseFloat(String(v)) // Parse number after converting to string
        : v
    onChange(id, targetValue)
  }

  // Input validation props (for number and potentially text/textarea)
  const inputProps: {
    min?: number
    max?: number
    pattern?: string
    step?: string
  } = {}

  if (type === 'number') {
    if (validation?.min !== undefined) inputProps.min = validation.min
    if (validation?.max !== undefined) inputProps.max = validation.max
    inputProps.step = 'any' // Allow decimals if needed, or set specific step
  }
  if (validation?.pattern) {
    inputProps.pattern = validation.pattern
  }

  return (
    <Field className="m-0">
      <div className="flex flex-col h-full">
        <Label className="text-sm/6 font-medium">{label}</Label>
        {description && (
          <Description className="text-sm/6 dark:text-white/50 flex-1">
            {description}
          </Description>
        )}

        {/* Conditional Rendering based on type */}
        {type === SettingFieldType.SELECT && options && (
          <div className="relative">
            <Select
              className={selectClasses}
              name={id}
              value={String(value)}
              onChange={(e) => handleChange(e.target.value)}
              aria-label={label}
            >
              {options.map((option) => (
                <option key={option} value={option.toLowerCase()}>
                  {option}
                </option>
              ))}
            </Select>
            <ChevronDownIcon
              className="group pointer-events-none absolute top-5 right-2.5 size-4 dark:fill-white/60"
              aria-hidden="true"
            />
          </div>
        )}

        {(type === SettingFieldType.TEXT ||
          type === SettingFieldType.NUMBER) && (
          <Input
            className={inputClasses}
            type={type}
            name={id}
            placeholder={placeholder}
            value={value as string | number}
            onChange={(e) => handleChange(e.target.value)}
            aria-label={label}
            {...inputProps} // Spread validation props
          />
        )}

        {/* Textarea */}
        {type === SettingFieldType.TEXTAREA && (
          <Textarea
            className={clsx(
              inputClasses,
              'resize-none' // Prevent resizing
            )}
            name={id}
            placeholder={placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            aria-label={label}
            rows={3} // Adjust rows as needed
          />
        )}

        {/* Checkbox */}
        {type === SettingFieldType.CHECKBOX && (
          <Checkbox
            className="mt-3 group size-6 rounded-md dark:bg-white/10 p-1 ring-1 dark:ring-white/15 ring-inset focus:not-data-focus:outline-none dark:data-checked:bg-white data-focus:outline data-focus:outline-offset-2 dark:data-focus:outline-white"
            name={id}
            checked={Boolean(value)}
            onChange={(bool) => handleChange(bool)}
            aria-label={label}
          >
            <CheckIcon className="hidden size-4 dark:fill-black group-data-checked:block" />
          </Checkbox>
        )}

        {/* Switch */}
        {type === SettingFieldType.SWITCH && (
          <Switch
            name={id}
            checked={Boolean(value)}
            onChange={(bool) => handleChange(bool)}
            // Replaced dark:data-checked:bg-white/10 with data-checked:bg-green-500
            className="mt-3 group relative flex h-7 w-14 cursor-pointer rounded-full dark:bg-white/10 p-1 ease-in-out focus:not-data-focus:outline-none data-checked:bg-green-500 data-focus:outline dark:data-focus:outline-white transition-colors duration-200"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none inline-block size-5 translate-x-0 rounded-full dark:bg-white shadow-lg ring-0 transition duration-200 ease-in-out group-data-checked:translate-x-7"
            />
          </Switch>
        )}
      </div>
    </Field>
  )
}
