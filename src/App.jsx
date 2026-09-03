import { Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import SignUp from './pages/auth/SignUp.jsx'
import Dashboard from './pages/Dashboard.jsx'

/**
 * Route table.
 *
 * Phase 0: public routes (landing + auth stubs).
 * Phase 1: AuthProvider wraps everything; /dashboard is the first
 * protected route. All future app pages go inside ProtectedRoute.
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Authenticated routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
