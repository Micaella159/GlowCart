import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, LogOut, Search, ShoppingBag, User, Sparkles } from 'lucide-react'
import InstallButton from '../InstallButton.jsx'
import OfflineBanner from './OfflineBanner.jsx'
import { useCart } from '../hooks/useCart.js'
import { useAuth } from '../hooks/useAuth.js'

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'Shop', icon: Search },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/login', label: 'Account', icon: User },
]

export default function AppLayout() {
  const { count } = useCart()
  const { isAuthenticated, logout, user } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
    } catch (error) {
      setLogoutError(error.message || 'Sign out could not be completed.')
    }
    navigate('/login', { replace: true })
  }

  const items = navItems.map(item => item.label === 'Account' && isAuthenticated
    ? { ...item, to: '/orders', label: 'Orders' }
    : item)

  return (
    <div className="app">
      <header className="top-header">
        <Link className="brand-link" to="/">
          <p className="welcome">Welcome to</p>
          <h1>GlowCart <Sparkles size={20} /></h1>
        </Link>
        <div className="header-actions">
          {isAuthenticated && (
            <button
              className="logout-button"
              type="button"
              aria-label="Sign out"
              title={`Sign out ${user.name}`}
              onClick={handleLogout}
            ><LogOut size={18} /></button>
          )}
          <InstallButton />
        </div>
      </header>
      <OfflineBanner />
      {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
      <main className="page-content"><Outlet /></main>
      <footer className="app-footer">GlowCart · Your Beauty, Your Glow</footer>
      <nav className="bottom-nav" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            <Icon size={21} />
            <span>{label}</span>
            {label === 'Cart' && count > 0 && <span className="cart-badge">{count}</span>}
          </NavLink>
        ))}
        <NavLink className="nav-item assistant-nav" to="/ai-assistant">
          <Sparkles size={20} />
          <span>Beauty AI</span>
        </NavLink>
      </nav>
    </div>
  )
}
