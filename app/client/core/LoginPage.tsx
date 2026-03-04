/**
 * LoginPage - Role-based authentication screen.
 * Shows a selector for GM + configured player names.
 * Players sign in by selecting their name (no password).
 * Only the GM requires a password.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from './providers/AuthProvider';
import { Lock, Eye, EyeOff, AlertCircle, User, Shield } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [players, setPlayers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch available players on mount
  useEffect(() => {
    fetch('/api/auth/players')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.players) {
          setPlayers(data.players);
        }
      })
      .catch(() => {
        // If endpoint fails, just show GM-only login
      });
  }, []);

  const isGM = selected === '__gm__';

  const handlePlayerSelect = async (playerName: string) => {
    setError(null);
    setLoading(true);
    setSelected(playerName);

    const result = await login({ playerName });

    if (!result.success) {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
    // If success, AuthProvider will update state and we'll be redirected
  };

  const handleGMSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login({ password });

    if (!result.success) {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Campaign Hub</h1>
            <p className="text-slate-400 mt-2">Choose who you are</p>
          </div>

          {/* Role selector */}
          {!isGM && (
            <div className="space-y-2 mb-4">
              {/* GM button */}
              <button
                onClick={() => { setSelected('__gm__'); setError(null); }}
                disabled={loading}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-left text-white transition-colors hover:bg-slate-600 hover:border-indigo-500 disabled:opacity-50"
              >
                <Shield className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-medium">Game Master</div>
                  <div className="text-xs text-slate-400">Requires password</div>
                </div>
              </button>

              {/* Player buttons */}
              {players.map((name) => (
                <button
                  key={name}
                  onClick={() => handlePlayerSelect(name)}
                  disabled={loading}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-left text-white transition-colors hover:bg-slate-600 hover:border-indigo-500 disabled:opacity-50"
                >
                  <User className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div className="font-medium capitalize">{name}</div>
                </button>
              ))}
            </div>
          )}

          {/* GM password form */}
          {isGM && (
            <form onSubmit={handleGMSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => { setSelected(null); setError(null); setPassword(''); }}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                &larr; Back
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                <span className="text-white font-medium">Game Master</span>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter GM password"
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg mt-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
