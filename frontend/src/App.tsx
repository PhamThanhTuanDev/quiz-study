import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { createAppRoutes } from './routes'

const router = createBrowserRouter(createAppRoutes())

export default function App() {
  return <RouterProvider router={router} />
}
