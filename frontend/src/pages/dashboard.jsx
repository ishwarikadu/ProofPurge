import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
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
  const [deviceIdentifier, setDeviceIdentifier] = useState('')
  const [deviceIdentifierType, setDeviceIdentifierType] = useState('')

  const [deviceId, setDeviceId] = useState('')
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0])
  const [model, setModel] = useState('')
  const [storage, setStorage] = useState('')
  const certifiedCount = devices.filter(
  d => d.status === 'CERTIFIED'
).length

const securedCount = devices.filter(
  d => d.status === 'VERIFIED' || d.status === 'CERTIFIED'
).length

const proofPoints = certifiedCount * 100

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
        storage,
        device_identifier: deviceIdentifier,
        device_identifier_type: deviceIdentifierType,
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
    <div className="dashboard">
<section className="welcome-section">
  <div>
    <p className="eyebrow">YOUR PROOFPURGE ACCOUNT</p>
    <h2>
      Your devices.
      <br />
      Your proof.
    </h2>
    <p className="welcome-copy">
      Secure your data before your device gets a second life.
    </p>
  </div>

  <button
    className="btn btn-primary register-main-btn"
    onClick={() => setShowForm(s => !s)}
  >
    {showForm ? 'Cancel' : '+ Register a device'}
  </button>
</section>
<section className="dashboard-stats">

  <div className="stat-card">
    <span className="stat-label">DEVICES SECURED</span>
    <strong>{securedCount}</strong>
    <span className="stat-description">
      Successfully sanitized & verified
    </span>
  </div>

  <div className="stat-card">
    <span className="stat-label">CERTIFIED</span>
    <strong>{certifiedCount}</strong>
    <span className="stat-description">
      With independently verifiable proof
    </span>
  </div>

  <div className="stat-card reward-stat">
    <div className="reward-top">
      <span className="stat-label">PROOFPOINTS</span>
      <span className="reward-symbol">✦</span>
    </div>

    <strong>{proofPoints}</strong>

    <span className="stat-description">
      Earned from certified devices
    </span>
  </div>

</section>

<section className="reward-banner">

  <div className="reward-icon">✦</div>

  <div className="reward-content">
    <span className="reward-kicker">
      REWARD YOUR RESPONSIBLE CHOICE
    </span>

    <h3>
      Turn secure disposal into rewards.
    </h3>

    <p>
      Earn ProofPoints when your devices are successfully
      sanitized and certified. Use them for future
      recycling and partner benefits.
    </p>
  </div>

    <Link to="/rewards" className="btn btn-ghost reward-btn">
      View rewards
    </Link>

</section>


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
          <div className="form-group">
  <label>Identity type</label>

  <select
    value={deviceIdentifierType}
    onChange={(e) => setDeviceIdentifierType(e.target.value)}
  >
    <option value="">Select identity type</option>
    <option value="SERIAL_NUMBER">Serial Number</option>
    <option value="IMEI">IMEI</option>
    <option value="UUID">Device UUID</option>
  </select>
</div>

<div className="form-group">
  <label>Device identity</label>

  <input
    type="text"
    value={deviceIdentifier}
    onChange={(e) => setDeviceIdentifier(e.target.value)}
    placeholder="Enter device serial number / IMEI / UUID"
  />
</div>

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
          <p>No devices yet. Register one to start the verified wipe flow.</p>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR DEVICES</p>
              <h3>Device library</h3>
            </div>

            <span className="device-count">
              {devices.length} device{devices.length !== 1 ? 's' : ''}
           </span>
         </div>

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
        </>
      )}
    </div>
  )
}

