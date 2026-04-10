// src/hooks/useQueries.ts
// ────────────────────────
// All TanStack Query hooks in one place.
// Components import from here — never call the API directly.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  authApi, drawsApi, eventsApi, memberSalesApi,
  orgsApi, rafflesApi, transactionsApi,
} from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import type { UserRole, WinnerResponse } from '@/types'

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
  me: ['me'],
  orgs: ['organizations'],
  org: (id: string) => ['organizations', id],
  members: (orgId: string) => ['organizations', orgId, 'members'],
  events: (orgId: string) => ['events', orgId],
  event: (orgId: string, eventId: string) => ['events', orgId, eventId],
  transactions: (orgId: string, eventId: string) => ['transactions', orgId, eventId],
  balance: (orgId: string, eventId: string) => ['balance', orgId, eventId],
  raffleGrid: (orgId: string, eventId: string) => ['raffle', orgId, eventId],
  memberSales: (orgId: string, eventId: string) => ['member-sales', orgId, eventId],
  draws: (orgId: string, eventId: string) => ['draws', orgId, eventId],
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return useQuery({
    queryKey: QK.me,
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const { setToken, setUser } = useAuthStore()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      setToken(data.access_token)
      const user = await authApi.me()
      setUser(user)
    },
    onError: () => toast.error('Invalid email or password'),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => toast.success('Account created! Please log in.'),
    onError: (err: any) =>
      toast.error(err.response?.data?.detail ?? 'Registration failed'),
  })
}

// ─── Organizations ─────────────────────────────────────────────────────────────

export function useOrganizations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return useQuery({
    queryKey: QK.orgs,
    queryFn: orgsApi.list,
    enabled: isAuthenticated,
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: orgsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.orgs })
      toast.success('Organization created')
    },
    onError: () => toast.error('Failed to create organization'),
  })
}

export function useMembers(orgId: string) {
  return useQuery({
    queryKey: QK.members(orgId),
    queryFn: () => orgsApi.listMembers(orgId),
    enabled: !!orgId,
  })
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) =>
      orgsApi.inviteByEmail(orgId, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.members(orgId) })
      toast.success('Member invited successfully')
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail ?? 'Invite failed'),
  })
}

// ─── Events ────────────────────────────────────────────────────────────────────

export function useEvents(orgId: string) {
  return useQuery({
    queryKey: QK.events(orgId),
    queryFn: () => eventsApi.list(orgId),
    enabled: !!orgId,
  })
}

export function useCreateEvent(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof eventsApi.create>[1]) =>
      eventsApi.create(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.events(orgId) })
      toast.success('Event created')
    },
    onError: () => toast.error('Failed to create event'),
  })
}

export function useUpdateEvent(orgId: string, eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof eventsApi.update>[2]) =>
      eventsApi.update(orgId, eventId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.events(orgId) })
      toast.success('Event updated')
    },
  })
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export function useTransactions(orgId: string, eventId: string) {
  return useQuery({
    queryKey: QK.transactions(orgId, eventId),
    queryFn: () => transactionsApi.list(orgId, eventId),
    enabled: !!orgId && !!eventId,
  })
}

export function useEventBalance(orgId: string, eventId: string) {
  return useQuery({
    queryKey: QK.balance(orgId, eventId),
    queryFn: () => transactionsApi.balance(orgId, eventId),
    enabled: !!orgId && !!eventId,
  })
}

export function useCreateTransaction(orgId: string, eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof transactionsApi.create>[2]) =>
      transactionsApi.create(orgId, eventId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.transactions(orgId, eventId) })
      qc.invalidateQueries({ queryKey: QK.balance(orgId, eventId) })
      toast.success('Transaction recorded')
    },
    onError: () => toast.error('Failed to record transaction'),
  })
}

// ─── Raffles ───────────────────────────────────────────────────────────────────

export function useRaffleGrid(orgId: string, eventId: string) {
  return useQuery({
    queryKey: QK.raffleGrid(orgId, eventId),
    queryFn: () => rafflesApi.getGrid(orgId, eventId),
    enabled: !!orgId && !!eventId,
    refetchInterval: 10_000,
  })
}

export function useSellNumber(orgId: string, eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof rafflesApi.sellNumber>[2]) =>
      rafflesApi.sellNumber(orgId, eventId, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.raffleGrid(orgId, eventId) })
      qc.invalidateQueries({ queryKey: QK.memberSales(orgId, eventId) })
      toast.success(`✅ #${data.number} sold to ${data.buyer_name}`)
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail ?? 'Failed to sell number'),
  })
}

/**
 * Asigna manualmente un número vendido como ganador de la rifa.
 */
export function useRecordWinner(orgId: string, eventId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof rafflesApi.recordWinner>[2]) =>
      rafflesApi.recordWinner(orgId, eventId, data),

    onSuccess: (winner: WinnerResponse) => {
      qc.invalidateQueries({ queryKey: QK.raffleGrid(orgId, eventId) })
      qc.invalidateQueries({ queryKey: QK.draws(orgId, eventId) })

      const name = winner.winner_name ?? 'Desconocido'
      const phone = winner.winner_phone ? ` · ${winner.winner_phone}` : ''
      toast.success(`🏆 Ganador: #${winner.winning_number} — ${name}${phone}`)
    },

    onError: (err: any) => {
      const detail: string = err.response?.data?.detail ?? 'No se pudo asignar el ganador'
      toast.error(detail)
    },
  })
}

// ─── Member Sales ──────────────────────────────────────────────────────────────

export function useMemberSalesReport(orgId: string, eventId: string) {
  return useQuery({
    queryKey: QK.memberSales(orgId, eventId),
    queryFn: () => memberSalesApi.getReport(orgId, eventId),
    enabled: !!orgId && !!eventId,
  })
}

export function useUpdateMemberPayment(orgId: string, eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recordId, amount }: { recordId: string; amount: number }) =>
      memberSalesApi.updatePayment(orgId, eventId, recordId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.memberSales(orgId, eventId) })
      toast.success('Payment updated')
    },
    onError: () => toast.error('Failed to update payment'),
  })
}

// ─── Draws ─────────────────────────────────────────────────────────────────────

export function useRunDraw(orgId: string, eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => drawsApi.run(orgId, eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.draws(orgId, eventId) })
      qc.invalidateQueries({ queryKey: QK.raffleGrid(orgId, eventId) })
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail ?? 'Draw failed'),
  })
}

export function useDrawHistory(orgId: string, eventId: string) {
  return useQuery({
    queryKey: QK.draws(orgId, eventId),
    queryFn: () => drawsApi.history(orgId, eventId),
    enabled: !!orgId && !!eventId,
  })
}