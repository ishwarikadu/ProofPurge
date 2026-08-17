const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed with status ${status}`)
    this.status = status
    this.detail = detail
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const detail = data?.detail || res.statusText
    throw new ApiError(res.status, detail)
  }

  return data
}

export const api = {
  // Auth
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  // Devices
  listDevices: (token) =>
    request('/devices', { token }),

  registerDevice: (token, device) =>
    request('/devices', { method: 'POST', body: device, token }),

  sanitizeDevice: (token, deviceId) =>
    request(`/devices/${deviceId}/sanitize`, { method: 'POST', token }),

  verifyDevice: (token, deviceId) =>
    request(`/devices/${deviceId}/verify`, { method: 'POST', token }),

  generateCertificate: (token, deviceId) =>
    request(`/devices/${deviceId}/certificate`, { method: 'POST', token }),

  getDeviceCertificate: (token, deviceId) =>
    request(`/devices/${deviceId}/certificate`, { token }),

  getCertificateQr: (token, deviceId) =>
    request(`/devices/${deviceId}/certificate/qr`, { token }),

  getDeviceAudit: (token, deviceId) =>
    request(`/devices/${deviceId}/audit`, { token }),

  createAuditAnchor: (token, deviceId) =>
    request(`/devices/${deviceId}/audit/anchor`, { method: 'POST', token }),

  // Public certificate verification (no auth needed)
  verifyCertificate: (certificateId) =>
    request(`/verify-certificate/${certificateId}`)
}

export { ApiError }
export async function verifyCertificate(certificateId) {
  const response = await fetch(
    `${API_BASE}/verify-certificate/${certificateId}`
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))

    throw new Error(
      data.detail || 'Certificate could not be verified'
    )
  }

  return response.json()
}
