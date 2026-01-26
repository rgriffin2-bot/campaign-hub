import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

export function Sidebar() {
  const { enabledModules } = useCampaign();

  return (
    <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <nav className="flex-1 overflow-auto p-2">
        <ul className="space-y-1">
          {/* Dashboard Link */}
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {/* Module Links */}
          {enabledModules.length > 0 && (
            <>
              <li className="pt-4">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modules
                </span>
              </li>
              {enabledModules.map((module) => (
                <li key={module.id}>
                  <NavLink
                    to={`/modules/${module.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`
                    }
                  >
                    <DynamicIcon name={module.icon} className="h-4 w-4" />
                    <span>{module.name}</span>
                  </NavLink>
                </li>
              ))}
            </>
          )}

          {enabledModules.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              No modules enabled.
              <br />
              <span className="text-xs">
                Configure modules in campaign settings.
              </span>
            </li>
          )}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-sidebar-border p-3">
        <p className="text-xs text-muted-foreground">
          Campaign Hub v0.1.0
        </p>
      </div>
    </aside>
  );
}
