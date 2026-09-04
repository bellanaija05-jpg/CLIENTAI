import { Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import AppShell from './components/layout/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import SignUp from './pages/auth/SignUp.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import LeadCreate from './pages/LeadCreate.jsx'
import LeadEdit from './pages/LeadEdit.jsx'
import LeadDetail from './pages/LeadDetail.jsx'
import Pipeline from './pages/Pipeline.jsx'
import FollowUps from './pages/FollowUps.jsx'
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'

/**
 * Route table.
 *
 * Phase 0: public routes (landing + auth stubs).
 * Phase 1: AuthProvider wraps everything; protected pages live inside
 * ProtectedRoute.
 * Phase 3: /leads list, /leads/new create, /leads/:leadId/edit.
 * Phase 4: /leads/:leadId details (Stage 1), /pipeline (Stage 5),
 * /settings + shared AppShell navbar + NotFound catch-all (close-out).
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Authenticated routes, all sharing the app navbar */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/new" element={<LeadCreate />} />
            <Route path="/leads/:leadId/edit" element={<LeadEdit />} />
            <Route path="/leads/:leadId" element={<LeadDetail />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Anything else: friendly 404 instead of a blank page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
