import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
        <div className="brand-mark display">PP</div>
        <div>
          <h1 className="display">ProofPurge</h1>
          <p>Verified device sanitization &amp; the e-waste trust layer</p>
        </div>
      </Link>
      {isAuthenticated && (
        <div className="nav-links">
          <Link to="/">My Devices</Link>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      )}
    </div>
  )
}
