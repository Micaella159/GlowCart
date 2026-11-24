import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth.js'
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../api/auth.js'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('glowcart-token'))
  const [user, setUser] = useState(null)
  const [isReady, setIsReady] = useState(() => !localStorage.getItem('glowcart-token'))
  const [initializationError, setInitializationError] = useState('')

  useEffect(() => {
    const savedToken = localStorage.getItem('glowcart-token')
    if (!savedToken) return undefined

    let active = true
    getCurrentUser()
      .then(authenticatedUser => {
        if (!active) return
        setToken(savedToken)
        setUser(authenticatedUser)
        setInitializationError('')
      })
      .catch(error => {
        if (!active) return
        if (error.status === 401) {
          localStorage.removeItem('glowcart-token')
          setToken(null)
        } else {
          setInitializationError(error.message)
        }
        setUser(null)
      })
      .finally(() => {
        if (active) setIsReady(true)
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({
    token,
    user,
    isReady,
    initializationError,
    isAuthenticated: Boolean(token && user),
    async login(credentials) {
      const session = await loginRequest(credentials)
      localStorage.setItem('glowcart-token', session.token)
      setToken(session.token)
      setUser(session.user)
      setInitializationError('')
      return session.user
    },
    async register(details) {
      const session = await registerRequest(details)
      localStorage.setItem('glowcart-token', session.token)
      setToken(session.token)
      setUser(session.user)
      setInitializationError('')
      return session.user
    },
    async logout() {
      try {
        await logoutRequest()
      } finally {
        localStorage.removeItem('glowcart-token')
        setToken(null)
        setUser(null)
        setInitializationError('')
      }
    },
  }), [token, user, isReady, initializationError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
