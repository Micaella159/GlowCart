import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getOrder } from '../api/orders.js'
import ProductImage from '../components/ProductImage.jsx'

function formatPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `₱${amount.toFixed(2)}` : 'Price unavailable'
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const initialOrder = location.state?.order?.id === id ? location.state.order : null
  const [record, setRecord] = useState(() => ({
    id: initialOrder?.id || '',
    order: initialOrder,
    error: '',
  }))
  const isCurrentRecord = record.id === id
  const order = isCurrentRecord ? record.order : null
  const error = isCurrentRecord ? record.error : ''
  const loading = !isCurrentRecord

  useEffect(() => {
    if (record.id === id) return undefined

    const controller = new AbortController()
    getOrder(id, { signal: controller.signal })
      .then(result => setRecord({ id, order: result, error: '' }))
      .catch(reason => {
        if (reason.name !== 'AbortError') {
          setRecord({ id, order: null, error: reason.message || 'Order details could not be loaded.' })
        }
      })
    return () => controller.abort()
  }, [id, record.id])

  if (loading) return <p className="state-message" role="status">Loading order details…</p>
  if (error) return <div className="error-message" role="alert"><p>{error}</p><Link to="/orders">Back to orders</Link></div>
  if (!order) {
    return (
      <div className="empty-state">
        <h2>Order unavailable</h2>
        <p>This order could not be found.</p>
        <Link to="/orders">Back to orders</Link>
      </div>
    )
  }

  const confirmed = location.state?.confirmed && order.id === id
  return (
    <section className="order-detail-page">
      {confirmed && (
        <div className="order-confirmation" role="status">
          <h2>Order placed</h2>
          <p>Your Cash on Delivery order was created successfully. Payment is still pending until collected.</p>
        </div>
      )}
      <h2 className="page-title">Order details</h2>
      <article className="order-detail-card">
        <p>Order {order.id}</p>
        <p className="order-status">
          {order.orderStatus} · {order.paymentMethod} · Payment {order.paymentStatus}
        </p>
        <p className="order-address">
          <strong>Deliver to:</strong> {order.customer.name}<br />
          {order.customer.phone}<br />
          {order.customer.address}
        </p>
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
        <div className="order-summary-row">
          <span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong>
        </div>
        <div className="order-summary-row">
          <span>Total due on delivery</span><strong>{formatPrice(order.total)}</strong>
        </div>
        <p className="notice">Payment status remains pending until the COD payment is collected.</p>
      </article>
      <Link to="/orders">View all orders</Link>
    </section>
  )
}
