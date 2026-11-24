import ProductCard from './ProductCard.jsx'

export default function ProductCatalog({ products }) {
  if (!products.length) {
    return (
      <div className="empty-results">
        <h3>No products found</h3>
        <p>Try adjusting your search or category.</p>
      </div>
    )
  }

  return (
    <section className="product-grid" aria-label="Products">
      {products.map((product, index) => (
        <ProductCard key={product.id ?? product._id ?? index} product={product} />
      ))}
    </section>
  )
}
