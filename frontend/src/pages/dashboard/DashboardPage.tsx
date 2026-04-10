// src/pages/dashboard/DashboardPage.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Calendar, Plus, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import {
  useOrganizations, useEvents, useCreateOrganization,
} from '@/hooks/useQueries'
import {
  Button, Card, CardBody, CardHeader, EmptyState,
  Modal, Input, PageSpinner, StatCard,
} from '@/components/ui'
import { EVENT_TYPE_LABELS, EVENT_STATUS_COLORS, EVENT_STATUS_LABELS, formatDate } from '@/utils'
import type { Event } from '@/types'

export default function DashboardPage() {
  const { user, activeOrg, setActiveOrg } = useAuthStore()
  const { data: orgs, isLoading: orgsLoading } = useOrganizations()
  const { data: events, isLoading: eventsLoading } = useEvents(activeOrg?.id ?? '')
  const createOrg = useCreateOrganization()
  const navigate = useNavigate()

  const [newOrgModal, setNewOrgModal] = useState(false)
  const [orgForm, setOrgForm] = useState({ name: '', description: '' })

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    const org = await createOrg.mutateAsync(orgForm)
    setActiveOrg(org)
    setNewOrgModal(false)
    setOrgForm({ name: '', description: '' })
  }

  const activeEvents = events?.filter((e) => e.status === 'active') ?? []
  const recentEvents = events?.slice(0, 5) ?? []

  if (orgsLoading) return <PageSpinner />

  // ── No orgs yet ───────────────────────────────────────────────────────────
  if (!orgs || orgs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎟️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Bienvenido, {user?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-gray-500 mb-6">
            Creá tu primera organización para empezar a gestionar eventos y rifas.
          </p>
          <Button onClick={() => setNewOrgModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Crear organización
          </Button>
        </div>

        <Modal open={newOrgModal} onClose={() => setNewOrgModal(false)} title="Nueva organización">
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Ej: Promoción 2025 - Escuela Nacional"
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
              required
            />
            <Input
              label="Descripción (opcional)"
              placeholder="Breve descripción de la organización"
              value={orgForm.description}
              onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => setNewOrgModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createOrg.isPending}>Crear</Button>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {activeOrg?.name ?? 'Seleccioná una organización'}
          </p>
        </div>
        <Button onClick={() => setNewOrgModal(true)} variant="secondary" size="sm" leftIcon={<Building2 className="w-4 h-4" />}>
          Nueva org
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Eventos activos" value={activeEvents.length} color="blue" />
        <StatCard label="Total eventos" value={events?.length ?? 0} />
        <StatCard
          label="Rifas activas"
          value={activeEvents.filter((e) => e.event_type === 'raffle').length}
          color="green"
        />
        <StatCard label="Organización" value={activeOrg?.name?.slice(0, 16) ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent events */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Eventos recientes</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/events')}
                  leftIcon={<ArrowRight className="w-3 h-3" />}
                >
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {eventsLoading ? (
                <PageSpinner />
              ) : recentEvents.length === 0 ? (
                <EmptyState
                  icon={<Calendar />}
                  title="Sin eventos aún"
                  description="Creá tu primer evento desde la sección Eventos."
                  action={
                    <Button size="sm" onClick={() => navigate('/events')}>
                      Ir a Eventos
                    </Button>
                  }
                />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Evento</th>
                      <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentEvents.map((event: Event) => (
                      <tr
                        key={event.id}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 font-medium text-gray-900">{event.name}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${EVENT_STATUS_COLORS[event.status]}`}>
                            {EVENT_STATUS_LABELS[event.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(event.event_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800">Acciones rápidas</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {[
                { label: '+ Nuevo evento', path: '/events', color: 'bg-brand-600 text-white hover:bg-brand-700' },
                { label: '🎟️ Ver rifas activas', path: '/raffles', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
                { label: '👥 Gestionar miembros', path: '/members', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                { label: '💰 Ver finanzas', path: '/finances', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
              ].map(({ label, path, color }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${color}`}
                >
                  {label}
                </button>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Create org modal */}
      <Modal open={newOrgModal} onClose={() => setNewOrgModal(false)} title="Nueva organización">
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Promoción 2025"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            required
          />
          <Input
            label="Descripción (opcional)"
            value={orgForm.description}
            onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setNewOrgModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createOrg.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
