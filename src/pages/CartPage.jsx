import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../hooks/useCart.js'
import { getProductId, getProductName, getProductPrice } from '../api/products.js'
import ProductImage from '../components/ProductImage.jsx'
import { useNetworkStatus } from '../hooks/useNetworkStatus.js'

export default function CartPage() {
  const { items, update, remove } = useCart()
  const { isOnline } = useNetworkStatus()
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + getProductPrice(item.product) * item.quantity, 0)

  return (
    <section className="cart-page">
      <h2 className="page-title">My Shopping Cart</h2>
      {items.length === 0 ? (
        <div className="empty-state">
          <h3>Your cart is empty</h3>
          <p>Find something beautiful to add!</p>
          <Link className="primary-button" to="/products">Start Shopping</Link>
        </div>
      ) : (
        <>
          {items.map(({ product, quantity: count }) => {
            const id = getProductId(product)
            return (
              <article className="cart-item" key={id}>
                <ProductImage product={product} className="cart-product-image" />
                <div className="cart-details">
                  <h3>{getProductName(product)}</h3>
                  <strong>₱{getProductPrice(product).toFixed(2)}</strong>
                  <div className="quantity-controls">
                    <button aria-label={`Decrease ${getProductName(product)} quantity`} onClick={() => update(id, count - 1)}><Minus size={15} /></button>
                    <span>{count}</span>
                    <button aria-label={`Increase ${getProductName(product)} quantity`} onClick={() => update(id, count + 1)}><Plus size={15} /></button>
                  </div>
                </div>
                <button className="remove-button" aria-label={`Remove ${getProductName(product)}`} onClick={() => remove(id)}><Trash2 size={18} /></button>
              </article>
            )
          })}
          <div className="cart-summary">
            <div><span>Items</span><strong>{quantity}</strong></div>
            <div><span>Estimated subtotal</span><strong>₱{subtotal.toFixed(2)}</strong></div>
            <p className="notice">Final price, stock, shipping, and payment must be confirmed by the backend.</p>
            <Link
              className={isOnline ? 'checkout-button' : 'checkout-button disabled'}
              aria-disabled={!isOnline}
              onClick={event => {
                if (!isOnline) event.preventDefault()
              }}
              to={isOnline ? '/checkout' : '/cart'}
            >Proceed to Checkout</Link>
          </div>
        </>
      )}
    </section>
  )
}
