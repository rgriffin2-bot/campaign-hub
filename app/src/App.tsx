import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CampaignProvider } from './core/context/CampaignContext';
import { Layout } from './components/Layout';
import { CharacterDashboard } from './modules/characters/components/CharacterDashboard';

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

            {/* Placeholder routes for future modules */}
            <Route path="/locations" element={<ComingSoon module="Locations" />} />
            <Route path="/lore" element={<ComingSoon module="Lore" />} />
            <Route path="/sessions" element={<ComingSoon module="Sessions" />} />
            <Route path="/factions" element={<ComingSoon module="Factions" />} />
            <Route path="/maps" element={<ComingSoon module="Maps" />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </CampaignProvider>
    </BrowserRouter>
  );
}

function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h2 className="text-2xl font-bold mb-2">{module} Module</h2>
      <p className="text-muted-foreground">Coming in Phase 2</p>
    </div>
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
