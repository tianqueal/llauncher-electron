import { SettingsState } from '../config/settingsConfig'

export type SettingsErrors = Partial<Record<keyof SettingsState, string | null>>
