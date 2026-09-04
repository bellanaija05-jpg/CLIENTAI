import { Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import SignUp from './pages/auth/SignUp.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import LeadCreate from './pages/LeadCreate.jsx'
import LeadEdit from './pages/LeadEdit.jsx'
import LeadDetail from './pages/LeadDetail.jsx'

/**
 * Route table.
 *
 * Phase 0: public routes (landing + auth stubs).
 * Phase 1: AuthProvider wraps everything; protected pages live inside
 * ProtectedRoute.
 * Phase 3: /leads list, /leads/new create, /leads/:leadId/edit.
 * Phase 4: /leads/:leadId details (Stage 1, view only).
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
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/new" element={<LeadCreate />} />
          <Route path="/leads/:leadId/edit" element={<LeadEdit />} />
          <Route path="/leads/:leadId" element={<LeadDetail />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
