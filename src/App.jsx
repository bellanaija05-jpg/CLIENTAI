import { Routes, Route } from 'react-router'
import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import SignUp from './pages/auth/SignUp.jsx'

/**
 * Route table.
 * Phase 0: public routes only. Protected app routes (dashboard, leads, ...)
 * are added in later phases behind a ProtectedRoute wrapper.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
    </Routes>
  )
}
