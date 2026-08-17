import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../api'
import StatusBadge from '../components/StatusBadge'

const STEPS = [
  { key: 'REGISTER', label: 'Registered' },
  { key: 'SANITIZE', label: 'Sanitized' },
  { key: 'VERIFY', label: 'Verify' },
  { key: 'CERTIFICATE', label: 'Certificate' }
]

function stepStateFor(status) {
  // Maps device status onto the 4-step rail
  switch (status) {
    case 'READY_TO_SANITIZE': return 1
    case 'SANITIZING':
    case 'VERIFICATION': return 2
    case 'VERIFIED': return 3
    case 'FAILED':
    case 'MANUAL_REVIEW': return 2.5 // failed mid-verify
    case 'CERTIFIED': return 4
    default: return 0
  }
}

export default function DeviceDetail() {
  const { deviceId } = useParams()
  const { token } = useAuth()

  const [device, setDevice] = useState(null)
  const [certificate, setCertificate] = useState(null)
  const [qr, setQr] = useState(null)
  const [audit, setAudit] = useState([])
  const [anchor, setAnchor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const devices = await api.listDevices(token)
      const found = devices.find(d => d.device_id === deviceId)
      if (!found) {
        setError('Device not found.')
        setLoading(false)
        return
      }
      setDevice(found)

      const auditData = await api.getDeviceAudit(token, deviceId)
      setAudit(auditData)

      if (found.status === 'CERTIFIED') {
        try {
          const cert = await api.getDeviceCertificate(token, deviceId)
          setCertificate(cert)
          const qrData = await api.getCertificateQr(token, deviceId)
          setQr(qrData)
        } catch {
          // certificate not ready yet, ignore
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not load device.')
    } finally {
      setLoading(false)
    }
  }, [token, deviceId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function runAction(fn) {
    setActionError('')
    setBusy(true)
    try {
      await fn()
      await loadAll()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAnchor() {
    setActionError('')
    setBusy(true)
    try {
      const a = await api.createAuditAnchor(token, deviceId)
      setAnchor(a)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.detail : 'Could not create audit anchor.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="panel"><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
  if (error) return <div className="panel"><div className="error-box">{error}</div></div>
  if (!device) return null

  const currentStep = stepStateFor(device.status)

  return (
    <div>

      <div className="panel">
        <div className="detail-header">
          <h2>{device.device_type} · {device.model}</h2>
          <StatusBadge status={device.status} />
        </div>
        <div className="detail-sub mono">{device.device_id} · {device.storage}</div>

        <div className="rail">
          {STEPS.map((s, i) => {
            const n = i + 1
            let cls = 'rail-step'
            if (device.status === 'FAILED' || device.status === 'MANUAL_REVIEW') {
              if (n < 3) cls += ' done'
              else if (n === 3) cls += ' failed'
            } else {
              if (n < currentStep) cls += ' done'
              else if (n === currentStep) cls += ' current'
            }
            return (
              <span key={s.key} style={{ display: 'contents' }}>
                <span className={cls}><span className="rail-dot" />{s.label}</span>
                {i < STEPS.length - 1 && <span className="rail-sep" />}
              </span>
            )
          })}
        </div>

        {actionError && <div className="error-box">{actionError}</div>}

        <div className="action-row">
          {device.status === 'READY_TO_SANITIZE' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => api.sanitizeDevice(token, deviceId))}>
              {busy ? <span className="spinner" /> : 'Start secure sanitization'}
            </button>
          )}

          {device.status === 'VERIFICATION' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => api.verifyDevice(token, deviceId))}>
              {busy ? <span className="spinner" /> : 'Run verification'}
            </button>
          )}

          {device.status === 'VERIFIED' && (
            <button className="btn btn-verified" disabled={busy} onClick={() => runAction(() => api.generateCertificate(token, deviceId))}>
              {busy ? <span className="spinner" /> : 'Generate certificate'}
            </button>
          )}

          {device.status === 'FAILED' && (
            <>
              <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => api.sanitizeDevice(token, deviceId))}>
                {busy ? <span className="spinner" /> : 'Retry sanitization'}
              </button>
              <span className="footnote" style={{ marginTop: 0 }}>Verification didn't pass — flagged for retry, never silently marked clean.</span>
            </>
          )}

          {device.status === 'CERTIFIED' && !anchor && (
            <button className="btn btn-ghost" disabled={busy} onClick={handleAnchor}>
              {busy ? <span className="spinner" /> : 'Anchor to blockchain audit log'}
            </button>
          )}
        </div>
      </div>

      {certificate && (
        <div className="panel">
          <div className="section-title">Verification Certificate</div>
          <div className="cert-box">
            {qr?.qr_code && (
              <div className="cert-qr">
                <img src={`data:image/png;base64,${qr.qr_code}`} width={110} height={110} alt="Certificate QR code" />
              </div>
            )}
            <div className="cert-info">
              <span className="cert-badge">✓ VERIFIED CLEAN</span>
              <h3>{certificate.certificate_id}</h3>
              <div className="cert-row"><span className="k">Method</span>{certificate.sanitization_method}</div>
              <div className="cert-row"><span className="k">Result</span>{certificate.verification_result} ({certificate.verification_percentage}%)</div>
              <div className="cert-row"><span className="k">Issued</span>{new Date(certificate.issued_at).toLocaleString()}</div>
              <div className="cert-row"><span className="k">Hash</span><span className="cert-hash mono">{certificate.certificate_hash}</span></div>
            </div>
          </div>
          <p className="footnote">Anyone can scan this QR to independently verify the wipe at <span className="mono">{qr?.verification_url}</span></p>
        </div>
      )}

      {anchor && (
        <div className="panel">
          <div className="section-title">Blockchain Audit Anchor</div>
          <div className="anchor-box">
            <div className="ab-label">{anchor.blockchain_status} · anchored {new Date(anchor.anchored_at).toLocaleString()}</div>
            <div className="ab-hash mono">0x{anchor.anchor_hash}</div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="section-title">Audit Trail</div>
        {audit.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No events yet.</p>
        ) : (
          <ul className="audit-list">
            {audit.map(ev => (
              <li key={ev.id} className="audit-item">
                <div className="ae-type">{ev.event_type.replaceAll('_', ' ')}</div>
                <div className="ae-desc">{ev.description}</div>
                <div className="ae-time">{new Date(ev.timestamp).toLocaleString()}</div>
                <div className="ae-hash mono">0x{ev.event_hash}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
