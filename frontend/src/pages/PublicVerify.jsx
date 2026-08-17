import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function PublicVerify() {
  const { certificateId } = useParams()

  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function verify() {
      try {
        const data = await api.verifyCertificate(certificateId)
        setCertificate(data)
      } catch (err) {
        setError(err.message || 'Certificate could not be verified')
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [certificateId])

  if (loading) {
    return (
      <div className="public-verify-page">
        <div className="public-verify-card">
          <p className="process-kicker">PROOFPURGE</p>
          <h1>Verifying certificate...</h1>
          <p>
            Checking the certificate against the ProofPurge
            verification record.
          </p>
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="public-verify-page">
        <div className="public-verify-card verify-invalid">

          <div className="public-verify-icon">
            !
          </div>

          <p className="process-kicker">
            PROOFPURGE VERIFICATION
          </p>

          <h1>Certificate not found</h1>

          <p>
            This certificate could not be verified.
            It may be invalid, unavailable, or incorrectly entered.
          </p>

        </div>
      </div>
    )
  }

  return (
    <div className="public-verify-page">

      <div className="public-verify-card">

        <div className="public-verify-top">

          <div>
            <p className="process-kicker">
              PROOFPURGE PUBLIC VERIFICATION
            </p>

            <h1>Certificate verified</h1>

            <p>
              This device has a valid ProofPurge sanitization record.
            </p>
          </div>

          <div className="public-verified-badge">
            ✓ VERIFIED
          </div>

        </div>


        <div className="public-verify-score">

          <strong>
            {certificate.verification_percentage}%
          </strong>

          <span>
            Sanitization verification
          </span>

        </div>


        <div className="public-device-info">

          <div>
            <span>DEVICE</span>
            <strong>
              {certificate.device_type}
            </strong>
          </div>

          <div>
            <span>MODEL</span>
            <strong>
              {certificate.model}
            </strong>
          </div>

          <div>
            <span>STORAGE</span>
            <strong>
              {certificate.storage}
            </strong>
          </div>

          <div>
            <span>DEVICE ID</span>
            <strong className="mono">
              {certificate.device_id}
            </strong>
          </div>

        </div>


        <div className="public-proof-section">

          <h2>Sanitization proof</h2>

          <div className="public-proof-grid">

            <div>
              <span>Method</span>
              <strong>
                {certificate.sanitization_method}
              </strong>
            </div>

            <div>
              <span>Result</span>
              <strong className="proof-success">
                {certificate.verification_result}
              </strong>
            </div>

            <div>
              <span>Certificate ID</span>
              <strong className="mono">
                {certificate.certificate_id}
              </strong>
            </div>

            <div>
              <span>Issued</span>
              <strong>
                {new Date(
                  certificate.issued_at
                ).toLocaleString()}
              </strong>
            </div>

          </div>

        </div>


        <div className="public-hash">

          <span>Certificate integrity hash</span>

          <strong className="mono">
            {certificate.certificate_hash}
          </strong>

        </div>


        <div className="public-verify-footer">
          Independently verifiable ProofPurge record
        </div>

      </div>

    </div>
  )
}