import { createBrowserRouter } from 'react-router'
import HelloWorld from './HelloWorld'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HelloWorld />,
  },
])
