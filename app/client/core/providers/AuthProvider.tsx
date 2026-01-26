import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

type Role = 'dm' | 'player';

interface AuthState {
  authenticated: boolean;
  role: Role | null;
  authEnabled: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
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
    authEnabled: true,
    loading: true,
  });

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

  const login = useCallback(async (password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          authenticated: true,
          role: data.role,
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
