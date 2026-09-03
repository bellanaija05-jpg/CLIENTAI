import { createContext } from 'react'

/**
 * The auth context object, in its own plain-JS module (no component)
 * so that Fast Refresh is not affected. The provider component lives in
 * AuthProvider.jsx; the hook lives in hooks/useAuth.js.
 */
export const AuthContext = createContext(null)
