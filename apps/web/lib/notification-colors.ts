// Bildirim pilleri için sabit anlamsal renkler — sıfırsa gri, sıfırdan farklıysa kendi rengi
const GRAY = { bg: 'var(--muted)', border: 'var(--border)', text: 'var(--muted-foreground)' }
const BLUE = { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' }
const GREEN = { bg: '#052e16', border: '#22c55e', text: '#86efac' }
const RED = { bg: '#450a0a', border: '#ef4444', text: '#fca5a5' }
const YELLOW = { bg: '#451a03', border: '#f59e0b', text: '#fcd34d' }

export const TAHSILAT_COLOR = BLUE
export const DEKONT_COLOR = GREEN
export const DEVAMSIZ_COLOR = RED
export const IPTAL_COLOR = YELLOW

export function chipStyle(active: boolean, color: { bg: string; border: string; text: string }) {
  const c = active ? color : GRAY
  return {
    className: 'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
    style: { backgroundColor: c.bg, borderColor: c.border, color: c.text },
  }
}
