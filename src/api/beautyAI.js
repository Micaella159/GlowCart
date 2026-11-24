import { request } from './client.js'

export async function discoverProducts(prompt, { limit = 3, signal } = {}) {
  const response = await request('/ai/discovery', {
    method: 'POST',
    body: JSON.stringify({ prompt, limit }),
    signal,
  })
  const recommendations = response?.data?.recommendations

  if (!Array.isArray(recommendations)
    || recommendations.some(item => !item?.product?.id || typeof item.reason !== 'string')) {
    throw new Error('The Beauty AI API returned an unexpected response.')
  }

  return recommendations
}
