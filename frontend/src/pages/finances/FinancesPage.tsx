// src/pages/finances/FinancesPage.tsx

import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useEvents, useTransactions, useEventBalance, useCreateTransaction } from '@/hooks/useQueries'
import {
  Button, Card, CardBody, CardHeader, EmptyState,
  Input, Select, Modal, PageSpinner, StatCard,
} from '@/components/ui'
import { cn, formatCurrency, formatDateTime } from '@/utils'
import type { TransactionType } from '@/types'

const TX_TYPE_OPTIONS = [
  { value: 'income', label: '💰 Ingreso' },
  { value: 'expense', label: '💸 Gasto' },
]

export default function FinancesPage() {
  const { activeOrg } = useAuthStore()
  const orgId = activeOrg?.id ?? ''
  const { data: events } = useEvents(orgId)

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({
    transaction_type: 'income' as TransactionType,
    amount: '',
    description: '',
    notes: '',
  })

  const { data: transactions, isLoading: txLoading } = useTransactions(orgId, selectedEventId)
  const { data: balance } = useEventBalance(orgId, selectedEventId)
  const createTx = useCreateTransaction(orgId, selectedEventId)

  const eventOptions = [
    { value: '', label: 'Seleccioná un evento...' },
    ...(events ?? []).map((e) => ({ value: e.id, label: e.name })),
  ]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTx.mutateAsync({
      ...form,
      amount: Number(form.amount),
      notes: form.notes || undefined,
    })
    setAddModal(false)
    setForm({ transaction_type: 'income', amount: '', description: '', notes: '' })
  }

  if (!activeOrg) {
    return (
      <div className="p-8">
        <EmptyState icon="💰" title="Seleccioná una organización" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeOrg.name}</p>
        </div>
        {selectedEventId && (
          <Button onClick={() => setAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Registrar movimiento
          </Button>
        )}
      </div>

      {/* Event selector */}
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
          {/* Balance stats */}
          {balance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Total ingresos"
                value={formatCurrency(balance.total_income)}
                color="green"
              />
              <StatCard
                label="Total gastos"
                value={formatCurrency(balance.total_expenses)}
                color="red"
              />
              <StatCard
                label="Balance neto"
                value={formatCurrency(balance.balance)}
                color={balance.balance >= 0 ? 'green' : 'red'}
                sub={`${balance.transaction_count} movimientos`}
              />
            </div>
          )}

          {/* Transactions table */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800">Movimientos</h2>
            </CardHeader>
            <CardBody className="p-0">
              {txLoading ? (
                <PageSpinner />
              ) : !transactions || transactions.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="Sin movimientos registrados"
                  action={
                    <Button size="sm" onClick={() => setAddModal(true)}>
                      Registrar primero
                    </Button>
                  }
                />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Descripción</th>
                      <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Monto</th>
                      <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                            tx.transaction_type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}>
                            {tx.transaction_type === 'income'
                              ? <TrendingUp className="w-3 h-3" />
                              : <TrendingDown className="w-3 h-3" />
                            }
                            {tx.transaction_type === 'income' ? 'Ingreso' : 'Gasto'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-800">{tx.description}</td>
                        <td className={cn(
                          'px-4 py-3 text-right font-semibold',
                          tx.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {tx.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDateTime(tx.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {!selectedEventId && (
        <EmptyState
          icon="📊"
          title="Seleccioná un evento"
          description="Elegí un evento de la lista para ver y registrar sus movimientos financieros."
        />
      )}

      {/* Add transaction modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Registrar movimiento">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Tipo"
            value={form.transaction_type}
            onChange={(e) => setForm({ ...form, transaction_type: e.target.value as TransactionType })}
            options={TX_TYPE_OPTIONS}
          />
          <Input
            label="Monto (Gs)"
            type="number"
            min="1"
            placeholder="150000"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <Input
            label="Descripción"
            placeholder="Ej: Venta de boletos, compra de materiales..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <Input
            label="Notas (opcional)"
            placeholder="Información adicional..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createTx.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
