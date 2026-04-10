// src/types/index.ts
// ──────────────────
// All domain types mirror the backend Pydantic schemas.
// Keep in sync when the API changes.

export interface User {
  id: string
  full_name: string
  email: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// ─── Organizations ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member'

export interface Organization {
  id: string
  name: string
  description: string | null
  invite_token: string | null
  is_active: boolean
  created_at: string
}

export interface Member {
  id: string
  user_id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  joined_at: string
}

// ─── Events ────────────────────────────────────────────────────────────────────

export type EventType = 'raffle' | 'party' | 'food_sale' | 'tournament' | 'bingo'
export type EventStatus = 'active' | 'finished' | 'cancelled'

export interface Event {
  id: string
  organization_id: string
  name: string
  description: string | null
  event_type: EventType
  status: EventStatus
  event_date: string | null
  created_at: string
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  event_id: string
  transaction_type: TransactionType
  amount: number   // minor units
  description: string
  notes: string | null
  registered_by_id: string | null
  created_at: string
}

export interface EventBalance {
  event_id: string
  total_income: number
  total_expenses: number
  balance: number
  transaction_count: number
}

// ─── Raffles ───────────────────────────────────────────────────────────────────

export type NumberStatus = 'available' | 'sold' | 'reserved'

export interface Raffle {
  id: string
  event_id: string
  total_numbers: number
  ticket_price: number  // minor units
  is_drawn: boolean
  sold_count: number
  available_count: number
  created_at: string
}

export interface RaffleNumber {
  id: string
  number: number
  status: NumberStatus
  buyer_name: string | null
  buyer_phone: string | null
  amount_paid: number | null
  sold_by_id: string | null
}

export interface RaffleGrid {
  raffle: Raffle
  numbers: RaffleNumber[]
}

export interface SellNumberResponse {
  purchase_id: string
  raffle_number_id: string
  number: number
  buyer_name: string
  buyer_phone: string
  amount_paid: number
  created_at: string
}

// ─── Set Winner (asignación manual de ganador) ─────────────────────────────────

/** Body del POST /raffles/{event_id}/set-winner */
export interface SetWinnerRequest {
  /** Número específico a declarar ganador. Debe tener status "sold". */
  winning_number: number
}

/**
 * Respuesta del endpoint set-winner.
 * winner_name y winner_phone vienen de RafflePurchase (el comprador del número).
 * Espeja exactamente el WinnerResponse de Pydantic.
 */
export interface WinnerResponse {
  draw_id: string
  event_id: string
  raffle_number_id: string | null
  winning_number: number
  winner_name: string | null
  winner_phone: string | null
  drawn_by_id: string | null
  created_at: string
}

// ─── Member Sales ──────────────────────────────────────────────────────────────

export interface MemberSalesEntry {
  id: string
  event_id: string
  user_id: string
  full_name: string
  email: string
  quantity_sold: number
  amount_paid: number
  expected_amount: number
  pending_balance: number
  updated_at: string
}

export interface MemberSalesReport {
  event_id: string
  ticket_price: number
  total_sold: number
  total_expected: number
  total_paid: number
  total_pending: number
  members: MemberSalesEntry[]
}

// ─── Draws ─────────────────────────────────────────────────────────────────────

export interface Draw {
  id: string
  event_id: string
  winning_number: number
  winner_name: string | null
  winner_phone: string | null
  drawn_by_id: string | null
  created_at: string
}

// ─── Utility ───────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string
}

export interface MessageResponse {
  message: string
}