export default function GroupName({ type, count }) {
  return (
    <span className="investment-group-name">
      <svg className="investment-group-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m7.5 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span><span className="investment-group-label">{type.replaceAll('_', ' ').toLowerCase()}</span>{' '}<small>({count})</small></span>
    </span>
  )
}