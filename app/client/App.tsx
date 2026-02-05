import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryProvider } from './core/providers/QueryProvider';
import { CampaignProvider } from './core/providers/CampaignProvider';
import { ModeProvider } from './core/providers/ModeProvider';
import { AuthProvider, useAuth } from './core/providers/AuthProvider';
import { SceneNPCsProvider } from './core/providers/SceneNPCsProvider';
import { SceneShipsProvider } from './core/providers/SceneShipsProvider';
import { InitiativeProvider } from './core/providers/InitiativeProvider';
import { Layout } from './core/Layout';
import { Dashboard } from './core/Dashboard';
import { ModuleRouter } from './core/ModuleRouter';
import { Settings } from './core/Settings';
import { LoginPage } from './core/LoginPage';

// DM module-specific views
import { PlaybookMoveDetail } from './modules/player-characters/PlaybookMoveDetail';

// Player views
import { PlayerLayout } from './player/PlayerLayout';
import { PlayerDashboard } from './player/PlayerDashboard';
import { PlayerNPCList } from './player/PlayerNPCList';
import { PlayerNPCDetail } from './player/PlayerNPCDetail';
import { PlayerLoreList } from './player/PlayerLoreList';
import { PlayerLoreDetail } from './player/PlayerLoreDetail';
import { PlayerLocationList } from './player/PlayerLocationList';
import { PlayerLocationDetail } from './player/PlayerLocationDetail';
import { PlayerRulesList } from './player/PlayerRulesList';
import { PlayerRulesDetail } from './player/PlayerRulesDetail';
import { PlayerLivePlay } from './player/PlayerLivePlay';
import { PlayerCharacterList } from './player/PlayerCharacterList';
import { PlayerCharacterDetail } from './player/PlayerCharacterDetail';
import { PlayerCharacterEdit } from './player/PlayerCharacterEdit';
import { PlayerPlaybookMoveDetail } from './player/PlayerPlaybookMoveDetail';
import { PlayerShipList } from './player/PlayerShipList';
import { PlayerShipDetail } from './player/PlayerShipDetail';
import { PlayerSessionNotesList } from './player/PlayerSessionNotesList';
import { PlayerSessionNotesDetail } from './player/PlayerSessionNotesDetail';
import { PlayerSessionNotesEdit } from './player/PlayerSessionNotesEdit';
import { PlayerFactionList } from './player/PlayerFactionList';
import { PlayerFactionDetail } from './player/PlayerFactionDetail';
import { PlayerProjectList } from './player/PlayerProjectList';
import { PlayerProjectDetail } from './player/PlayerProjectDetail';
import { PlayerTacticalBoardList, PlayerTacticalBoardDetail } from './player/PlayerTacticalBoard';
import { PlayerStoryArtefactList } from './player/PlayerStoryArtefactList';
import { PlayerStoryArtefactDetail } from './player/PlayerStoryArtefactDetail';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Fallback for modules without player views
function PlayerModuleNotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        Module not available
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        This module doesn't have a player view.
      </p>
      <Link
        to="/player"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

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
          <Route path="modules/player-characters/:fileId/moves/:moveId" element={<PlaybookMoveDetail />} />
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
          <Route path="modules/rules" element={<PlayerRulesList />} />
          <Route path="modules/rules/:fileId" element={<PlayerRulesDetail />} />
          <Route path="modules/player-characters" element={<PlayerCharacterList />} />
          <Route path="modules/player-characters/:fileId" element={<PlayerCharacterDetail />} />
          <Route path="modules/player-characters/:fileId/edit" element={<PlayerCharacterEdit />} />
          <Route path="modules/player-characters/:fileId/moves/:moveId" element={<PlayerPlaybookMoveDetail />} />
          <Route path="modules/ships" element={<PlayerShipList />} />
          <Route path="modules/ships/:fileId" element={<PlayerShipDetail />} />
          <Route path="modules/session-notes" element={<PlayerSessionNotesList />} />
          <Route path="modules/session-notes/new" element={<PlayerSessionNotesEdit />} />
          <Route path="modules/session-notes/:fileId" element={<PlayerSessionNotesDetail />} />
          <Route path="modules/session-notes/:fileId/edit" element={<PlayerSessionNotesEdit />} />
          <Route path="modules/factions" element={<PlayerFactionList />} />
          <Route path="modules/factions/:fileId" element={<PlayerFactionDetail />} />
          <Route path="modules/projects" element={<PlayerProjectList />} />
          <Route path="modules/projects/:fileId" element={<PlayerProjectDetail />} />
          <Route path="modules/live-play" element={<PlayerLivePlay />} />
          <Route path="modules/tactical-board" element={<PlayerTacticalBoardList />} />
          <Route path="tactical-board/:boardId" element={<PlayerTacticalBoardDetail />} />
          <Route path="modules/story-artefacts" element={<PlayerStoryArtefactList />} />
          <Route path="modules/story-artefacts/:fileId" element={<PlayerStoryArtefactDetail />} />
          {/* Catch-all for modules without player views */}
          <Route path="modules/*" element={<PlayerModuleNotFound />} />
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
            <SceneNPCsProvider>
              <SceneShipsProvider>
                <InitiativeProvider>
                  <AppRoutes />
                </InitiativeProvider>
              </SceneShipsProvider>
            </SceneNPCsProvider>
          </BrowserRouter>
        </CampaignProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
