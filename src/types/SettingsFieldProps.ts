import { SettingFieldConfig } from './SettingFieldConfig';

export interface SettingsFieldProps {
  config: SettingFieldConfig;
  value: string | number | boolean;
  onChange: (id: string, value: string | number | boolean) => void;
}
