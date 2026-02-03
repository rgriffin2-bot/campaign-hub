import { Outlet, NavLink, Link } from 'react-router-dom';
import { Scroll, Home, LogOut } from 'lucide-react';
import { useCampaign } from '../core/providers/CampaignProvider';
import { useAuth } from '../core/providers/AuthProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

export function PlayerLayout() {
  const { campaign, enabledModules, isLoading } = useCampaign();
  const { authEnabled, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Scroll className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            No Campaign Available
          </h2>
          <p className="mt-2 text-muted-foreground">
            The DM hasn't set up a campaign yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <Link to="/player" className="flex items-center gap-2">
          <Scroll className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            {campaign.name}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
            Player View
          </span>
          {authEnabled && (
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
          <nav className="flex-1 overflow-auto p-2">
            <ul className="space-y-1">
              {/* Dashboard Link */}
              <li>
                <NavLink
                  to="/player"
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
                  <span>Home</span>
                </NavLink>
              </li>

              {/* Module Links */}
              {enabledModules.length > 0 && (() => {
                // Only show modules that have player views
                const playerViewModules = ['npcs', 'lore', 'locations', 'rules', 'player-characters', 'live-play', 'ships', 'session-notes', 'factions', 'projects'];
                const visibleModules = enabledModules.filter(m => playerViewModules.includes(m.id));

                if (visibleModules.length === 0) return null;

                return (
                  <>
                    <li className="pt-4">
                      <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Browse
                      </span>
                    </li>
                    {visibleModules.map((module) => (
                      <li key={module.id}>
                        <NavLink
                          to={`/player/modules/${module.id}`}
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
                );
              })()}
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-sidebar-border p-3">
            <p className="text-xs text-muted-foreground">
              Read-only view
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
