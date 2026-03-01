/**
 * SidebarProvider -- manages sidebar collapse (desktop) and mobile drawer state.
 *
 * Two independent pieces of state:
 * - isCollapsed: desktop toggle (persisted to localStorage)
 * - isMobileOpen: mobile drawer open/closed (transient, not persisted)
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = 'sidebar-collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Read initial collapsed state from localStorage (default: expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer state — not persisted
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable, just use in-memory state
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

/** Hook to access sidebar state. Must be used inside a SidebarProvider. */
export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
}
