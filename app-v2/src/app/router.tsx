import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { AppLayout } from './AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { NotesPage } from '../pages/NotesPage'
import { SettingsPage } from '../pages/SettingsPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/notes', element: <NotesPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
