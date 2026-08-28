export const GROUP_COLORS = [
  { key: 'blue', label: 'Mavi', hex: '#3b82f6' },
  { key: 'red', label: 'Kırmızı', hex: '#ef4444' },
  { key: 'green', label: 'Yeşil', hex: '#22c55e' },
  { key: 'yellow', label: 'Sarı', hex: '#eab308' },
  { key: 'dark_green', label: 'Koyu Yeşil', hex: '#166534' },
  { key: 'lime', label: 'Lime (Açık Yeşil)', hex: '#84cc16' },
  { key: 'orange', label: 'Turuncu', hex: '#f97316' },
  { key: 'purple', label: 'Mor', hex: '#a855f7' },
  { key: 'magenta', label: 'Magenta', hex: '#d946ef' },
  { key: 'pink', label: 'Pembe', hex: '#ec4899' },
  { key: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { key: 'light_blue', label: 'Açık Mavi', hex: '#38bdf8' },
  { key: 'navy', label: 'Lacivert', hex: '#1e3a8a' },
  { key: 'brown', label: 'Kahverengi', hex: '#92400e' },
  { key: 'maroon', label: 'Bordo', hex: '#7f1d1d' },
  { key: 'white', label: 'Beyaz', hex: '#ffffff' },
] as const

export type GroupColorKey = (typeof GROUP_COLORS)[number]['key']

export function getGroupColor(colorKey: string | null | undefined, fallbackIndex: number) {
  return GROUP_COLORS.find((c) => c.key === colorKey) ?? GROUP_COLORS[fallbackIndex % GROUP_COLORS.length]
}

// Rengin açık olup olmadığını tespit eder (koyu metin/tik rengi gerektirir)
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.7
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Rengi beyaza doğru karıştırır — koyu renklerde okunabilir metin için kullanılır
export function lightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr}, ${lg}, ${lb})`
}

// Rengi siyaha doğru karıştırır — beyaz/açık renkler açık zeminde görünmez
// olduğu için (ör. "Beyaz" grup rengi) kenarlık/metin rengini koyulaştırmak için kullanılır
export function darkenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const dr = Math.round(r * (1 - amount))
  const dg = Math.round(g * (1 - amount))
  const db = Math.round(b * (1 - amount))
  return `rgb(${dr}, ${dg}, ${db})`
}
