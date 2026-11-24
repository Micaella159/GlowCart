import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getProduct, getProductImage, getProductName, getProductPrice } from '../api/products.js'
import { useCart } from '../hooks/useCart.js'

export default function DetailPage() {
  const { id } = useParams()
  const { add } = useCart()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    getProduct(id, { signal: controller.signal })
      .then(setProduct)
      .catch(reason => {
        if (reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id])

  if (error) return <div className="error-message" role="alert">{error}</div>
  if (loading) return <p className="state-message" role="status">Loading product...</p>
  if (!product) {
    return (
      <div className="empty-state">
        <h2>Product unavailable</h2>
        <p>This product may not be in the current API catalog.</p>
        <Link to="/products">Back to products</Link>
      </div>
    )
  }

  const image = getProductImage(product)
  return (
    <article className="detail-card">
      {image && <img className="detail-image" src={image} alt={getProductName(product)} />}
      <p>{product.category || 'Beauty'}</p>
      <h2>{getProductName(product)}</h2>
      <strong>
        {Number.isFinite(getProductPrice(product))
          ? `₱${getProductPrice(product).toFixed(2)}`
          : 'Price unavailable'}
      </strong>
      {product.description && <p>{product.description}</p>}
      <button className="primary-button" type="button" onClick={() => add(product)}>Add to Cart</button>
    </article>
  )
}
