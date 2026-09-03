import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth.js'
import Spinner from '../ui/Spinner.jsx'

/**
 * Gate for authenticated routes. Usage in App.jsx:
 *
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 * - Session still restoring → full-screen spinner (no login flash).
 * - No session → redirect to /login, remembering the originally
 *   requested location so login can send the user back.
 * - Session present → render the nested route via <Outlet />.
 */
export default function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Spinner fullScreen />
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
