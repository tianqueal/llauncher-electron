import { settingsFields } from '../config/settingsFields';
import { SettingsState } from '../config/settingsConfig';
import { SettingsErrors } from '../types/SettingsErrors';
import { SettingFieldType } from '../types/SettingFieldConfig';

/**
 * Validates the settings object based on rules in settingsFields.
 * @param settings The settings object to validate.
 * @returns An object containing validation errors, if any.
 */
export default function validateSettings(
  settings: SettingsState,
): SettingsErrors {
  const errors: SettingsErrors = {};

  for (const field of settingsFields) {
    const value = settings[field.id];

    // Check required fields
    if (field.required) {
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        errors[field.id] = `${field.label} is required.`;
        continue; // Skip further validation if required check fails
      }
    }

    // --- Check Pattern Validation (only if value is not empty/null/undefined) ---
    if (
      field.validation?.pattern &&
      value !== null &&
      value !== undefined &&
      String(value) !== '' // Check against trimmed value
    ) {
      try {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          // Provide a generic error message, or customize based on field ID
          console.warn(
            `Validation failed for field ${field.id}: ${value} does not match pattern ${field.validation.pattern}`,
          );
          errors[field.id] = `${field.label} has an invalid format.`;
          continue; // Skip other validations if pattern fails
        }
      } catch (e) {
        console.error(
          `Invalid regex pattern for field ${field.id}: ${field.validation.pattern}`,
          e,
        );
        // Optionally set an error or just log it
      }
    }
    // --- End Pattern Validation ---

    // Check specific types and validation rules
    if (field.type === SettingFieldType.NUMBER) {
      const numValue = Number(value); // Convert potential string from input
      if (isNaN(numValue)) {
        // Allow empty string if NOT required, otherwise it's an error
        if (field.required || (typeof value === 'string' && value !== '')) {
          errors[field.id] = `${field.label} must be a valid number.`;
        }
      } else if (field.validation) {
        if (
          field.validation.min !== undefined &&
          numValue < field.validation.min
        ) {
          errors[field.id] =
            `${field.label} must be at least ${field.validation.min}.`;
        } else if (
          field.validation.max !== undefined &&
          numValue > field.validation.max
        ) {
          errors[field.id] =
            `${field.label} must be no more than ${field.validation.max}.`;
        }
      }
    }
    // Add more validation for other types if needed
  }

  // Specific cross-field validation (e.g., min memory <= max memory)
  if (
    !errors.memoryMinimum &&
    !errors.memoryMaximum &&
    settings.memoryMinimum > settings.memoryMaximum
  ) {
    errors.memoryMaximum =
      'Maximum Memory must be greater than or equal to Minimum Memory.';
  }

  return errors;
}
