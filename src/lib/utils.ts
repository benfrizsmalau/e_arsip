import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNIP(nip: string): string {
  const clean = nip.replace(/\D/g, '')
  if (clean.length !== 18) return nip
  return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15)}`
}

export function getInitials(name: string): string {
  if (!name) return 'AD'
  const parts = name
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export function generateNomorArsip(year: number, seq: number): string {
  return `EA-${year}-${String(seq).padStart(4, '0')}`
}

export function generateNomorAgenda(prefix: 'SM' | 'SK', year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}

export function formatDate(date: string | Date, style: 'short' | 'long' | 'numeric' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  if (style === 'numeric') return d.toLocaleDateString('id-ID')
  if (style === 'long') {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`
  return formatDate(d, 'short')
}

export function getTingkatKeamananLabel(tk: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    biasa: { label: 'Biasa', color: 'neutral' },
    terbatas: { label: 'Terbatas', color: 'info' },
    rahasia: { label: 'Rahasia', color: 'warning' },
    sangat_rahasia: { label: 'Sangat Rahasia', color: 'error' },
  }
  return map[tk] ?? { label: tk, color: 'neutral' }
}

export function getStatusArsipColor(status: string): string {
  const map: Record<string, string> = {
    aktif: 'success',
    inaktif: 'neutral',
    vital: 'warning',
    permanen: 'info',
    musnah: 'error',
    draft: 'neutral',
  }
  return map[status] ?? 'neutral'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
