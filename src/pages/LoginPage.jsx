import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function LoginPage() {
  const { isAuthenticated, isReady, initializationError, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isReady) return <p className="state-message" role="status">Checking your sign-in...</p>
  if (isAuthenticated) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email: email.trim(), password })
      const requestedPath = location.state?.from?.pathname
      const destination = typeof requestedPath === 'string'
        && requestedPath.startsWith('/')
        && !requestedPath.startsWith('//')
        ? requestedPath
        : '/'
      navigate(destination, { replace: true })
    } catch (reason) {
      setError(reason.message || 'Sign in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <h2 className="page-title">Welcome back</h2>
      <p className="auth-intro">Sign in to your GlowCart account.</p>
      {initializationError && <p className="form-error" role="alert">{initializationError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={72}
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>
        <button className="primary-button auth-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="auth-switch">New to GlowCart? <Link to="/register">Create an account</Link></p>
    </section>
  )
}
