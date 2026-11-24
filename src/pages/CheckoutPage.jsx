import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createOrder } from '../api/orders.js'
import ProductImage from '../components/ProductImage.jsx'
import { getProductId, getProductName, getProductPrice } from '../api/products.js'
import { useAuth } from '../hooks/useAuth.js'
import { useCart } from '../hooks/useCart.js'
import { useNetworkStatus } from '../hooks/useNetworkStatus.js'

function formatPrice(value) {
  return Number.isFinite(value) ? `₱${value.toFixed(2)}` : 'Price unavailable'
}

export default function CheckoutPage() {
  const { user } = useAuth()
  const { items, clear } = useCart()
  const { isOnline } = useNetworkStatus()
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const idempotency = useRef({ fingerprint: '', key: '' })
  const subtotal = items.reduce((sum, item) => {
    const price = getProductPrice(item.product)
    return Number.isFinite(price) ? sum + price * item.quantity : sum
  }, 0)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!isOnline) {
      setError('Connect to the internet before placing your COD order.')
      return
    }
    if (items.length === 0) {
      setError('Your cart is empty.')
      return
    }

    const payload = {
      customer: { name: customerName.trim(), phone: phone.trim(), address: address.trim() },
      paymentMethod: 'COD',
      items: items.map(({ product, quantity }) => ({
        productId: getProductId(product),
        quantity,
      })),
    }
    const fingerprint = JSON.stringify(payload)
    if (idempotency.current.fingerprint !== fingerprint) {
      if (!globalThis.crypto?.randomUUID) {
        setError('Secure checkout is unavailable in this browser. Use an up-to-date browser over HTTPS.')
        return
      }
      idempotency.current = { fingerprint, key: globalThis.crypto.randomUUID() }
    }

    setLoading(true)
    try {
      const order = await createOrder(payload, idempotency.current.key)
      clear()
      navigate(`/orders/${encodeURIComponent(order.id)}`, {
        replace: true,
        state: { confirmed: true, order },
      })
    } catch (reason) {
      setError(reason.message || 'Checkout failed. Your cart has not been cleared.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h2>Nothing to check out</h2>
        <p>Your cart is empty. Add products before placing an order.</p>
        <Link className="primary-button" to="/products">Browse products</Link>
      </section>
    )
  }

  return (
    <section className="checkout-page">
      <h2 className="page-title">Cash on Delivery checkout</h2>
      <form className="checkout-form" onSubmit={handleSubmit}>
        <div className="checkout-fields">
          <label>
            Customer name
            <input
              autoComplete="name"
              maxLength={80}
              required
              value={customerName}
              onChange={event => setCustomerName(event.target.value)}
            />
          </label>
          <label>
            Phone number
            <input
              type="tel"
              autoComplete="tel"
              maxLength={20}
              required
              value={phone}
              onChange={event => setPhone(event.target.value)}
            />
          </label>
          <label>
            Complete delivery address
            <textarea
              autoComplete="street-address"
              maxLength={500}
              minLength={10}
              required
              value={address}
              onChange={event => setAddress(event.target.value)}
            />
          </label>
        </div>

        <fieldset className="checkout-fields">
          <legend>Payment method</legend>
          <label className="payment-choice">
            <input type="radio" name="paymentMethod" value="COD" checked readOnly />
            Cash on Delivery (COD)
          </label>
        </fieldset>

        <section className="order-summary" aria-label="Order summary">
          <h3>Order summary</h3>
          {items.map(({ product, quantity }) => {
            const price = getProductPrice(product)
            return (
              <div className="checkout-item" key={getProductId(product)}>
                <ProductImage product={product} className="checkout-product-image" />
                <div className="checkout-item-details">
                  <h3>{getProductName(product)}</h3>
                  <p>{quantity} × {formatPrice(price)}</p>
                </div>
                <strong>{formatPrice(Number.isFinite(price) ? price * quantity : Number.NaN)}</strong>
              </div>
            )
          })}
          <div className="order-summary-row">
            <span>Subtotal</span><strong>{formatPrice(subtotal)}</strong>
          </div>
          <div className="order-summary-row">
            <span>Total due on delivery</span><strong>{formatPrice(subtotal)}</strong>
          </div>
          <p className="notice">No delivery fee is configured. The backend recalculates the total using current Neon prices.</p>
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        {!isOnline && <p className="form-error" role="status">You are offline. Checkout is unavailable until you reconnect.</p>}
        <button className="primary-button auth-submit" type="submit" disabled={loading || !isOnline}>
          {loading ? 'Placing order…' : `Place COD order · ${formatPrice(subtotal)}`}
        </button>
      </form>
    </section>
  )
}
