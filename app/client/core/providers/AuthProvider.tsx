/**
 * AuthProvider -- manages authentication state (session check, login, logout).
 * On mount, checks the server for an existing session. When auth is disabled
 * server-side, `authEnabled` is false and the user is treated as authenticated.
 * Supports both GM login (password) and player login (name selection, no password).
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

type Role = 'dm' | 'player';

type LoginOpts = { password: string } | { playerName: string };

interface AuthState {
  authenticated: boolean;
  role: Role | null;
  playerName: string | null;
  authEnabled: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (opts: LoginOpts) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    role: null,
    playerName: null,
    authEnabled: true,
    loading: true,
  });

  // Verify if a valid session cookie exists on the server
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setState({
          authenticated: data.authenticated,
          role: data.role || null,
          playerName: data.playerName || null,
          authEnabled: data.authEnabled,
          loading: false,
        });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Failed to check session:', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Authenticate — accepts { password } for GM or { playerName } for players
  const login = useCallback(async (opts: LoginOpts) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          authenticated: true,
          role: data.role,
          playerName: data.playerName || null,
        }));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  // End the session on the server and reset local auth state
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setState((prev) => ({
      ...prev,
      authenticated: false,
      role: null,
      playerName: null,
    }));
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
