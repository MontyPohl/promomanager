// src/pages/members/MembersPage.tsx

import { useState } from 'react'
import { UserPlus, Copy, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useMembers, useInviteMember } from '@/hooks/useQueries'
import {
  Button, Card, CardBody, CardHeader, EmptyState,
  Input, Modal, Select, PageSpinner, Badge,
} from '@/components/ui'
import { formatDate } from '@/utils'
import type { UserRole } from '@/types'
import { orgsApi } from '@/api/services'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = [
  { value: 'member', label: 'Miembro' },
  { value: 'admin', label: 'Administrador' },
]

export default function MembersPage() {
  const { activeOrg } = useAuthStore()
  const orgId = activeOrg?.id ?? ''

  const { data: members, isLoading } = useMembers(orgId)
  const inviteMember = useInviteMember(orgId)

  const [inviteModal, setInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as UserRole })
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    await inviteMember.mutateAsync(inviteForm)
    setInviteModal(false)
    setInviteForm({ email: '', role: 'member' })
  }

  const handleGenerateLink = async () => {
    try {
      const { invite_token } = await orgsApi.generateInviteLink(orgId)
      const link = `${window.location.origin}/join?token=${invite_token}`
      setInviteLink(link)
    } catch {
      toast.error('No se pudo generar el enlace')
    }
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Enlace copiado')
  }

  if (!activeOrg) {
    return (
      <div className="p-8">
        <EmptyState
          icon="👥"
          title="Seleccioná una organización"
          description="Elegí una organización para ver y gestionar sus miembros."
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Miembros</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeOrg.name}</p>
        </div>
        <Button onClick={() => setInviteModal(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
          Invitar miembro
        </Button>
      </div>

      {/* Invite link card */}
      <Card className="mb-6">
        <CardBody className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-800 text-sm">Enlace de invitación</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Compartí este enlace para que cualquier persona se una como miembro.
            </p>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            {inviteLink ? (
              <>
                <input
                  readOnly
                  value={inviteLink}
                  className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 w-64 truncate"
                />
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleGenerateLink}>
                Generar enlace
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Members table */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">
            Miembros ({members?.length ?? 0})
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <PageSpinner />
          ) : !members || members.length === 0 ? (
            <EmptyState
              icon="👤"
              title="Sin miembros aún"
              description="Invitá personas a tu organización por email o con un enlace."
              action={
                <Button size="sm" onClick={() => setInviteModal(true)}>
                  Invitar ahora
                </Button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Miembro</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Rol</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Ingresó</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 text-xs font-semibold">
                            {member.full_name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={member.role === 'admin' ? 'purple' : 'blue'}>
                        {member.role === 'admin' ? 'Admin' : 'Miembro'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(member.joined_at)}</td>
                    <td className="px-4 py-3">
                      <Badge color={member.is_active ? 'green' : 'gray'}>
                        {member.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Invite modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invitar miembro">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="persona@email.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            helperText="El usuario ya debe tener una cuenta en PromoManager"
            required
          />
          <Select
            label="Rol"
            value={inviteForm.role}
            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
            options={ROLE_OPTIONS}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setInviteModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={inviteMember.isPending}>
              Invitar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
