const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const data = await response.json()
      message = data.detail || data.message || message
    } catch {
      const text = await response.text()
      if (text) {
        message = text
      }
    }

    throw new Error(message)
  }

  return response.json()
}

export function checkHealth() {
  return request('/health')
    .then(() => true)
    .catch(() => false)
}

export function getTestDomains() {
  return request('/api/test-domains')
}

export function scanDomains(domains) {
  return request('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ domains }),
  })
}

export function getScanHistory(limit = 8) {
  return request(`/api/history?limit=${limit}`)
}
