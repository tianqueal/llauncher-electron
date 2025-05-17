import { SettingsState } from './SettingsState';

export type SettingsErrors = Partial<
  Record<keyof SettingsState, string | null>
>;
