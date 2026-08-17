import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { api } from '../api'

export default function Impact() {
  const { token } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listDevices(token)
        setDevices(data)
      } catch {
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  const certified = devices.filter(
    d => d.status === 'CERTIFIED'
  ).length

  const verified = devices.filter(
    d => d.status === 'VERIFIED' || d.status === 'CERTIFIED'
  ).length

  const totalStorage = devices.reduce((total, device) => {
    const match = String(device.storage).match(/[\d.]+/)

    if (!match) return total

    const value = Number(match[0])
    const storage = String(device.storage).toLowerCase()

    if (storage.includes('tb')) {
      return total + value * 1000
    }

    return total + value
  }, 0)

  return (
    <div className="impact-page">

      <section className="impact-header">
        <div>
          <p className="eyebrow">YOUR IMPACT</p>

          <h2>
            Responsible disposal
            <br />
            starts with proof.
          </h2>

          <p>
            Every verified device is one more device
            prepared for a safer second lifecycle.
          </p>
        </div>
      </section>


      <section className="impact-stats">

        <div className="impact-stat">
          <span>DEVICES PROCESSED</span>
          <strong>
            {loading ? '—' : devices.length}
          </strong>
          <small>Your registered devices</small>
        </div>

        <div className="impact-stat">
          <span>DEVICES VERIFIED</span>
          <strong>
            {loading ? '—' : verified}
          </strong>
          <small>Successfully verified</small>
        </div>

        <div className="impact-stat">
          <span>DEVICES CERTIFIED</span>
          <strong>
            {loading ? '—' : certified}
          </strong>
          <small>With verifiable proof</small>
        </div>

      </section>


      <section className="impact-storage">

        <div>
          <p className="eyebrow">DATA PROTECTED</p>

          <h3>
            {loading ? '—' : `${totalStorage} GB`}
          </h3>

          <p>
            Combined storage capacity across your
            registered devices.
          </p>
        </div>

        <div className="impact-ring">
          <span>✓</span>
          <small>VERIFIED</small>
        </div>

      </section>


      <section className="impact-story">

        <p className="eyebrow">THE PROOFPURGE CYCLE</p>

        <div className="impact-steps">

          <div>
            <span className="impact-step-number">01</span>
            <strong>Secure</strong>
            <p>
              Device data is securely sanitized before
              the device leaves its current lifecycle.
            </p>
          </div>

          <div>
            <span className="impact-step-number">02</span>
            <strong>Verify</strong>
            <p>
              The sanitization result is independently
              checked rather than simply assumed.
            </p>
          </div>

          <div>
            <span className="impact-step-number">03</span>
            <strong>Prove</strong>
            <p>
              A certificate and audit trail preserve
              evidence that the process occurred.
            </p>
          </div>

          <div>
            <span className="impact-step-number">04</span>
            <strong>Reuse</strong>
            <p>
              The device can move toward reuse or
              responsible recycling with its data risk addressed.
            </p>
          </div>

        </div>

      </section>


      <section className="impact-note">

        <strong>
          A device doesn't have to become e-waste just
          because its data needs to disappear.
        </strong>

        <span>
          ProofPurge separates secure data destruction
          from the physical end of a device's life.
        </span>

      </section>


      <Link to="/" className="btn btn-ghost">
        ← Back to My Devices
      </Link>

    </div>
  )
}