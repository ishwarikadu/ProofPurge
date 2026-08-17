import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
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

  const [verification, setVerification] = useState(null)
  const [device, setDevice] = useState(null)
  const [certificate, setCertificate] = useState(null)
  const [qr, setQr] = useState(null)
  const [audit, setAudit] = useState([])
  const [anchor, setAnchor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const auditEvents = device?.audit_events || []

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
    const result = await fn()

console.log("VERIFICATION API RESPONSE:", result)

if (result?.verification_percentage !== undefined) {
  setVerification(result)
}

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
        <div className="process-panel">

  {device.status === 'READY_TO_SANITIZE' && (
    <>
      <p className="process-kicker">STEP 1 · SECURE</p>
      <h3>Ready for secure sanitization</h3>
      <p>
        ProofPurge will sanitize the device before its data
        can move into a new lifecycle.
      </p>
    </>
  )}

  {device.status === 'SANITIZING' && (
    <>
      <p className="process-kicker">STEP 2 · SANITIZING</p>
      <h3>Secure sanitization in progress</h3>
      <p>
        The device is currently being processed.
        Do not disconnect or interrupt the sanitization process.
      </p>

      <div className="process-progress">
        <div className="process-progress-bar" />
      </div>

      <span className="process-note">
        Sanitization process running…
      </span>
    </>
  )}

  {device.status === 'VERIFICATION' && (
    <>
      <p className="process-kicker">STEP 3 · VERIFY</p>
      <h3>Sanitization complete. Verify the result.</h3>
      <p>
        ProofPurge will now check whether the sanitization
        result meets the required verification criteria.
      </p>
    </>
  )}

  {device.status === 'VERIFIED' && (
    <>
      <p className="process-kicker">STEP 4 · VERIFIED</p>
      <h3>Sanitization successfully verified.</h3>
      <p>
        The device has passed verification and is ready
        for its tamper-evident proof certificate.
      </p>
    </>
  )}

  {device.status === 'FAILED' && (
    <>
      <p className="process-kicker process-failed">VERIFICATION FAILED</p>
      <h3>The sanitization result needs another attempt.</h3>
      <p>
        ProofPurge did not silently mark this device as clean.
        You can retry the sanitization process.
      </p>
    </>
  )}

  {device.status === 'CERTIFIED' && (
    <>
      <p className="process-kicker process-success">PROOF GENERATED</p>
      <h3>This device has verified proof.</h3>
      <p>
        The sanitization result has been certified and
        can be independently verified using its certificate.
      </p>
    </>
  )}

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
        {verification && (
  <div className="verification-result">

    <div className="verification-result-header">

      <div>
        <p className="process-kicker">
          VERIFICATION RESULT
        </p>

        <h3>
          {String(verification.result).toUpperCase() === 'VERIFIED'
            ? 'Sanitization verified'
            : 'Verification failed'}
        </h3>
      </div>

      <div
        className={`verification-score ${
          String(verification.result).toUpperCase() === 'VERIFIED'
            ? 'verification-pass'
            : 'verification-fail'
        }`}
      >
        {verification.verification_percentage ?? 0}%
      </div>

    </div>


    <div className="verification-metrics">

      <div>
        <span>Sectors checked</span>
        <strong>
          {verification.sectors_checked ?? 0}
        </strong>
      </div>

      <div>
        <span>Sectors verified</span>
        <strong>
          {verification.sectors_verified ?? 0}
        </strong>
      </div>

      <div>
        <span>Result</span>
        <strong>
          {verification.result ?? 'UNKNOWN'}
        </strong>
      </div>

    </div>

  </div>
)}
</div>

      {certificate && (
  <div className="panel">

    <div className="certificate-panel">

      <div className="certificate-header">

        <div>
          <p className="process-kicker">PROOFPURGE CERTIFICATE</p>

          <h2>Verified Sanitization</h2>

          <p>
            Independent proof that this device completed
            the ProofPurge sanitization and verification process.
          </p>
        </div>

        <div className="certificate-status">
          <span>✓</span>
          VERIFIED
        </div>

      </div>

      <div className="certificate-main">

        <div className="certificate-details">

          <div className="certificate-field">
            <span>Certificate ID</span>
            <strong className="mono">
              {certificate.certificate_id}
            </strong>
          </div>

          <div className="certificate-field">
            <span>Device</span>
            <strong>
              {device.device_type} · {device.model}
            </strong>
          </div>

          <div className="certificate-field">
            <span>Device ID</span>
            <strong className="mono">
              {device.device_id}
            </strong>
          </div>

          <div className="certificate-field">
            <span>Storage</span>
            <strong>{device.storage}</strong>
          </div>

          <div className="certificate-field">
            <span>Sanitization method</span>
            <strong>
              {certificate.sanitization_method}
            </strong>
          </div>

          <div className="certificate-field">
            <span>Verification</span>
            <strong>
              {certificate.verification_percentage}% ·{' '}
              {certificate.verification_result}
            </strong>
          </div>

          <div className="certificate-field certificate-field-wide">
            <span>Certificate hash · SHA-256</span>

            <strong className="mono certificate-hash">
              {certificate.certificate_hash}
            </strong>
          </div>

          <div className="certificate-field">
            <span>Issued</span>
            <strong>
              {new Date(
                certificate.issued_at
              ).toLocaleString()}
            </strong>
          </div>

        </div>

        {qr?.qr_code && (
          <div className="certificate-qr">

            <img
              src={`data:image/png;base64,${qr.qr_code}`}
              alt="Certificate verification QR"
            />

            <strong>Scan to verify</strong>

            <span>
              Anyone can independently verify
              this certificate.
            </span>

          </div>
        )}

      </div>

      <div className="certificate-footer">

        <div>
          <span className="certificate-integrity-dot" />
          Audit trail recorded
        </div>

        <div>
          Public verification available
        </div>

      </div>

    </div>

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
    <section className="audit-section">
  <div className="section-header">
    <div>
      <p className="eyebrow">PROOF HISTORY</p>
      <h2>Audit Timeline</h2>
      <p className="section-description">
        A chronological record of every action performed on this device.
      </p>
    </div>

    {auditEvents?.length > 0 && (
      <span className="audit-count">
        {auditEvents.length} events
      </span>
    )}
  </div>

  {!auditEvents || auditEvents.length === 0 ? (
    <div className="audit-empty">
      <span className="audit-empty-icon">○</span>
      <div>
        <strong>No audit events yet</strong>
        <p>
          Device activity will appear here as the sanitization process progresses.
        </p>
      </div>
    </div>
  ) : (
    <div className="audit-timeline">
      {auditEvents.map((event, index) => {
        const eventInfo = {
          DEVICE_REGISTERED: {
            title: 'Device registered',
            description: 'Device identity recorded',
            icon: '✓',
          },

          SANITIZATION_STARTED: {
            title: 'Sanitization started',
            description: 'Secure erase process initiated',
            icon: '↻',
          },

          SANITIZATION_COMPLETED: {
            title: 'Sanitization completed',
            description: 'Device sanitization completed successfully',
            icon: '✓',
          },

          VERIFICATION_COMPLETED: {
            title: 'Verification completed',
            description: event.description || 'Device verification completed',
            icon: '✓',
          },

          CERTIFICATE_ISSUED: {
            title: 'Certificate issued',
            description: 'Independent sanitization certificate generated',
            icon: '◇',
          },

          AUDIT_ANCHORED: {
            title: 'Audit anchored',
            description: 'Audit record anchored for integrity',
            icon: '◆',
          },
        }[event.event_type] || {
          title: event.event_type,
          description: event.description,
          icon: '•',
        }

        return (
          <div
            className={`audit-event ${
              index === auditEvents.length - 1 ? 'audit-event-last' : ''
            }`}
            key={event.id}
          >
            <div className="audit-marker">
              <span>{eventInfo.icon}</span>
            </div>

            <div className="audit-event-content">
              <div className="audit-event-top">
                <div>
                  <strong>{eventInfo.title}</strong>
                  <p>{eventInfo.description}</p>
                </div>

                <time>{event.timestamp}</time>
              </div>

              {event.event_hash && (
                <details className="audit-hash">
                  <summary>View integrity hash</summary>
                  <code>{event.event_hash}</code>
                </details>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )}
</section>
    </div>
</div>
  )
}
