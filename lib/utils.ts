export function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}
export function formatDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function timeAgo(d: string | null) {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  return formatDate(d)
}
export function cn(...c: (string | undefined | false | null)[]) { return c.filter(Boolean).join(' ') }
