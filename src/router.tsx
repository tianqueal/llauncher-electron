import { createBrowserRouter } from 'react-router'
import Layout from './layouts/Layout'
import PlayView from './views/PlayView'
import VersionsView from './views/VersionsView'
import SettingsView from './views/SettingsView'
import AboutView from './views/AboutView'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <PlayView />,
      },
      {
        path: 'versions',
        element: <VersionsView />,
      },
      {
        path: 'settings',
        element: <SettingsView />,
      },
      {
        path: 'about',
        element: <AboutView />,
      },
    ],
  },
])
