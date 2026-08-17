import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { api, ApiError } from '../api'

const DEVICE_TYPES = [
  'Laptop',
  'Smartphone',
  'Tablet',
  'External Hard Drive',
  'Desktop'
]

export default function B2BDashboard() {
  const { token } = useAuth()
  const fileInputRef = useRef(null)

  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkError, setBulkError] = useState('')

  const [showRegister, setShowRegister] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const [deviceId, setDeviceId] = useState('')
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0])
  const [model, setModel] = useState('')
  const [storage, setStorage] = useState('')

  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')

  const [auditCount, setAuditCount] = useState(0)

  async function loadDevices() {
    setLoading(true)

    try {
      const data = await api.listDevices(token)
      setDevices(data)
      setSelected([])

      let totalAuditEvents = 0

      for (const device of data) {
        try {
          const events = await api.getDeviceAudit(
            token,
            device.device_id
          )

          totalAuditEvents += events.length
        } catch {
          // Keep dashboard usable even if one audit request fails.
        }
      }

      setAuditCount(totalAuditEvents)
    } catch (err) {
      console.error(err)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [token])

  const total = devices.length

  const certified = devices.filter(
    d => d.status === 'CERTIFIED'
  ).length

  const ready = devices.filter(
    d => d.status === 'READY_TO_SANITIZE'
  ).length

  const sanitizing = devices.filter(
    d => d.status === 'SANITIZING'
  ).length

  const verifying = devices.filter(
    d => d.status === 'VERIFICATION'
  ).length

  const failed = devices.filter(
    d => d.status === 'FAILED'
  ).length

  const toggleDevice = (id) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(deviceId => deviceId !== id)
        : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selected.length === devices.length) {
      setSelected([])
    } else {
      setSelected(devices.map(d => d.device_id))
    }
  }

  const runBulkAction = async (action, eligibleStatuses, successText) => {
    const eligible = selected.filter(id => {
      const device = devices.find(
        d => d.device_id === id
      )

      return device && eligibleStatuses.includes(device.status)
    })

    if (eligible.length === 0) {
      setBulkError(
        'None of the selected devices are eligible for this action.'
      )
      return
    }

    setBulkBusy(true)
    setBulkError('')
    setBulkMessage('')

    let completed = 0

    try {
      for (const id of eligible) {
        try {
          await action(id)
          completed++
        } catch (err) {
          console.error(`Action failed for ${id}`, err)
        }
      }

      setSelected([])

      if (completed > 0) {
        setBulkMessage(
          `${successText} ${completed} device${completed !== 1 ? 's' : ''}.`
        )
      } else {
        setBulkError('No devices could be processed.')
      }

      await loadDevices()
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkSanitize = () => {
    runBulkAction(
      id => api.sanitizeDevice(token, id),
      ['READY_TO_SANITIZE'],
      'Sanitization started for'
    )
  }

  const bulkVerify = () => {
    runBulkAction(
      id => api.verifyDevice(token, id),
      ['VERIFICATION'],
      'Verification completed for'
    )
  }

  const bulkCertificate = () => {
    runBulkAction(
      id => api.generateCertificate(token, id),
      ['VERIFIED'],
      'Certificates generated for'
    )
  }

  async function handleRegister(e) {
    e.preventDefault()

    setRegisterError('')
    setRegistering(true)

    try {
      await api.registerDevice(token, {
        device_id: deviceId.trim(),
        device_type: deviceType,
        model: model.trim(),
        storage: storage.trim()
      })

      setDeviceId('')
      setModel('')
      setStorage('')
      setShowRegister(false)

      await loadDevices()
    } catch (err) {
      setRegisterError(
        err instanceof ApiError
          ? err.detail
          : 'Could not register device.'
      )
    } finally {
      setRegistering(false)
    }
  }

  function parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      throw new Error('CSV must contain a header and at least one device.')
    }

    const headers = lines[0]
      .split(',')
      .map(h => h.trim().toLowerCase())

    const required = [
      'device_id',
      'device_type',
      'model',
      'storage'
    ]

    const missing = required.filter(
      field => !headers.includes(field)
    )

    if (missing.length > 0) {
      throw new Error(
        `Missing CSV columns: ${missing.join(', ')}`
      )
    }

    return lines.slice(1).map(line => {
      const values = line.split(',')
      const row = {}

      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })

      return row
    })
  }

  async function handleCSVImport(e) {
    const file = e.target.files?.[0]

    if (!file) return

    setImporting(true)
    setImportMessage('')
    setImportError('')

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      let imported = 0

      for (const row of rows) {
        if (
          !row.device_id ||
          !row.device_type ||
          !row.model ||
          !row.storage
        ) {
          continue
        }

        try {
          await api.registerDevice(token, {
            device_id: row.device_id,
            device_type: row.device_type,
            model: row.model,
            storage: row.storage
          })

          imported++
        } catch (err) {
          console.error(
            `Could not import ${row.device_id}`,
            err
          )
        }
      }

      setImportMessage(
        `${imported} device${imported !== 1 ? 's' : ''} imported successfully.`
      )

      await loadDevices()
    } catch (err) {
      setImportError(
        err.message || 'Could not import the CSV file.'
      )
    } finally {
      setImporting(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const selectedDevices = devices.filter(
    d => selected.includes(d.device_id)
  )

  const readySelected = selectedDevices.filter(
    d => d.status === 'READY_TO_SANITIZE'
  ).length

  const verificationSelected = selectedDevices.filter(
    d => d.status === 'VERIFICATION'
  ).length

  const certifiedSelected = selectedDevices.filter(
    d => d.status === 'VERIFIED'
  ).length

  return (
    <div className="b2b-page">

      {/* HEADER */}
      <section className="b2b-header">

        <div>
          <p className="eyebrow">
            PROOFPURGE BUSINESS
          </p>

          <h1>
            Device lifecycle,
            <br />
            under control.
          </h1>

          <p>
            Secure, verify and certify your organization's
            devices with auditable proof at every step.
          </p>
        </div>

        <div className="b2b-actions">

          <button
            className="btn btn-primary"
            onClick={() => setShowRegister(true)}
          >
            + Register device
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={handleCSVImport}
          />

        </div>

      </section>


      {/* IMPORT MESSAGES */}

      {importMessage && (
        <div className="success-box">
          {importMessage}
        </div>
      )}

      {importError && (
        <div className="error-box">
          {importError}
        </div>
      )}


      {/* STATISTICS */}

      <section className="b2b-stats">

        <div className="b2b-stat-card">
          <span>Total devices</span>
          <strong>
            {loading ? '—' : total}
          </strong>
          <small>
            Across your organization
          </small>
        </div>

        <div className="b2b-stat-card">
          <span>Certified</span>
          <strong>
            {loading ? '—' : certified}
          </strong>
          <small>
            Independently verified
          </small>
        </div>

        <div className="b2b-stat-card">
          <span>Awaiting sanitization</span>
          <strong>
            {loading ? '—' : ready}
          </strong>
          <small>
            Ready to process
          </small>
        </div>

        <div className="b2b-stat-card">
          <span>In verification</span>
          <strong>
            {loading ? '—' : verifying}
          </strong>
          <small>
            Currently processing
          </small>
        </div>

      </section>


      {/* FLEET */}

      <section className="b2b-fleet">

        <div className="section-heading">

          <div>
            <p className="eyebrow">
              DEVICE FLEET
            </p>

            <h2>
              Your organization's devices
            </h2>
          </div>

          <span>
            {total} devices
          </span>

        </div>


        {/* BULK ACTION BAR */}

        {selected.length > 0 && (
          <div className="bulk-action-bar">

            <div>
              <strong>
                {selected.length}
              </strong>{' '}
              device{selected.length !== 1 ? 's' : ''} selected
            </div>

            <div className="bulk-actions">

              {readySelected > 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={bulkSanitize}
                  disabled={bulkBusy}
                >
                  Sanitize {readySelected}
                </button>
              )}

              {verificationSelected > 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={bulkVerify}
                  disabled={bulkBusy}
                >
                  Verify {verificationSelected}
                </button>
              )}

              {certifiedSelected > 0 && (
                <button
                  className="btn btn-verified btn-sm"
                  onClick={bulkCertificate}
                  disabled={bulkBusy}
                >
                  Certify {certifiedSelected}
                </button>
              )}

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelected([])}
                disabled={bulkBusy}
              >
                Clear
              </button>

            </div>

          </div>
        )}


        {bulkMessage && (
          <div className="success-box">
            {bulkMessage}
          </div>
        )}

        {bulkError && (
          <div className="error-box">
            {bulkError}
          </div>
        )}


        <div className="b2b-device-table">

          {/* TABLE HEADER */}

          <div className="b2b-table-header">

            <span>
              <input
                type="checkbox"
                checked={
                  devices.length > 0 &&
                  selected.length === devices.length
                }
                onChange={toggleAll}
              />
            </span>

            <span>
              Device
            </span>

            <span>
              Identity
            </span>

            <span>
              Storage
            </span>

            <span>
              Status
            </span>

          </div>


          {/* DEVICES */}

          {devices.map(device => (

            <div
              className="b2b-table-row"
              key={device.device_id}
            >

              <span>
                <input
                  type="checkbox"
                  checked={selected.includes(
                    device.device_id
                  )}
                  onChange={() =>
                    toggleDevice(device.device_id)
                  }
                />
              </span>

              <Link
                to={`/devices/${device.device_id}`}
                className="b2b-device-link"
              >
                <strong>
                  {device.device_type}
                </strong>

                <small>
                  {device.model}
                </small>
              </Link>

              <code>
                {device.device_id}
              </code>

              <span>
                {device.storage}
              </span>

              <span
                className={`b2b-status status-${device.status?.toLowerCase()}`}
              >
                {device.status?.replaceAll('_', ' ')}
              </span>

            </div>

          ))}


          {!loading && devices.length === 0 && (
            <div className="b2b-empty">

              <strong>
                No devices registered yet.
              </strong>

              <span>
                Register your first device or import
                your fleet using CSV.
              </span>

            </div>
          )}

        </div>

      </section>


      {/* COMPLIANCE */}

      <section className="b2b-compliance">

        <div className="b2b-compliance-copy">

          <p className="eyebrow">
            COMPLIANCE & PROOF
          </p>

          <h2>
            Every device leaves a trail.
          </h2>

          <p>
            ProofPurge connects sanitization,
            verification, certificates and audit
            history to every device in your fleet.
          </p>

          <button
            className="btn btn-ghost"
            onClick={() => window.print()}
          >
            Export compliance report
          </button>

        </div>


        <div className="compliance-items">

          <div>
            <strong>
              {certified}
            </strong>

            <span>
              Verified certificates
            </span>
          </div>

          <div>
            <strong>
              {total}
            </strong>

            <span>
              Devices tracked
            </span>
          </div>

          <div>
            <strong>
              {auditCount}
            </strong>

            <span>
              Audit events
            </span>
          </div>

        </div>

      </section>


      {/* STATUS OVERVIEW */}

      <section className="b2b-status-overview">

        <div>
          <span className="status-dot status-dot-ready" />
          <strong>{ready}</strong>
          <small>Ready</small>
        </div>

        <div>
          <span className="status-dot status-dot-sanitizing" />
          <strong>{sanitizing}</strong>
          <small>Sanitizing</small>
        </div>

        <div>
          <span className="status-dot status-dot-verifying" />
          <strong>{verifying}</strong>
          <small>Verification</small>
        </div>

        <div>
          <span className="status-dot status-dot-failed" />
          <strong>{failed}</strong>
          <small>Needs retry</small>
        </div>

        <div>
          <span className="status-dot status-dot-certified" />
          <strong>{certified}</strong>
          <small>Certified</small>
        </div>

      </section>


      {/* REGISTER MODAL */}

      {showRegister && (
        <div
          className="b2b-modal-overlay"
          onClick={() => setShowRegister(false)}
        >

          <div
            className="b2b-modal"
            onClick={e => e.stopPropagation()}
          >

            <div className="b2b-modal-header">

              <div>
                <p className="eyebrow">
                  DEVICE REGISTRATION
                </p>

                <h2>
                  Add a device
                </h2>
              </div>

              <button
                className="b2b-modal-close"
                onClick={() => setShowRegister(false)}
              >
                ×
              </button>

            </div>


            {registerError && (
              <div className="error-box">
                {registerError}
              </div>
            )}


            <form onSubmit={handleRegister}>

              <label htmlFor="b2b-device-id">
                Device ID
              </label>

              <input
                id="b2b-device-id"
                type="text"
                placeholder="e.g. CORP-LAP-001"
                value={deviceId}
                onChange={e =>
                  setDeviceId(e.target.value)
                }
                required
              />


              <label htmlFor="b2b-device-type">
                Device type
              </label>

              <select
                id="b2b-device-type"
                value={deviceType}
                onChange={e =>
                  setDeviceType(e.target.value)
                }
              >
                {DEVICE_TYPES.map(type => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>


              <label htmlFor="b2b-model">
                Model
              </label>

              <input
                id="b2b-model"
                type="text"
                placeholder="e.g. ThinkPad T14"
                value={model}
                onChange={e =>
                  setModel(e.target.value)
                }
                required
              />


              <label htmlFor="b2b-storage">
                Storage
              </label>

              <input
                id="b2b-storage"
                type="text"
                placeholder="e.g. 512GB SSD"
                value={storage}
                onChange={e =>
                  setStorage(e.target.value)
                }
                required
              />


              <div className="b2b-modal-actions">

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setShowRegister(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={registering}
                >
                  {registering
                    ? 'Registering...'
                    : 'Register device'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  )
}