import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Grup isimlerini doğal sıraya göre karşılaştırır (örn. "U8" her zaman "U10"dan önce gelir)
export function compareGroupNames(a: string, b: string): number {
  return a.localeCompare(b, 'tr', { numeric: true })
}

export const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export const TR_DAYS = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
]

export function getMonthName(month: number): string {
  return TR_MONTHS[(month - 1) % 12]
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₺0'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function calculateAge(birthDate: string | null | undefined, onDate = new Date()): number | null {
  if (!birthDate) return null
  const [year, month, day] = birthDate.split('-').map(Number)
  if (!year || !month || !day) return null
  let age = onDate.getFullYear() - year
  if (onDate.getMonth() + 1 < month || (onDate.getMonth() + 1 === month && onDate.getDate() < day)) age -= 1
  return age >= 0 ? age : null
}

// Date-only DB alanlarında UTC dönüşümü kullanma; Türkiye gece saatlerinde gün
// kaymasını önlemek için takvim tarihini yerel bileşenlerden üret.
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// n ay öncesinin YYYY-MM-DD tarihini döndürür
export function nMonthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// YYYY-MM-DD formatında bugünün tarihini döndürür (yerel saat)
export function today(): string {
  return toLocalDateString(new Date())
}

// Bir sonraki tahsilat gününe kalan gün sayısı (bugün dahil değil, 0 = bugün)
export function daysUntilCollection(collectionDay: number): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let target = new Date(now.getFullYear(), now.getMonth(), collectionDay)
  if (target < now) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, collectionDay)
  }
  return Math.round((target.getTime() - now.getTime()) / 86400000)
}
