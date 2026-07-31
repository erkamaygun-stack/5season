import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

// n ay öncesinin YYYY-MM-DD tarihini döndürür
export function nMonthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// YYYY-MM-DD formatında bugünün tarihini döndürür (yerel saat)
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
