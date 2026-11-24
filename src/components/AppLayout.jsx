import { Link, NavLink, Outlet } from 'react-router-dom'
import { Home, Search, ShoppingBag, User, Sparkles } from 'lucide-react'
import InstallButton from '../InstallButton.jsx'
import OfflineBanner from './OfflineBanner.jsx'
import { useCart } from '../hooks/useCart.js'

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'Shop', icon: Search },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/login', label: 'Account', icon: User },
]

export default function AppLayout() {
  const { count } = useCart()

  return (
    <div className="app">
      <header className="top-header">
        <Link className="brand-link" to="/">
          <p className="welcome">Welcome to</p>
          <h1>GlowCart <Sparkles size={20} /></h1>
        </Link>
        <InstallButton />
      </header>
      <OfflineBanner />
      <main className="page-content"><Outlet /></main>
      <footer className="app-footer">GlowCart · Your Beauty, Your Glow</footer>
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon, end }) => (
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
