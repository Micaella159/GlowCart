import { Link } from 'react-router-dom'
import { useNetworkStatus } from '../hooks/useNetworkStatus.js'

const copy = {
  checkout: ['Checkout unavailable', 'The supplied backend setup exposes only GET /api/v1. No checkout or payment endpoint is documented, so this app will not submit a fake order.'],
  orders: ['Order history unavailable', 'Order retrieval requires a documented orders endpoint and authenticated account.'],
  admin: ['Admin tools unavailable', 'This account does not have access to an implemented admin interface.'],
  success: ['Payment status pending verification', 'A return URL alone does not confirm payment. The app needs an order-status API before it can show an authoritative result.'],
  cancelled: ['Payment cancelled', 'No payment session was created because a checkout endpoint is not available.'],
}

export default function UnavailablePage({ kind }) {
  const { isOnline } = useNetworkStatus()
  const [title, message] = copy[kind] || ['Not available', 'This feature is not configured.']

  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{!isOnline ? 'You are offline. ' : ''}{message}</p>
      {kind === 'checkout' && <Link to="/cart">Return to cart</Link>}
      {kind === 'success' && <Link to="/orders">Check orders</Link>}
    </section>
  )
}
