const ADMIN_TOKEN_KEY = 'admin_token'
const VOTER_ID_KEY = 'voter_id'

function apiUrl(path) {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const base = isLocal ? 'http://localhost:8787' : ''
  return `${base}${path}`
}

export function getVoterId() {
  let voterId = window.localStorage.getItem(VOTER_ID_KEY)
  if (!voterId) {
    voterId = crypto.randomUUID()
    window.localStorage.setItem(VOTER_ID_KEY, voterId)
  }
  return voterId
}

function buildHeaders(useAuth = false) {
  const headers = { 'Content-Type': 'application/json' }
  if (useAuth) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || 'Falha na requisicao')
  }
  return payload
}

export function isAdminLoggedIn() {
  return Boolean(window.localStorage.getItem(ADMIN_TOKEN_KEY))
}

export async function adminLogin(password) {
  const response = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ password }),
  })
  const payload = await parseResponse(response)
  window.localStorage.setItem(ADMIN_TOKEN_KEY, payload.token)
}

export function adminLogout() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export async function getAdminPolls() {
  const response = await fetch(apiUrl('/api/polls'), {
    headers: buildHeaders(true),
  })
  return parseResponse(response)
}

export async function createPoll(payload) {
  const response = await fetch(apiUrl('/api/polls'), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })
  return parseResponse(response)
}

export async function updatePoll(pollId, payload) {
  const response = await fetch(apiUrl(`/api/polls/${pollId}`), {
    method: 'PUT',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })
  return parseResponse(response)
}

export async function deletePoll(pollId) {
  const response = await fetch(apiUrl(`/api/polls/${pollId}`), {
    method: 'DELETE',
    headers: buildHeaders(true),
  })
  return parseResponse(response)
}

export async function getPoll(pollId) {
  const response = await fetch(apiUrl(`/api/polls/${pollId}`))
  return parseResponse(response)
}

export async function submitVote(pollId, payload) {
  const response = await fetch(apiUrl(`/api/polls/${pollId}/vote`), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ ...payload, voterId: getVoterId() }),
  })
  return parseResponse(response)
}
