// src/pages/members/MemberSalesPage.tsx
// ──────────────────────────────────────
// The DIFFERENTIATOR feature: per-member accountability report.
// Shows who sold what, how much is expected vs paid, and outstanding balance.

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEvents, useMemberSalesReport, useUpdateMemberPayment } from '@/hooks/useQueries'
import {
  Button, Card, CardBody, CardHeader, EmptyState,
  Input, Select, Modal, PageSpinner, StatCard, Badge,
} from '@/components/ui'
import { cn, formatCurrency } from '@/utils'
import type { MemberSalesEntry } from '@/types'

export default function MemberSalesPage() {
  const { activeOrg } = useAuthStore()
  const orgId = activeOrg?.id ?? ''
  const { data: events } = useEvents(orgId)
  const [selectedEventId, setSelectedEventId] = useState('')
  const { data: report, isLoading } = useMemberSalesReport(orgId, selectedEventId)
  const updatePayment = useUpdateMemberPayment(orgId, selectedEventId)

  const [payModal, setPayModal] = useState<MemberSalesEntry | null>(null)
  const [payAmount, setPayAmount] = useState('')

  const eventOptions = [
    { value: '', label: 'Seleccioná un evento...' },
    ...(events ?? []).map((e) => ({ value: e.id, label: e.name })),
  ]

  const handlePaymentUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payModal) return
    await updatePayment.mutateAsync({ recordId: payModal.id, amount: Number(payAmount) })
    setPayModal(null)
  }

  if (!activeOrg) {
    return (
      <div className="p-8">
        <EmptyState icon="📊" title="Seleccioná una organización" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Control por miembro</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Seguimiento de ventas y pagos por integrante
        </p>
      </div>

      <div className="mb-6 max-w-sm">
        <Select
          label="Evento"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          options={eventOptions}
        />
      </div>

      {selectedEventId && (
        <>
          {isLoading ? (
            <PageSpinner />
          ) : !report ? (
            <EmptyState icon="📋" title="Sin datos para este evento" />
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Total vendido"
                  value={report.total_sold + ' tickets'}
                  color="blue"
                />
                <StatCard
                  label="Monto esperado"
                  value={formatCurrency(report.total_expected)}
                />
                <StatCard
                  label="Monto cobrado"
                  value={formatCurrency(report.total_paid)}
                  color="green"
                />
                <StatCard
                  label="Saldo pendiente"
                  value={formatCurrency(report.total_pending)}
                  color={report.total_pending > 0 ? 'red' : 'green'}
                />
              </div>

              {/* Member accountability table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">
                      Desglose por miembro ({report.members.length})
                    </h2>
                    <span className="text-xs text-gray-400">
                      Precio por ticket: {formatCurrency(report.ticket_price)}
                    </span>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  {report.members.length === 0 ? (
                    <EmptyState
                      icon="👤"
                      title="Sin ventas registradas"
                      description="Los miembros aparecen aquí cuando venden tickets de la rifa."
                    />
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          <th className="px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Miembro</th>
                          <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide text-center">Vendidos</th>
                          <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Esperado</th>
                          <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Cobrado</th>
                          <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Pendiente</th>
                          <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {report.members.map((member) => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            onUpdatePayment={() => {
                              setPayModal(member)
                              setPayAmount(String(member.amount_paid))
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}

      {!selectedEventId && (
        <EmptyState
          icon="📊"
          title="Seleccioná un evento"
          description="Elegí un evento para ver el reporte de ventas por miembro."
        />
      )}

      {/* Update payment modal */}
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title={`Actualizar pago — ${payModal?.full_name}`}
      >
        {payModal && (
          <form onSubmit={handlePaymentUpdate} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tickets vendidos:</span>
                <span className="font-medium">{payModal.quantity_sold}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Monto esperado:</span>
                <span className="font-medium">{formatCurrency(payModal.expected_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pendiente actual:</span>
                <span className={cn('font-bold', payModal.pending_balance > 0 ? 'text-red-600' : 'text-green-600')}>
                  {formatCurrency(payModal.pending_balance)}
                </span>
              </div>
            </div>

            <Input
              label="Monto cobrado (Gs)"
              type="number"
              min="0"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              helperText="Ingresá el total acumulado que ya entregó este miembro"
              required
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => setPayModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={updatePayment.isPending}>
                Guardar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

// ─── Member row ────────────────────────────────────────────────────────────────

function MemberRow({
  member, onUpdatePayment,
}: {
  member: MemberSalesEntry
  onUpdatePayment: () => void
}) {
  const fullyPaid = member.pending_balance <= 0

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 text-xs font-semibold">
              {member.full_name[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{member.full_name}</p>
            <p className="text-xs text-gray-400">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
          {member.quantity_sold}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-gray-700">
        {formatCurrency(member.expected_amount)}
      </td>
      <td className="px-4 py-3 text-right text-green-600 font-medium">
        {formatCurrency(member.amount_paid)}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={cn('font-bold', fullyPaid ? 'text-green-600' : 'text-red-600')}>
          {fullyPaid ? '✓ Al día' : formatCurrency(member.pending_balance)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Button variant="ghost" size="sm" onClick={onUpdatePayment}>
          Editar
        </Button>
      </td>
    </tr>
  )
}
