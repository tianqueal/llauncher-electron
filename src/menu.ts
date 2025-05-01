import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'

export default function setMainMenu(menu: BrowserWindow) {
  const template: Array<MenuItemConstructorOptions> = [
    {
      label: app.name,
      submenu: [{ role: 'about' }, { role: 'quit' }],
    },
    {
      label: 'Theme',
      submenu: [
        {
          label: 'Light',
          click: () => {
            menu.webContents.send('update-theme', 'light')
          },
        },
        {
          label: 'Dark',
          click: () => {
            menu.webContents.send('update-theme', 'dark')
          },
        },
        {
          label: 'System',
          click: () => {
            menu.webContents.send('update-theme', 'light dark')
          },
        },
      ],
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
