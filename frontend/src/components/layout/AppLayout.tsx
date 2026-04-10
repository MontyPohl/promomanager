// src/components/layout/AppLayout.tsx
// ─────────────────────────────────────
// Main dashboard shell: sidebar + top bar + content area.

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, Calendar, Home, LogOut, Settings,
  Ticket, Users, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useOrganizations } from '@/hooks/useQueries'
import { cn } from '@/utils'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard',       label: 'Inicio',      icon: Home },
  { to: '/events',          label: 'Eventos',     icon: Calendar },
  { to: '/raffles',         label: 'Rifas',       icon: Ticket },
  { to: '/members',         label: 'Miembros',    icon: Users },
  { to: '/finances',        label: 'Finanzas',    icon: BarChart3 },
]

export default function AppLayout() {
  const { user, activeOrg, setActiveOrg, logout } = useAuthStore()
  const { data: orgs } = useOrganizations()
  const navigate = useNavigate()
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">PromoManager</span>
          </div>
        </div>

        {/* Org switcher */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setOrgMenuOpen(!orgMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 text-xs font-bold">
                  {activeOrg?.name?.[0]?.toUpperCase() ?? 'O'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700 truncate">
                {activeOrg?.name ?? 'Seleccionar org'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>

          {orgMenuOpen && orgs && (
            <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => { setActiveOrg(org); setOrgMenuOpen(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors',
                    activeOrg?.id === org.id ? 'text-brand-600 font-medium' : 'text-gray-700'
                  )}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-700 text-sm font-semibold">
                {user?.full_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
