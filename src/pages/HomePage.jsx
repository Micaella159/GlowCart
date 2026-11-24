import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getProducts } from '../api/products.js'
import { useNetworkStatus } from '../hooks/useNetworkStatus.js'
import ProductCatalog from '../components/ProductCatalog.jsx'
import ProductSkeleton from '../components/ProductSkeleton.jsx'

export default function HomePage({ catalogMode = false }) {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    const controller = new AbortController()
    getProducts({ signal: controller.signal })
      .then(setProducts)
      .catch(reason => {
        if (reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const categories = useMemo(() => [
    'All',
    ...new Set(products.map(product => product.category || product.categoryName).filter(Boolean)),
  ], [products])
  const filtered = products.filter(product => {
    const name = `${product.name ?? ''} ${product.category ?? product.categoryName ?? ''}`.toLowerCase()
    return name.includes(query.trim().toLowerCase())
      && (category === 'All' || (product.category || product.categoryName) === category)
  })

  return (
    <>
      <section className="search-box">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search beauty products"
          placeholder="Search beauty products..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </section>
      {!catalogMode && <section className="hero">
        <div>
          <span>YOUR BEAUTY, YOUR GLOW</span>
          <h2>Feel beautiful.<br />Glow naturally.</h2>
          <p>Discover your everyday beauty essentials.</p>
          <Link className="hero-action" to="/products">Shop Now</Link>
        </div>
        <div className="hero-icon" aria-hidden="true">🌷</div>
      </section>}
      {!catalogMode && <section className="section-heading">
        <div><p>CURATED FOR YOU</p><h2>Popular Products</h2></div>
        <Link to="/products">See all</Link>
      </section>}
      {products.length > 0 && (
        <div className="category-filters" aria-label="Filter by category">
          {categories.map(item => (
            <button
              type="button"
              key={item}
              className={category === item ? 'category-chip selected' : 'category-chip'}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >{item}</button>
          ))}
        </div>
      )}
      {loading && <ProductSkeleton />}
      {!loading && error && (
        <div className="error-message" role="alert">
          <h3>Products are unavailable</h3>
          <p>{isOnline ? error : 'Connect to the internet to load the catalog. Previously cached catalog data may appear when available.'}</p>
          <p>The configured API must provide <code>GET /api/v1/products</code>.</p>
        </div>
      )}
      {!loading && !error && <ProductCatalog products={filtered} />}
    </>
  )
}
