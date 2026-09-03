import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.js'

/**
 * Access authentication state from anywhere in the app:
 * const { session, user, profile, isLoading, signOut } = useAuth()
 *
 * Kept in its own module (per the react-refresh/only-export-components
 * rule) and to match the project's folder conventions (src/hooks).
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
