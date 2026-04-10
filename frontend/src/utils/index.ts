// src/utils/index.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format minor currency units (integer) to display string.
 * e.g. 150000 → "Gs. 150.000" (Paraguayan Guaraní)
 * Change locale/currency for other countries.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return format(new Date(dateStr), 'dd MMM yyyy')
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm')
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  raffle: '🎟️ Rifa',
  party: '🎉 Fiesta',
  food_sale: '🍔 Venta de Comida',
  tournament: '🏆 Torneo',
  bingo: '🎱 Bingo',
}

export const EVENT_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
}

export const EVENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  finished: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}
