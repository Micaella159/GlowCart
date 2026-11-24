import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../api/orders.js'
import ProductImage from '../components/ProductImage.jsx'

function formatPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `₱${amount.toFixed(2)}` : 'Price unavailable'
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    getOrders({ signal: controller.signal })
      .then(setOrders)
      .catch(reason => {
        if (reason.name !== 'AbortError') setError(reason.message || 'Order history could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="orders-page">
      <h2 className="page-title">My orders</h2>
      {loading && <p className="state-message" role="status">Loading your orders…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Orders you place will appear here.</p>
          <Link className="primary-button" to="/products">Browse products</Link>
        </div>
      )}
      {!loading && !error && orders.map(order => (
        <article className="order-card" key={order.id}>
          <Link className="order-card-link" to={`/orders/${encodeURIComponent(order.id)}`}>
            <p>Order {order.id}</p>
            <p className="order-status">
              {order.orderStatus} · Cash on Delivery · Payment {order.paymentStatus}
            </p>
            <div className="order-card-items">
              {order.items.map(item => (
                <div className="order-item" key={item.id}>
                  <ProductImage product={item} className="order-product-image" />
                  <div className="order-item-details">
                    <h3>{item.name}</h3>
                    <p>{item.quantity} × {formatPrice(item.unitPrice)}</p>
                  </div>
                  <strong>{formatPrice(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
            <div className="order-card-total">
              <span>{new Date(order.createdAt).toLocaleString()}</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </Link>
        </article>
      ))}
    </section>
  )
}
