import { Link } from 'react-router-dom'
import { getProductId, getProductImage, getProductName, getProductPrice } from '../api/products.js'
import { useCart } from '../hooks/useCart.js'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const id = getProductId(product)
  const image = getProductImage(product)
  const price = getProductPrice(product)

  return (
    <article className="product-card">
      <Link className="product-link" to={`/products/${encodeURIComponent(id)}`}>
        <div className="product-image">
          {image
            ? <img src={image} alt={getProductName(product)} loading="lazy" />
            : <span aria-hidden="true">🌷</span>}
        </div>
        <div className="product-info">
          <p>{product.category || product.categoryName || 'Beauty'}</p>
          <h3>{getProductName(product)}</h3>
          <strong>{Number.isFinite(price) ? `₱${price.toFixed(2)}` : 'Price unavailable'}</strong>
        </div>
      </Link>
      <button className="add-button" type="button" onClick={() => add(product)}>
        Add to Cart
      </button>
    </article>
  )
}
