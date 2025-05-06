import {
  Field,
  Label,
  Description,
  Input,
  Switch,
  Textarea,
} from '@headlessui/react';
import clsx from 'clsx';
import { SettingsFieldProps } from '../types/SettingsFieldProps';
import { SettingFieldType } from '../types/SettingFieldConfig';
import SelectControl from './forms/SelectControl';
import SelectControlOption from './forms/SelectControlOption';

export default function SettingsField({
  config,
  value,
  onChange,
  error,
}: SettingsFieldProps & { error?: string | null }) {
  const {
    id,
    label,
    description,
    type,
    validation,
    placeholder,
    required,
    options,
  } = config;

  const commonInputClasses = clsx(
    'mt-1 block w-full rounded-lg border-none dark:bg-white/5 py-1.5 px-3 text-sm/6',
    // Add transitions for ring and color
    'transition duration-150 ease-in-out',
    // Default focus state using Headless UI's data attribute: remove outline, add indigo ring
    'focus:outline-none data-focus:outline-none data-focus:ring-2 data-focus:ring-indigo-500',
    // Error state: add red ring
    error && 'ring-1 ring-red-500 dark:ring-red-600',
    // Error + Focus state: ensure error ring color persists/overrides focus color
    error && 'data-focus:ring-red-500 dark:data-focus:ring-red-600',
  );

  const renderInput = () => {
    switch (type) {
      case SettingFieldType.TEXT:
      case SettingFieldType.PASSWORD:
        return (
          <Input
            id={id}
            name={id}
            type={type}
            placeholder={placeholder}
            required={required}
            value={value as string}
            onChange={(e) => onChange(id, e.target.value)}
            className={commonInputClasses}
          />
        );
      case SettingFieldType.NUMBER:
        return (
          <Input
            id={id}
            name={id}
            type="number"
            placeholder={placeholder}
            required={required}
            value={value as number | string} // Allow string for intermediate input
            onChange={(e) =>
              onChange(
                id,
                e.target.value === '' ? '' : Number(e.target.value), // Keep empty string or convert to number
              )
            }
            min={validation?.min}
            max={validation?.max}
            className={commonInputClasses}
          />
        );
      case SettingFieldType.SWITCH:
        return (
          <Switch
            id={id}
            name={id}
            checked={value as boolean}
            onChange={(checked) => onChange(id, checked)}
            className={clsx(
              'group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-600 transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900',
              'data-checked:bg-indigo-600',
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                'pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                'group-data-checked:translate-x-5',
              )}
            />
          </Switch>
        );
      case SettingFieldType.TEXTAREA:
        return (
          <Textarea
            id={id}
            name={id}
            placeholder={placeholder}
            required={required}
            value={value as string}
            onChange={(e) => onChange(id, e.target.value)}
            rows={3} // Default rows, adjust as needed
            className={clsx(commonInputClasses, 'resize-none')}
          />
        );
      case SettingFieldType.SELECT:
        return (
          <SelectControl
            id={id}
            value={value as string}
            onChange={(selectedValue) => onChange(id, selectedValue)}
          >
            {options?.map((option) => (
              <SelectControlOption
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </SelectControl>
        );
      default:
        return null;
    }
  };

  return (
    <Field className="flex h-full flex-col">
      {' '}
      {/* Ensure vertical layout */}
      <div className="flex items-center justify-between">
        {' '}
        {/* Keep label/switch aligned */}
        <Label htmlFor={id} className="text-sm/6 font-medium">
          {label}
        </Label>
        {type === SettingFieldType.SWITCH && renderInput()}
      </div>
      {description && (
        <Description className="flex-1 text-sm/6 dark:text-white/50">
          {description}
        </Description>
      )}
      {type !== SettingFieldType.SWITCH && renderInput()}
      {/* Display error message or reserve space */}
      <p
        className={clsx(
          'mt-1 h-4 text-xs', // Add fixed height (h-4 is usually enough for text-xs)
          error
            ? 'text-red-500 dark:text-red-400' // Apply color only if error exists
            : 'text-transparent', // Make text transparent if no error
        )}
      >
        {error || '\u00A0'} {/* Render error or non-breaking space */}
      </p>
    </Field>
  );
}
