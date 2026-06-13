/**
 * Smart INR formatter: Cr / L / K / raw based on magnitude.
 * e.g. 32837412 → "₹3.28 Cr" | 747000 → "₹7.47 L" | 25000 → "₹25K"
 */
export function formatINR(value) {
  if (value == null || isNaN(value)) return '—'
  const abs  = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(2)} L`
  if (abs >= 1e3)  return `${sign}₹${(abs / 1e3).toFixed(1)}K`
  return `${sign}₹${abs.toFixed(0)}`
}

/**
 * Full Intl currency formatter with thousand separators.
 */
export function formatCurrency(value, currency = 'INR') {
  if (value == null || isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString()}`
  }
}

/** "+12.34%" or "-5.00%" */
export function formatPercent(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/** Annual income / expense multiplier by frequency string */
export function annualMultiplier(frequency) {
  switch ((frequency || '').toUpperCase()) {
    case 'YEARLY':    return 1
    case 'QUARTERLY': return 4
    default:          return 12   // MONTHLY
  }
}
