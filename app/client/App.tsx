import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './core/providers/QueryProvider';
import { CampaignProvider } from './core/providers/CampaignProvider';
import { Layout } from './core/Layout';
import { Dashboard } from './core/Dashboard';
import { ModuleRouter } from './core/ModuleRouter';
import { Settings } from './core/Settings';

export function App() {
  return (
    <QueryProvider>
      <CampaignProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="modules/:moduleId" element={<ModuleRouter />} />
              <Route path="modules/:moduleId/:fileId" element={<ModuleRouter />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CampaignProvider>
    </QueryProvider>
  );
}
