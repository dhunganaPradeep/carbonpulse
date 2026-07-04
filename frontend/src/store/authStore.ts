import { create } from 'zustand'
import { authApi } from '../api/services'
import { tokenStore } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loadUser: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: Boolean(tokenStore.access),
  loading: false,
  login: async (email, password) => {
    set({ loading: true })
    try {
      const tokens = await authApi.login(email, password)
      tokenStore.set(tokens)
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } finally {
      set({ loading: false })
    }
  },
  loadUser: async () => {
    if (!tokenStore.access) {
      set({ isAuthenticated: false, user: null })
      return
    }
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      tokenStore.clear()
      set({ isAuthenticated: false, user: null })
    }
  },
  logout: async () => {
    const refresh = tokenStore.refresh
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        /* ignore */
      }
    }
    tokenStore.clear()
    set({ user: null, isAuthenticated: false })
  },
}))
