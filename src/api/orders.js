import { request } from './client.js'

export async function createOrder(payload, idempotencyKey) {
  const response = await request('/checkout', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  })
  const order = response?.data?.order
  if (!order?.id || !Array.isArray(order.items)) {
    throw new Error('The checkout API returned an unexpected order response.')
  }
  return order
}

export async function getOrders({ signal } = {}) {
  const response = await request('/orders', { signal })
  const orders = response?.data?.orders
  if (!Array.isArray(orders)) {
    throw new Error('The orders API returned an unexpected response.')
  }
  return orders
}

export async function getOrder(id, { signal } = {}) {
  const response = await request(`/orders/${encodeURIComponent(id)}`, { signal })
  const order = response?.data?.order
  if (!order?.id || !Array.isArray(order.items)) {
    throw new Error('The order API returned an unexpected response.')
  }
  return order
}
