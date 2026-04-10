// src/store/authStore.ts
// ──────────────────────
// Global auth state using Zustand with localStorage persistence.
// Single source of truth for: token, current user, active organization.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Organization, User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  activeOrg: Organization | null

  // Actions
  setToken: (token: string) => void
  setUser: (user: User) => void
  setActiveOrg: (org: Organization) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      activeOrg: null,

      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setActiveOrg: (org) => set({ activeOrg: org }),

      logout: () => set({ token: null, user: null, activeOrg: null }),

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'promomanager-auth',  // localStorage key
      partialize: (state) => ({   // only persist these fields
        token: state.token,
        user: state.user,
        activeOrg: state.activeOrg,
      }),
    }
  )
)
