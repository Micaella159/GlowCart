const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status)
  }

  if (response.status === 401) {
    localStorage.removeItem('glowcart-token')
    if (window.location.pathname !== '/login') window.location.assign('/login')
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
      error.message || defaultMessages[response.status] || 'The request could not be completed.',
      response.status,
      error.code,
      error.details,
      payload?.requestId
    )
  }

  return payload
}

export const getApiBaseUrl = () => API_BASE_URL
