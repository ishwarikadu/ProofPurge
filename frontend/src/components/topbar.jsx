import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Topbar() {
  const { logout } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-inner">

        <div className="topbar-brand">

          <Link to="/" className="topbar-logo-link">
            <img
              src="/proofpurgelogo.png"
              alt="ProofPurge"
              className="topbar-logo"
            />
          </Link>

          <p className="topbar-tagline">
            Verified device sanitization &amp; the e-waste trust layer
          </p>

        </div>

        <nav className="topbar-nav">
          <Link to="/devices">My Devices</Link>
          <Link to="/rewards">Rewards</Link>
          <Link to="/impact">Impact</Link>
          <Link to="/b2b">Business</Link>

          <button
            type="button"
            className="topbar-logout"
            onClick={logout}
          >
            Log out
          </button>
        </nav>

      </div>
    </header>
  )
}