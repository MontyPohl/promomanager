// src/api/services.ts
// ────────────────────
// One function per API call. All types are imported from the central types file.
// TanStack Query hooks call these functions — never axios directly from components.

import type {
  Draw,
  Event,
  EventBalance,
  Member,
  MemberSalesReport,
  MessageResponse,
  Organization,
  RaffleGrid,
  SellNumberResponse,
  TokenResponse,
  Transaction,
  User,
  UserRole,
  Raffle,
  SetWinnerRequest,
  WinnerResponse,
} from '@/types'
import client from './client'

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { full_name: string; email: string; password: string }) =>
    client.post<User>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    client.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  me: () => client.get<User>('/auth/me').then((r) => r.data),
}

// ─── Organizations ─────────────────────────────────────────────────────────────

export const orgsApi = {
  list: () => client.get<Organization[]>('/organizations').then((r) => r.data),

  get: (id: string) =>
    client.get<Organization>(`/organizations/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    client.post<Organization>('/organizations', data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    client.patch<Organization>(`/organizations/${id}`, data).then((r) => r.data),

  listMembers: (orgId: string) =>
    client.get<Member[]>(`/organizations/${orgId}/members`).then((r) => r.data),

  inviteByEmail: (orgId: string, email: string, role: UserRole = 'member') =>
    client
      .post<MessageResponse>(`/organizations/${orgId}/invite/email`, { email, role })
      .then((r) => r.data),

  generateInviteLink: (orgId: string) =>
    client
      .post<{ invite_token: string }>(`/organizations/${orgId}/invite/generate-link`)
      .then((r) => r.data),

  joinViaToken: (token: string) =>
    client.post<MessageResponse>('/organizations/join', { token }).then((r) => r.data),

  updateMemberRole: (orgId: string, memberId: string, role: UserRole) =>
    client
      .patch<MessageResponse>(`/organizations/${orgId}/members/${memberId}/role`, { role })
      .then((r) => r.data),

  removeMember: (orgId: string, memberId: string) =>
    client
      .delete<MessageResponse>(`/organizations/${orgId}/members/${memberId}`)
      .then((r) => r.data),
}

// ─── Events ────────────────────────────────────────────────────────────────────

export const eventsApi = {
  list: (orgId: string) =>
    client.get<Event[]>('/events', { params: { org_id: orgId } }).then((r) => r.data),

  get: (orgId: string, eventId: string) =>
    client
      .get<Event>(`/events/${eventId}`, { params: { org_id: orgId } })
      .then((r) => r.data),

  create: (
    orgId: string,
    data: { name: string; event_type: string; description?: string; event_date?: string }
  ) =>
    client
      .post<Event>('/events', data, { params: { org_id: orgId } })
      .then((r) => r.data),

  update: (
    orgId: string,
    eventId: string,
    data: { name?: string; status?: string; description?: string; event_date?: string }
  ) =>
    client
      .patch<Event>(`/events/${eventId}`, data, { params: { org_id: orgId } })
      .then((r) => r.data),

  delete: (orgId: string, eventId: string) =>
    client
      .delete<MessageResponse>(`/events/${eventId}`, { params: { org_id: orgId } })
      .then((r) => r.data),
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export const transactionsApi = {
  list: (orgId: string, eventId: string) =>
    client
      .get<Transaction[]>('/transactions', { params: { org_id: orgId, event_id: eventId } })
      .then((r) => r.data),

  balance: (orgId: string, eventId: string) =>
    client
      .get<EventBalance>('/transactions/balance', { params: { org_id: orgId, event_id: eventId } })
      .then((r) => r.data),

  create: (
    orgId: string,
    eventId: string,
    data: { transaction_type: string; amount: number; description: string; notes?: string }
  ) =>
    client
      .post<Transaction>('/transactions', data, {
        params: { org_id: orgId, event_id: eventId },
      })
      .then((r) => r.data),

  delete: (orgId: string, txId: string) =>
    client
      .delete<MessageResponse>(`/transactions/${txId}`, { params: { org_id: orgId } })
      .then((r) => r.data),
}

// ─── Raffles ───────────────────────────────────────────────────────────────────

export const rafflesApi = {
  getGrid: (orgId: string, eventId: string) =>
    client
      .get<RaffleGrid>(`/raffles/${eventId}`, { params: { org_id: orgId } })
      .then((r) => r.data),

  create: (orgId: string, eventId: string, data: { total_numbers: number; ticket_price: number }) =>
    client
      .post<Raffle>(`/raffles/${eventId}`, data, { params: { org_id: orgId } })
      .then((r) => r.data),

  sellNumber: (
    orgId: string,
    eventId: string,
    data: {
      raffle_number_id: string
      buyer_name: string
      buyer_phone: string
      amount_paid: number
    }
  ) =>
    client
      .post<SellNumberResponse>(`/raffles/${eventId}/sell`, data, {
        params: { org_id: orgId },
      })
      .then((r) => r.data),

  // ✅ NUEVO MÉTODO
  setWinner: (orgId: string, eventId: string, data: SetWinnerRequest) =>
    client
      .post<WinnerResponse>(`/raffles/${eventId}/set-winner`, data, {
        params: { org_id: orgId },
      })
      .then((r) => r.data),
}

// ─── Member Sales ──────────────────────────────────────────────────────────────

export const memberSalesApi = {
  getReport: (orgId: string, eventId: string) =>
    client
      .get<MemberSalesReport>(`/member-sales/${eventId}`, { params: { org_id: orgId } })
      .then((r) => r.data),

  updatePayment: (orgId: string, eventId: string, recordId: string, amount_paid: number) =>
    client
      .patch(`/member-sales/${eventId}/members/${recordId}`, { amount_paid }, {
        params: { org_id: orgId },
      })
      .then((r) => r.data),
}

// ─── Draws ─────────────────────────────────────────────────────────────────────

export const drawsApi = {
  run: (orgId: string, eventId: string) =>
    client
      .post<Draw>(`/draws/${eventId}`, {}, { params: { org_id: orgId } })
      .then((r) => r.data),

  history: (orgId: string, eventId: string) =>
    client
      .get<Draw[]>(`/draws/${eventId}`, { params: { org_id: orgId } })
      .then((r) => r.data),
}