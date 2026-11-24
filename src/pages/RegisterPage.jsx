import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function RegisterPage() {
  const { isAuthenticated, isReady, register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isReady) return <p className="state-message" role="status">Checking your sign-in...</p>
  if (isAuthenticated && !success) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password })
      setPassword('')
      setSuccess(true)
    } catch (reason) {
      setError(reason.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <h2 className="page-title">Create your account</h2>
      <p className="auth-intro">Save your GlowCart account for your beauty essentials.</p>
      {success && <p className="form-success" role="status">Your account was created and you are signed in.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            autoComplete="name"
            maxLength={80}
            required
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          <small>Use at least 8 characters.</small>
        </label>
        <button className="primary-button auth-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      {success
        ? <p className="auth-switch"><Link to="/">Continue to GlowCart</Link></p>
        : <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>}
    </section>
  )
}
