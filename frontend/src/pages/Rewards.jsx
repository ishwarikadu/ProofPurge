import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { api, ApiError } from '../api'

export default function Rewards() {
  const { token } = useAuth()

  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [redeemedReward, setRedeemedReward] = useState(null)

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

  const certifiedCount = devices.filter(
    d => d.status === 'CERTIFIED'
  ).length

  const proofPoints = certifiedCount * 225

const triggerConfetti = () => {
  const colors = ['#7aa9c8', '#6fcf97', '#ffffff', '#9b8cff']

  for (let i = 0; i < 45; i++) {
    const piece = document.createElement('div')

    piece.style.position = 'fixed'
    piece.style.left = `${50 + (Math.random() - 0.5) * 20}%`
    piece.style.top = '45%'
    piece.style.width = '7px'
    piece.style.height = '10px'
    piece.style.background = colors[Math.floor(Math.random() * colors.length)]
    piece.style.borderRadius = '2px'
    piece.style.zIndex = '9999'
    piece.style.pointerEvents = 'none'

    document.body.appendChild(piece)

    const x = (Math.random() - 0.5) * 500
    const y = 300 + Math.random() * 300
    const rotation = Math.random() * 720

    piece.animate(
      [
        {
          transform: 'translate(0, 0) rotate(0deg)',
          opacity: 1
        },
        {
          transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
          opacity: 0
        }
      ],
      {
        duration: 2400 + Math.random() * 1000,
        easing: 'cubic-bezier(.2,.8,.3,1)'
      }
    )

    setTimeout(() => {
      piece.remove()
    }, 1700)
  }
}

  return (
    <div className="rewards-page">
    {redeemedReward && (
  <div className="reward-success">
    <span className="reward-success-icon">✓</span>

    <div>
      <strong>
        Reward redeemed successfully
      </strong>

      <p>
        Your ProofPoints have been applied to this benefit.
      </p>
    </div>

    <button
      onClick={() => setRedeemedReward(null)}
      aria-label="Dismiss"
    >
      ×
    </button>
  </div>
)}

      {/* Header */}
      <section className="rewards-header">
        <div>
          <p className="eyebrow">PROOFPURGE REWARDS</p>

          <h2>
            Your responsible choices
            <br />
            earn something back.
          </h2>

          <p>
            ProofPoints reward you for securely preparing
            devices for their next lifecycle.
          </p>
        </div>

        <div className="points-balance">
          <span>YOUR BALANCE</span>

          <strong>
            {loading ? '—' : proofPoints}
          </strong>

          <small>ProofPoints</small>
          <div className="points-progress">
  <div className="points-progress-label">
    <span>Next reward</span>

    <span>
      {Math.max(500 - proofPoints, 0)} points to go
    </span>
  </div>

  <div className="points-progress-track">
    <div
      className="points-progress-fill"
      style={{
        width: `${Math.min((proofPoints / 500) * 100, 100)}%`
      }}
    />
  </div>
</div>
        </div>
      </section>


      {/* How to earn */}
      <section className="rewards-section">

        <div className="section-heading">
          <div>
            <p className="eyebrow">EARN</p>
            <h3>How ProofPoints work</h3>
          </div>
        </div>

        <div className="earning-list">

          <div className="earning-row">
            <div className="earning-icon">✓</div>

            <div>
              <strong>Secure sanitization</strong>
              <span>
                Complete the device sanitization process
              </span>
            </div>

            <b>+50</b>
          </div>

          <div className="earning-row">
            <div className="earning-icon">✓</div>

            <div>
              <strong>Verification passed</strong>
              <span>
                Your device successfully passes verification
              </span>
            </div>

            <b>+75</b>
          </div>

          <div className="earning-row">
            <div className="earning-icon">✓</div>

            <div>
              <strong>Device certified</strong>
              <span>
                Receive an independently verifiable certificate
              </span>
            </div>

            <b>+100</b>
          </div>

          <div className="earning-row">
            <div className="earning-icon">↻</div>

            <div>
              <strong>Device recycled</strong>
              <span>
                Complete the device's next responsible lifecycle
              </span>
            </div>

            <b>+200</b>
          </div>

        </div>

      </section>


      {/* Rewards */}
      <section className="rewards-section">

        <div className="section-heading">
          <div>
            <p className="eyebrow">REDEEM</p>
            <h3>Use your ProofPoints</h3>
          </div>
        </div>

        <div className="reward-grid">

          <div className="reward-card">

            <div className="reward-card-icon">
              ↻
            </div>

            <h3>Recycling pickup benefit</h3>

            <p>
              Use your points toward eligible
              e-waste collection and recycling services.
            </p>

            <div className="reward-card-bottom">
              <span>200 proofPoints</span>
<button
  className="btn btn-ghost"
  disabled={proofPoints < 200 || redeemedReward === 'pickup'}
  onClick={() => {
    if (proofPoints >= 200) {
      setRedeemedReward('pickup')
    }
  }}
>
  {redeemedReward === 'pickup' ? 'Redeemed ✓' : 'Redeem'}
</button>
            </div>

          </div>


          <div className="reward-card">

            <div className="reward-card-icon">
              ◇
            </div>

            <h3>Partner benefit</h3>

            <p>
              Redeem points for participating
              e-waste and device lifecycle partners.
            </p>

            <div className="reward-card-bottom">
              <span>500 proofPoints</span>

              <button
  className="btn btn-ghost"
  disabled={proofPoints < 300 || redeemedReward === 'partner'}
  onClick={() => {
    if (proofPoints >= 300) {
      setRedeemedReward('partner')
    }
  }}
>
  {redeemedReward === 'partner'
    ? 'Redeemed ✓'
    : proofPoints >= 300
      ? 'Redeem'
      : `${300 - proofPoints} more needed`
  }
</button>
            </div>

          </div>


          <div className="reward-card reward-card-muted">

            <div className="reward-card-icon">
              +
            </div>

            <h3>More rewards coming</h3>

            <p>
              Additional partner rewards can be
              added as the ProofPurge ecosystem grows.
            </p>

            <div className="reward-card-bottom">
              <span>Coming soon</span>
            </div>

          </div>

        </div>

      </section>


      {/* Bottom message */}
      <section className="rewards-note">

        <strong>
          Secure your data. Extend device life. Earn for doing both.
        </strong>

        <span>
          ProofPurge connects secure sanitization with
          responsible device reuse and recycling.
        </span>

      </section>

    </div>
  )
}