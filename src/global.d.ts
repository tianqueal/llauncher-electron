import { IpcRendererEvent } from 'electron'

declare global {
  interface Window {
    electron: {
      onUpdateTheme: (
        callback: (event: IpcRendererEvent, theme: string) => void
      ) => void
      // Other methods can be added here
    }
  }
}

export {}
