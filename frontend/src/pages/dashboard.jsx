import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../api'
import StatusBadge from '../components/StatusBadge'

const DEVICE_TYPES = ['Laptop', 'Smartphone', 'Tablet', 'External Hard Drive', 'Desktop']

export default function Dashboard() {
  const { token } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [deviceId, setDeviceId] = useState('')
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0])
  const [model, setModel] = useState('')
  const [storage, setStorage] = useState('')

  async function loadDevices() {
    setLoading(true)
    setError('')
    try {
      const data = await api.listDevices(token)
      setDevices(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not load devices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAddDevice(e) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await api.registerDevice(token, {
        device_id: deviceId,
        device_type: deviceType,
        model,
        storage
      })
      setDeviceId('')
      setModel('')
      setStorage('')
      setShowForm(false)
      await loadDevices()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : 'Could not register device.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel">
      <div className="dash-header">
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Register a device'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddDevice} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
          {formError && <div className="error-box">{formError}</div>}

          <label htmlFor="deviceId">Device ID</label>
          <input id="deviceId" type="text" placeholder="e.g. DEV-001" value={deviceId} onChange={e => setDeviceId(e.target.value)} required />

          <label htmlFor="deviceType">Device type</label>
          <select id="deviceType" value={deviceType} onChange={e => setDeviceType(e.target.value)}>
            {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label htmlFor="model">Model</label>
          <input id="model" type="text" placeholder="e.g. IdeaPad Slim 5" value={model} onChange={e => setModel(e.target.value)} required />

          <label htmlFor="storage">Storage</label>
          <input id="storage" type="text" placeholder="e.g. 256GB SSD" value={storage} onChange={e => setStorage(e.target.value)} required />

          <button type="submit" className="btn btn-verified" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Register device'}
          </button>
        </form>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Loading devices…</p>
      ) : devices.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">📱</div>
          <p>No devices yet. Register one to start the verified wipe flow.</p>
        </div>
      ) : (
        <div className="device-grid">
          {devices.map(d => (
            <Link key={d.device_id} to={`/devices/${d.device_id}`} className="device-card">
              <div className="dc-type">{d.device_type}</div>
              <div className="dc-meta">{d.model} · {d.storage}</div>
              <StatusBadge status={d.status} />
              <div className="dc-id mono">{d.device_id}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
