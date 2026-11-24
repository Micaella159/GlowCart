export default function ProductSkeleton() {
  return (
    <div className="product-grid skeleton-grid" aria-label="Loading products" role="status">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-block skeleton-image" />
          <div className="skeleton-block skeleton-line" />
          <div className="skeleton-block skeleton-line short" />
          <span className="visually-hidden">Loading product {index + 1}</span>
        </div>
      ))}
    </div>
  )
}
