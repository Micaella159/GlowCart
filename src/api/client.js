const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? '/api/v1'
  : 'https://glowcart-api-slg5.onrender.com/api/v1'

function normalizeApiBaseUrl(value) {
  const configuredUrl = value.trim().replace(/\/+$/, '')
  const baseUrl = configuredUrl || DEFAULT_API_BASE_URL
  const withoutProductsEndpoint = baseUrl.replace(/\/api\/v1\/products$/i, '/api/v1')
  const deduplicatedBase = withoutProductsEndpoint.replace(/(?:\/api\/v1){2,}$/i, '/api/v1')

  return /\/api\/v1$/i.test(deduplicatedBase)
    ? deduplicatedBase
    : `${deduplicatedBase}/api/v1`
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '')

export class ApiError extends Error {
  constructor(message, status, code, details, requestId) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = localStorage.getItem('glowcart-token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    const requestPath = path.startsWith('/') ? path : `/${path}`
    const apiPath = requestPath.replace(/^\/api\/v1(?=\/|$)/i, '') || '/'
    response = await fetch(`${API_BASE_URL}${apiPath}`, {
      ...options,
      headers,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError(
      'GlowCart could not reach the server. Check your connection and try again.',
      0,
      'API_UNAVAILABLE'
    )
  }

  const responseText = await response.text()
  let payload = null
  if (responseText.trim()) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      const message = response.ok
        ? 'The server returned invalid JSON. Check that VITE_API_BASE_URL points to the API.'
        : `The API returned HTTP ${response.status} with a non-JSON response. Check the API URL and endpoint.`
      throw new ApiError(message, response.status, 'INVALID_JSON')
    }
  } else if (response.ok) {
    throw new ApiError('The server returned an empty response instead of JSON.', response.status, 'EMPTY_RESPONSE')
  }

  if (response.status === 401) {
    localStorage.removeItem('glowcart-token')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }

  if (response.ok && (!payload || typeof payload !== 'object' || Array.isArray(payload))) {
    throw new ApiError('The server returned JSON in an unexpected format.', response.status, 'INVALID_RESPONSE')
  }

  if (!response.ok || payload.success === false) {
    const error = payload?.error || {}
    const defaultMessages = {
      401: 'Please sign in to continue.',
      403: 'You do not have permission to perform this action.',
      409: 'The request conflicts with current stock or order status.',
      422: 'Some submitted information is invalid.',
      503: 'This service is temporarily unavailable.',
    }
    throw new ApiError(
      error.message || defaultMessages[response.status] || `The request failed with HTTP ${response.status}.`,
      response.status,
      error.code,
      error.details,
      payload?.requestId
    )
  }

  return payload
}

export const getApiBaseUrl = () => API_BASE_URL
