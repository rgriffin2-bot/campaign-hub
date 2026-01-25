import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CampaignProvider } from './core/context/CampaignContext';
import { Layout } from './components/Layout';
import { CharacterDashboard } from './modules/characters/components/CharacterDashboard';
import { LocationDashboard } from './modules/locations/components/LocationDashboard';
import { LoreDashboard } from './modules/lore/components/LoreDashboard';
import { SessionDashboard } from './modules/sessions/components/SessionDashboard';
import { FactionDashboard } from './modules/factions/components/FactionDashboard';
import { MapDashboard } from './modules/maps/components/MapDashboard';
import { MapsLocationsDashboard } from './modules/maps-locations/components/MapsLocationsDashboard';

function App() {
  return (
    <BrowserRouter>
      <CampaignProvider>
        <Layout>
          <Routes>
            {/* Default route redirects to characters */}
            <Route path="/" element={<Navigate to="/characters" replace />} />

            {/* Characters routes */}
            <Route
              path="/characters"
              element={<CharacterDashboard mode="list" />}
            />
            <Route
              path="/characters/new"
              element={<CharacterDashboard mode="new" />}
            />
            <Route
              path="/characters/:id"
              element={<CharacterDashboard mode="detail" />}
            />
            <Route
              path="/characters/:id/edit"
              element={<CharacterDashboard mode="edit" />}
            />

            {/* Locations routes */}
            <Route
              path="/locations"
              element={<LocationDashboard mode="list" />}
            />
            <Route
              path="/locations/new"
              element={<LocationDashboard mode="new" />}
            />
            <Route
              path="/locations/:id"
              element={<LocationDashboard mode="detail" />}
            />
            <Route
              path="/locations/:id/edit"
              element={<LocationDashboard mode="edit" />}
            />

            {/* Maps + Locations routes */}
            <Route
              path="/maps-locations"
              element={<MapsLocationsDashboard />}
            />

            {/* Lore routes */}
            <Route
              path="/lore"
              element={<LoreDashboard mode="list" />}
            />
            <Route
              path="/lore/new"
              element={<LoreDashboard mode="new" />}
            />
            <Route
              path="/lore/:id"
              element={<LoreDashboard mode="detail" />}
            />
            <Route
              path="/lore/:id/edit"
              element={<LoreDashboard mode="edit" />}
            />

            {/* Sessions routes */}
            <Route
              path="/sessions"
              element={<SessionDashboard mode="list" />}
            />
            <Route
              path="/sessions/new"
              element={<SessionDashboard mode="new" />}
            />
            <Route
              path="/sessions/:id"
              element={<SessionDashboard mode="detail" />}
            />
            <Route
              path="/sessions/:id/edit"
              element={<SessionDashboard mode="edit" />}
            />

            {/* Factions routes */}
            <Route
              path="/factions"
              element={<FactionDashboard mode="list" />}
            />
            <Route
              path="/factions/new"
              element={<FactionDashboard mode="new" />}
            />
            <Route
              path="/factions/:id"
              element={<FactionDashboard mode="detail" />}
            />
            <Route
              path="/factions/:id/edit"
              element={<FactionDashboard mode="edit" />}
            />

            {/* Maps routes */}
            <Route
              path="/maps"
              element={<MapDashboard mode="list" />}
            />
            <Route
              path="/maps/new"
              element={<MapDashboard mode="new" />}
            />
            <Route
              path="/maps/:id"
              element={<MapDashboard mode="detail" />}
            />
            <Route
              path="/maps/:id/edit"
              element={<MapDashboard mode="edit" />}
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </CampaignProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h2 className="text-2xl font-bold mb-2">404 - Page Not Found</h2>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default App;
