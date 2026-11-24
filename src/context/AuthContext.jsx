import { useMemo, useState } from 'react'
import { AuthContext } from './auth.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('glowcart-token'))
  const [user, setUser] = useState(null)

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token),
    setSession(sessionToken, sessionUser) {
      localStorage.setItem('glowcart-token', sessionToken)
      setToken(sessionToken)
      setUser(sessionUser)
    },
    logout() {
      localStorage.removeItem('glowcart-token')
      setToken(null)
      setUser(null)
    },
  }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
