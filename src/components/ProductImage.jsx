import { useState } from 'react'
import { getProductImage, getProductName } from '../api/products.js'

const FALLBACK_IMAGE = '/products/product-image-unavailable.svg'

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return ''

  try {
    const url = new URL(imageUrl, `${window.location.origin}/`)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export default function ProductImage({ product, className = '', loading = 'lazy' }) {
  const imageUrl = resolveImageUrl(getProductImage(product))
  const fallbackUrl = resolveImageUrl(FALLBACK_IMAGE)
  const [failure, setFailure] = useState({ imageUrl: '', source: '' })
  const imageFailed = failure.imageUrl === imageUrl && failure.source === imageUrl
  const fallbackFailed = failure.imageUrl === imageUrl && failure.source === fallbackUrl

  if (!imageUrl || fallbackFailed || (imageFailed && imageUrl === fallbackUrl)) {
    return (
      <div
        className={`product-image-empty ${className}`}
        role="img"
        aria-label={`${getProductName(product)} image unavailable`}
      />
    )
  }

  const usingFallback = imageFailed
  return (
    <img
      className={className}
      src={usingFallback ? fallbackUrl : imageUrl}
      alt={getProductName(product)}
      loading={loading}
      onError={() => setFailure({
        imageUrl,
        source: usingFallback ? fallbackUrl : imageUrl,
      })}
    />
  )
}
