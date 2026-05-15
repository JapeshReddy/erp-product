import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarState = 'expanded' | 'collapsed' | 'hidden'

interface UIState {
  sidebarState: SidebarState
  mobileOpen:   boolean

  toggleSidebar:  () => void
  setMobileOpen:  (open: boolean) => void
  setSidebarState:(s: SidebarState) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarState: 'expanded',
      mobileOpen:   false,

      setSidebarState: (s) => set({ sidebarState: s }),

      toggleSidebar: () => {
        if (window.innerWidth <= 768) {
          set((state) => ({ mobileOpen: !state.mobileOpen }))
        } else {
          set((state) => ({
            sidebarState: state.sidebarState === 'expanded' ? 'collapsed' : 'expanded',
          }))
        }
      },

      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    {
      name: 'erp-ui',
      // Only persist the sidebar expand/collapse preference — not ephemeral mobile state
      partialize: (state) => ({ sidebarState: state.sidebarState }),
    }
  )
)
