import { request } from './client.js'

const localProductImages = {
  'hydrating face serum': '/products/pink%20serum.jpg',
  'rose glow lip tint': '/products/matte%20liptint.jpg',
  'daily moisturizer': '/products/moisturizer.jpg',
  'soft blush palette': '/products/trio%20palette.jpg',
  'soft touch makeup brush set': '/products/makeup%20brush.jpg',
  'sunscreen': '/products/sunscreen.jpg',
}

export async function getProducts({ signal } = {}) {
  const response = await request('/products', { signal })
  const products = response?.data?.products ?? response?.data

  if (!Array.isArray(products)) {
    throw new Error('The products API returned an unexpected response format.')
  }
  if (products.some(product => !product || typeof product !== 'object'
    || (product.id == null && product._id == null))) {
    throw new Error('Each product must include an id or _id field.')
  }

  return products
}

export async function getProduct(id, { signal } = {}) {
  const response = await request(`/products/${encodeURIComponent(id)}`, { signal })
  const product = response.data?.product ?? response.data

  if (!product || typeof product !== 'object'
    || (product.id == null && product._id == null)) {
    throw new Error('The product API returned an unexpected response format.')
  }

  return product
}

export function getProductId(product) {
  return product.id ?? product._id
}

export function getProductName(product) {
  return product.name ?? product.title ?? 'Unnamed product'
}

export function getProductPrice(product) {
  return Number(product.price)
}

export function getProductImage(product) {
  const imageUrl = product.imageUrl ?? product.image_url ?? product.image
  if (typeof imageUrl === 'string' && imageUrl.trim()) return imageUrl.trim()

  const productName = getProductName(product).trim().toLowerCase()
  return localProductImages[productName] || ''
}
