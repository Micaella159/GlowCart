import { Link } from 'react-router-dom'
import { useNetworkStatus } from '../hooks/useNetworkStatus.js'

const copy = {
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
      {kind === 'success' && <Link to="/orders">Check orders</Link>}
    </section>
  )
}
