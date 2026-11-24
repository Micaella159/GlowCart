import { request } from './client.js'

function readSession(response) {
  const session = response?.data
  if (!session?.token || !session.user?.id || !session.user?.email) {
    throw new Error('The authentication API returned an unexpected response.')
  }
  return session
}

export async function register(details) {
  return readSession(await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  }))
}

export async function login(credentials) {
  return readSession(await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }))
}

export async function getCurrentUser() {
  const response = await request('/auth/me')
  const user = response?.data?.user
  if (!user?.id || !user?.email) {
    throw new Error('The authentication API returned an unexpected user response.')
  }
  return user
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' })
}
