import { useEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Emissions from './pages/Emissions'
import Forecast from './pages/Forecast'
import Simulator from './pages/Simulator'
import Regulatory from './pages/Regulatory'
import Settings from './pages/Settings'
import Tasks from './pages/Tasks'

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser)

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/emissions"
          element={
            <ProtectedRoute>
              <Layout>
                <Emissions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/forecast"
          element={
            <ProtectedRoute>
              <Layout>
                <Forecast />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulator"
          element={
            <ProtectedRoute>
              <Layout>
                <Simulator />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/regulatory"
          element={
            <ProtectedRoute>
              <Layout>
                <Regulatory />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
