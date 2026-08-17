const LABELS = {
  READY_TO_SANITIZE: 'Ready to sanitize',
  SANITIZING: 'Sanitizing',
  VERIFICATION: 'Ready for verification',
  VERIFIED: 'Verified',
  FAILED: 'Verification failed',
  MANUAL_REVIEW: 'Manual review',
  CERTIFIED: 'Certified'
}

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      {LABELS[status] || status}
    </span>
  )
}