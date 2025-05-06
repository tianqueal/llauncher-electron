export interface SettingFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export enum SettingFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  TEXTAREA = 'textarea',
  CHECKBOX = 'checkbox',
  SWITCH = 'switch',
}

export interface SettingFieldConfig {
  id: string;
  label: string;
  description: string;
  type: SettingFieldType;
  options?: Array<string>;
  placeholder?: string;
  required?: boolean;
  validation?: SettingFieldValidation;
}
