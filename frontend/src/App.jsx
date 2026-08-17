import { Routes, Route } from 'react-router-dom'
import Topbar from './components/Topbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DeviceDetail from './pages/DeviceDetail'
import Rewards from './pages/Rewards'
import Impact from './pages/Impact'
import PublicVerify from './pages/PublicVerify'

export default function App() {
  return (
    <div className="app-shell">
      <Topbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
         path="/rewards"
         element={
            <ProtectedRoute>
              <Rewards />
            </ProtectedRoute>
          }

        />
        <Route
         path="/impact"
        element={
          <ProtectedRoute>
          <Impact />
          </ProtectedRoute>
        }
        />
        <Route
          path="/verify-certificate/:certificateId"
          element={<PublicVerify />}
        />
        <Route
          path="/devices/:deviceId"
          element={
            <ProtectedRoute>
              <DeviceDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
