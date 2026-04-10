// src/pages/raffles/RafflePage.tsx
// ──────────────────────────────────
// Visual raffle grid. Each number is a clickable tile.
//
// Available → white tile  → click opens "Vender número" modal
// Sold      → brand tile  → click opens "Detalle del comprador" modal
//             (admin can mark it as winner from there)
// Winner    → amber tile  → crown icon, not clickable

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shuffle, Trophy, User, Phone,
  CreditCard, Crown, CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import {
  useRaffleGrid, useSellNumber, useRunDraw,
  useDrawHistory, useRecordWinner,
} from '@/hooks/useQueries'
import {
  Button, Input, Modal, PageSpinner,
  StatCard, Card, CardBody, CardHeader,
} from '@/components/ui'
import { cn, formatCurrency, formatDateTime } from '@/utils'
import type { RaffleNumber } from '@/types'

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RafflePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { activeOrg } = useAuthStore()
  const orgId = activeOrg?.id ?? ''
  const navigate = useNavigate()

  const { data: gridData, isLoading } = useRaffleGrid(orgId, eventId ?? '')
  const sellNumber = useSellNumber(orgId, eventId ?? '')
  const runDraw = useRunDraw(orgId, eventId ?? '')
  const recordWinner = useRecordWinner(orgId, eventId ?? '')
  const { data: draws } = useDrawHistory(orgId, eventId ?? '')

  // ── Modal state ──────────────────────────────────────────────────────────────

  // Sell flow (available number clicked)
  const [selectedNumber, setSelectedNumber] = useState<RaffleNumber | null>(null)
  const [sellForm, setSellForm] = useState({ buyer_name: '', buyer_phone: '', amount_paid: '' })

  // Buyer detail flow (sold number clicked)
  const [soldNumber, setSoldNumber] = useState<RaffleNumber | null>(null)

  // Random draw confirmation
  const [drawConfirm, setDrawConfirm] = useState(false)

  // Celebration modal — shared by both draw types
  const [drawResult, setDrawResult] = useState<{
    number: number
    name?: string | null
    phone?: string | null
  } | null>(null)

  // ── Derived data ─────────────────────────────────────────────────────────────

  if (isLoading) return <PageSpinner />
  if (!gridData) return (
    <div className="p-8 text-gray-500">No se encontró la rifa para este evento.</div>
  )

  const { raffle, numbers } = gridData
  const ticketPriceDisplay = formatCurrency(raffle.ticket_price)
  const soldPercent = raffle.total_numbers > 0
    ? Math.round((raffle.sold_count / raffle.total_numbers) * 100)
    : 0

  // Set of winning numbers to style tiles differently
  const winningNumbers = new Set(draws?.map((d) => d.winning_number) ?? [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleNumberClick = (num: RaffleNumber) => {
    if (num.status === 'available') {
      // Open sell modal
      setSelectedNumber(num)
      setSellForm({ buyer_name: '', buyer_phone: '', amount_paid: String(raffle.ticket_price) })
    } else if (num.status === 'sold') {
      // Open buyer detail modal
      setSoldNumber(num)
    }
    // Winner tiles (already in draws) are not clickable — handled in TicketTile
  }

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNumber) return
    await sellNumber.mutateAsync({
      raffle_number_id: selectedNumber.id,
      buyer_name: sellForm.buyer_name,
      buyer_phone: sellForm.buyer_phone,
      amount_paid: Number(sellForm.amount_paid),
    })
    setSelectedNumber(null)
  }

  const handleRunDraw = async () => {
    const result = await runDraw.mutateAsync()
    setDrawResult({
      number: result.winning_number,
      name: result.winner_name,
      phone: result.winner_phone,
    })
    setDrawConfirm(false)
  }

  const handleMarkWinner = async () => {
    if (!soldNumber) return
    // recordWinner hook already fires toast.success with name + number
    const result = await recordWinner.mutateAsync({ winning_number: soldNumber.number })
    setSoldNumber(null)
    // Reuse the same celebration modal as the random draw
    setDrawResult({
      number: result.winning_number,
      name: result.winner_name,
      phone: result.winner_phone,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">🎟️ Rifa</h1>
          <p className="text-sm text-gray-500">Precio por número: {ticketPriceDisplay}</p>
        </div>
        {!raffle.is_drawn && (
          <Button
            onClick={() => setDrawConfirm(true)}
            leftIcon={<Shuffle className="w-4 h-4" />}
            variant="secondary"
          >
            Realizar sorteo
          </Button>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total números" value={raffle.total_numbers} />
        <StatCard label="Vendidos" value={raffle.sold_count} color="blue" />
        <StatCard label="Disponibles" value={raffle.available_count} color="green" />
        <StatCard
          label="Avance"
          value={`${soldPercent}%`}
          color={soldPercent === 100 ? 'green' : 'blue'}
        />
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progreso de ventas</span>
          <span>{raffle.sold_count} / {raffle.total_numbers}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${soldPercent}%` }}
          />
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-sm mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white" />
          <span className="text-gray-500">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-brand-500" />
          <span className="text-gray-500">Vendido — clic para ver comprador</span>
        </div>
        {winningNumbers.size > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-400" />
            <span className="text-gray-500">Ganador</span>
          </div>
        )}
      </div>

      {/* ── Ticket Grid ─────────────────────────────────────────────────────── */}
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${raffle.total_numbers > 500 ? '40px' : '52px'}, 1fr))`,
        }}
      >
        {numbers.map((num) => (
          <TicketTile
            key={num.id}
            number={num}
            isWinner={winningNumbers.has(num.number)}
            onClick={() => handleNumberClick(num)}
          />
        ))}
      </div>

      {/* ── Draw history ────────────────────────────────────────────────────── */}
      {draws && draws.length > 0 && (
        <div className="mt-10">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Historial de sorteos
              </h2>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Número</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Ganador</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Teléfono</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {draws.map((draw) => (
                    <tr key={draw.id}>
                      <td className="px-6 py-3 font-bold text-brand-700">#{draw.winning_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{draw.winner_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{draw.winner_phone ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(draw.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Vender número (available) ────────────────────────────────────── */}
      <Modal
        open={!!selectedNumber}
        onClose={() => setSelectedNumber(null)}
        title={`Vender número #${selectedNumber?.number}`}
      >
        <form onSubmit={handleSell} className="space-y-4">
          <Input
            label="Nombre del comprador"
            placeholder="Juan Pérez"
            value={sellForm.buyer_name}
            onChange={(e) => setSellForm({ ...sellForm, buyer_name: e.target.value })}
            required
          />
          <Input
            label="Teléfono"
            placeholder="0981 123 456"
            type="tel"
            value={sellForm.buyer_phone}
            onChange={(e) => setSellForm({ ...sellForm, buyer_phone: e.target.value })}
            required
          />
          <Input
            label="Monto cobrado (Gs)"
            type="number"
            value={sellForm.amount_paid}
            onChange={(e) => setSellForm({ ...sellForm, amount_paid: e.target.value })}
            helperText={`Precio sugerido: ${ticketPriceDisplay}`}
            required
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setSelectedNumber(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={sellNumber.isPending}>
              Confirmar venta
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Detalle del comprador (sold number clicked) ──────────────────── */}
      <Modal
        open={!!soldNumber}
        onClose={() => setSoldNumber(null)}
        title={`Número #${soldNumber?.number}`}
      >
        {soldNumber && (
          <div className="space-y-5">

            {/* Buyer info card */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">

              {/* Name row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Comprador</p>
                  <p className="font-semibold text-gray-900 truncate">
                    {soldNumber.buyer_name ?? <span className="text-gray-400 italic">Sin datos</span>}
                  </p>
                </div>
              </div>

              {/* Phone row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Teléfono</p>
                  <p className="font-semibold text-gray-900">
                    {soldNumber.buyer_phone ?? <span className="text-gray-400 italic">Sin datos</span>}
                  </p>
                </div>
              </div>

              {/* Amount row */}
              {soldNumber.amount_paid != null && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Monto pagado</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(soldNumber.amount_paid)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Already a winner? Show badge instead of action button */}
            {winningNumbers.has(soldNumber.number) ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-sm">
                <Crown className="w-4 h-4" />
                Este número ya es ganador
              </div>
            ) : raffle.is_drawn ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                La rifa ya tiene un ganador asignado
              </div>
            ) : (
              /* Mark as winner CTA */
              <div className="space-y-3">
                <p className="text-xs text-gray-400 text-center">
                  Solo administradores pueden marcar un número como ganador.
                  Esta acción quedará registrada en el historial.
                </p>
                <Button
                  className="w-full justify-center"
                  onClick={handleMarkWinner}
                  loading={recordWinner.isPending}
                  leftIcon={<Trophy className="w-4 h-4" />}
                >
                  Marcar como Ganador
                </Button>
              </div>
            )}

            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => setSoldNumber(null)}
            >
              Cerrar
            </Button>
          </div>
        )}
      </Modal>

      {/* ── Sorteo aleatorio — confirmación ──────────────────────────────── */}
      <Modal
        open={drawConfirm}
        onClose={() => setDrawConfirm(false)}
        title="Realizar sorteo"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Se seleccionará aleatoriamente un ganador entre los{' '}
            <strong>{raffle.sold_count}</strong> números vendidos.
            Esta acción queda registrada en el historial.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDrawConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRunDraw}
              loading={runDraw.isPending}
              leftIcon={<Shuffle className="w-4 h-4" />}
            >
              Sortear ahora
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Celebración del ganador (ambos flows) ────────────────────────── */}
      <Modal
        open={!!drawResult}
        onClose={() => setDrawResult(null)}
        title="🎉 ¡Tenemos ganador!"
      >
        {drawResult && (
          <div className="text-center space-y-4 py-4">
            <div className="text-7xl font-black text-brand-600">
              #{drawResult.number}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{drawResult.name ?? 'Sin datos'}</p>
              <p className="text-gray-500">{drawResult.phone ?? ''}</p>
            </div>
            <Button className="w-full justify-center" onClick={() => setDrawResult(null)}>
              Cerrar
            </Button>
          </div>
        )}
      </Modal>

    </div>
  )
}

// ─── Ticket tile ───────────────────────────────────────────────────────────────

function TicketTile({
  number,
  isWinner,
  onClick,
}: {
  number: RaffleNumber
  isWinner: boolean
  onClick: () => void
}) {
  const isSold = number.status === 'sold'

  const initials = number.buyer_name
    ? number.buyer_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  // Winner tile — amber/gold, not interactive
  if (isWinner) {
    return (
      <div
        title={`#${number.number} — Ganador: ${number.buyer_name}`}
        className={cn(
          'aspect-square rounded-md text-xs font-semibold',
          'bg-amber-400 text-amber-900 shadow-sm',
          'flex items-center justify-center',
        )}
      >
        <Crown className="w-3 h-3" />
      </div>
    )
  }

  // Sold tile — brand color, clickable (opens buyer detail modal)
  if (isSold) {
    return (
      <button
        onClick={onClick}
        title={`#${number.number} — ${number.buyer_name ?? 'Vendido'} · Click para ver detalles`}
        className={cn(
          'aspect-square rounded-md text-xs font-semibold transition-all',
          'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1',
          'bg-brand-500 text-white shadow-sm',
          'hover:bg-brand-600 hover:ring-2 hover:ring-brand-300 hover:ring-offset-1',
          'cursor-pointer',
        )}
      >
        {initials ?? number.number}
      </button>
    )
  }

  // Available tile — white, opens sell modal
  return (
    <button
      onClick={onClick}
      title={`Vender #${number.number}`}
      className={cn(
        'aspect-square rounded-md text-xs font-semibold transition-all',
        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-1',
        'bg-white border-2 border-gray-200 text-gray-600',
        'hover:border-brand-400 hover:text-brand-600 hover:shadow-sm cursor-pointer',
      )}
    >
      {number.number}
    </button>
  )
}