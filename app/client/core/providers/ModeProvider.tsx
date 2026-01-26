import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type AppMode = 'dm' | 'player';

interface ModeContextValue {
  mode: AppMode;
  isPlayerMode: boolean;
  isDMMode: boolean;
  apiBasePath: string;
  linkBasePath: string;
}

const ModeContext = createContext<ModeContextValue | null>(null);

interface ModeProviderProps {
  children: ReactNode;
}

export function ModeProvider({ children }: ModeProviderProps) {
  const location = useLocation();

  const value = useMemo(() => {
    const isPlayerMode = location.pathname.startsWith('/player');
    const mode: AppMode = isPlayerMode ? 'player' : 'dm';

    return {
      mode,
      isPlayerMode,
      isDMMode: !isPlayerMode,
      // Player mode uses filtered API endpoints
      apiBasePath: isPlayerMode ? '/api/player' : '/api',
      // Links in markdown should go to player routes when in player mode
      linkBasePath: isPlayerMode ? '/player/modules' : '/modules',
    };
  }, [location.pathname]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
