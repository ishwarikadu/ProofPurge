import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Topbar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="topbar">
   <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
  <img
    src="/proofpurgelogo.png"
    alt="ProofPurge"
    className="brand-logo"
  />

  <p className="brand-tagline">
    Verified device sanitization &amp; the e-waste trust layer
  </p>
</Link>
      {isAuthenticated && (
        <div className="nav-links">
          <Link to="/">My Devices</Link>
          <Link to="/rewards">Rewards</Link>
          <Link to="/impact">Impact</Link>
            <button className="logout-btn" onClick={handleLogout}>
            Log out
            </button>
         </div>
      )}
    </div>
  )
}

