// src/App.tsx
// ────────────
// Route config. Protected routes require authentication.
// Unauthenticated users are redirected to /login.

import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import AppLayout from '@/components/layout/AppLayout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// App pages
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EventsPage from '@/pages/events/EventsPage'
import RafflePage from '@/pages/raffles/RafflePage'
import MembersPage from '@/pages/members/MembersPage'
import MemberSalesPage from '@/pages/members/MemberSalesPage'
import FinancesPage from '@/pages/finances/FinancesPage'

// ─── Auth guard ────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Protected */}
      <Route
        path="/"
        element={<ProtectedRoute><AppLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:eventId/raffle" element={<RafflePage />} />
        <Route path="raffles" element={<EventsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/sales" element={<MemberSalesPage />} />
        <Route path="finances" element={<FinancesPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
