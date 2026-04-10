// src/pages/events/EventsPage.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useEvents, useCreateEvent, useUpdateEvent } from '@/hooks/useQueries'
import {
  Button, Card, CardBody, CardHeader, EmptyState,
  Modal, Input, Select, PageSpinner, Badge,
} from '@/components/ui'
import {
  EVENT_STATUS_COLORS, EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS, formatDate, cn,
} from '@/utils'
import type { Event, EventType } from '@/types'

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const STATUS_OPTIONS = Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export default function EventsPage() {
  const { activeOrg } = useAuthStore()
  const orgId = activeOrg?.id ?? ''
  const { data: events, isLoading } = useEvents(orgId)
  const createEvent = useCreateEvent(orgId)
  const navigate = useNavigate()

  const [createModal, setCreateModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    event_type: 'raffle' as EventType,
    description: '',
    event_date: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createEvent.mutateAsync({
      ...form,
      event_date: form.event_date || undefined,
      description: form.description || undefined,
    })
    setCreateModal(false)
    setForm({ name: '', event_type: 'raffle', description: '', event_date: '' })
  }

  if (!activeOrg) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<Calendar />}
          title="Seleccioná una organización"
          description="Elegí una organización desde el panel lateral para ver sus eventos."
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeOrg.name}</p>
        </div>
        <Button onClick={() => setCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo evento
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['Todos', 'Activos', 'Finalizados'].map((tab) => (
          <button
            key={tab}
            className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <PageSpinner />
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={<Calendar />}
          title="Sin eventos todavía"
          description="Creá tu primer evento: rifa, fiesta, venta de comida, torneo o bingo."
          action={
            <Button onClick={() => setCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Crear evento
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((event: Event) => (
            <EventCard
              key={event.id}
              event={event}
              orgId={orgId}
              onClick={() => navigate(`/events/${event.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nuevo evento">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre del evento"
            placeholder="Ej: Gran Rifa Anual 2025"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label="Tipo de evento"
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}
            options={EVENT_TYPE_OPTIONS}
          />
          <Input
            label="Descripción (opcional)"
            placeholder="Breve descripción..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Fecha del evento (opcional)"
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createEvent.isPending}>
              Crear evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── EventCard component ───────────────────────────────────────────────────────

function EventCard({
  event, orgId, onClick,
}: {
  event: Event
  orgId: string
  onClick: () => void
}) {
  const updateEvent = useUpdateEvent(orgId, event.id)

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = event.status === 'active' ? 'finished' : 'active'
    await updateEvent.mutateAsync({ status: newStatus })
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-brand-200 transition-all"
      onClick={onClick}
    >
      <CardBody className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{EVENT_TYPE_LABELS[event.event_type]?.split(' ')[0]}</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              EVENT_STATUS_COLORS[event.status]
            )}
          >
            {EVENT_STATUS_LABELS[event.status]}
          </span>
        </div>

        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{event.name}</h3>
        {event.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{event.description}</p>
        )}

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">{formatDate(event.event_date)}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleStatus}
              className="text-xs text-gray-500 hover:text-brand-600 font-medium transition-colors"
            >
              {event.status === 'active' ? 'Finalizar' : 'Reactivar'}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
