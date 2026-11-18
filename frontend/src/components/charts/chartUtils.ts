export const CHART_COLORS = {
  indigo: 'var(--chart-accent)',
  indigoSoft: 'var(--chart-accent-soft)',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  slate: 'var(--chart-label)'
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID').format(Number.isFinite(value) ? value : 0)

export const formatCompact = (value: number) => {
  const number = Number.isFinite(value) ? value : 0
  if (Math.abs(number) >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  }
  if (Math.abs(number) >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1).replace('.', ',')} jt`
  }
  if (Math.abs(number) >= 1_000) {
    return `${Math.round(number / 1_000)} rb`
  }
  return String(Math.round(number))
}

export const formatRupiah = (value: number) => `Rp ${formatNumber(value)}`

export const formatDateShort = (iso: string) => {
  if (!iso) return '-'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export const formatDateTime = (date: Date | null) => {
  if (!date) return '—'
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const niceMax = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1
  return Math.max(1, Math.ceil(value * 1.1))
}
