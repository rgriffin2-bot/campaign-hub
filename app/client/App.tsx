import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryProvider } from './core/providers/QueryProvider';
import { CampaignProvider } from './core/providers/CampaignProvider';
import { ModeProvider } from './core/providers/ModeProvider';
import { AuthProvider, useAuth } from './core/providers/AuthProvider';
import { Layout } from './core/Layout';
import { Dashboard } from './core/Dashboard';
import { ModuleRouter } from './core/ModuleRouter';
import { Settings } from './core/Settings';
import { LoginPage } from './core/LoginPage';

// Player views
import { PlayerLayout } from './player/PlayerLayout';
import { PlayerDashboard } from './player/PlayerDashboard';
import { PlayerNPCList } from './player/PlayerNPCList';
import { PlayerNPCDetail } from './player/PlayerNPCDetail';
import { PlayerLoreList } from './player/PlayerLoreList';
import { PlayerLoreDetail } from './player/PlayerLoreDetail';
import { PlayerLocationList } from './player/PlayerLocationList';
import { PlayerLocationDetail } from './player/PlayerLocationDetail';

// Auth guard component
function RequireAuth({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'dm' | 'player' }) {
  const { authenticated, authEnabled, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // If auth is not enabled, allow access
  if (!authEnabled) {
    return <>{children}</>;
  }

  // If not authenticated, show login
  if (!authenticated) {
    return <LoginPage />;
  }

  // Check role if required
  if (requiredRole === 'dm' && role !== 'dm') {
    // Player trying to access DM routes - redirect to player dashboard
    return <Navigate to="/player" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <ModeProvider>
      <Routes>
        {/* DM Routes - require DM auth */}
        <Route
          path="/"
          element={
            <RequireAuth requiredRole="dm">
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="modules/:moduleId" element={<ModuleRouter />} />
          <Route path="modules/:moduleId/:fileId" element={<ModuleRouter />} />
          <Route path="modules/:moduleId/:fileId/edit" element={<ModuleRouter />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Player Routes - require player or DM auth */}
        <Route
          path="/player"
          element={
            <RequireAuth>
              <PlayerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<PlayerDashboard />} />
          <Route path="modules/npcs" element={<PlayerNPCList />} />
          <Route path="modules/npcs/:fileId" element={<PlayerNPCDetail />} />
          <Route path="modules/lore" element={<PlayerLoreList />} />
          <Route path="modules/lore/:fileId" element={<PlayerLoreDetail />} />
          <Route path="modules/locations" element={<PlayerLocationList />} />
          <Route path="modules/locations/:fileId" element={<PlayerLocationDetail />} />
        </Route>
      </Routes>
    </ModeProvider>
  );
}

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <CampaignProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CampaignProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
