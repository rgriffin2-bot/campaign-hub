/**
 * PlayerLayout.tsx
 *
 * Top-level layout shell for the player (read-only) view.
 * Provides the header, sidebar navigation (collapsible + mobile drawer),
 * and content outlet. Only modules with player-facing views are shown.
 */
import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { Scroll, Home, LogOut, Menu, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useCampaign } from '../core/providers/CampaignProvider';
import { useAuth } from '../core/providers/AuthProvider';
import type { CampaignMeta } from '@shared/types/campaign';
import { DynamicIcon } from '../components/ui/DynamicIcon';
import { SidebarProvider, useSidebar } from '../core/providers/SidebarProvider';

/** Whitelist of module IDs that have corresponding player views */
const PLAYER_VIEW_MODULES = [
  'npcs', 'lore', 'locations', 'rules', 'player-characters',
  'live-play', 'ships', 'session-notes', 'factions', 'projects', 'tactical-board',
];

/** Campaign selector shown when the player hasn't picked a campaign yet */
function CampaignSelector({
  campaigns,
  selecting,
  onSelect,
  playerName,
  authEnabled,
  onLogout,
}: {
  campaigns: CampaignMeta[];
  selecting: boolean;
  onSelect: (id: string) => void;
  playerName: string | null;
  authEnabled: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Scroll className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            {playerName ? `Welcome, ${playerName}` : 'Select a Campaign'}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Choose a campaign to explore
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>No campaigns available yet.</p>
            <p className="text-sm mt-1">Ask your GM to create one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                disabled={selecting}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Scroll className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{c.name}</div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground truncate">{c.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {authEnabled && (
          <button
            onClick={onLogout}
            className="mt-6 flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

/** Inner layout that consumes sidebar context */
function PlayerLayoutInner() {
  const { campaign, campaigns, enabledModules, isLoading, selectCampaign } = useCampaign();
  const { authEnabled, logout, playerName } = useAuth();
  const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebar();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);

  // --- Loading and empty states ---
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
      <CampaignSelector
        campaigns={campaigns}
        selecting={selecting}
        onSelect={async (id) => {
          setSelecting(true);
          await selectCampaign(id);
          setSelecting(false);
        }}
        playerName={playerName}
        authEnabled={authEnabled}
        onLogout={logout}
      />
    );
  }

  const visibleModules = enabledModules.filter(m => PLAYER_VIEW_MODULES.includes(m.id));

  // Navigate and close the mobile drawer if open
  const handleNavClick = (to: string) => (e: React.MouseEvent) => {
    if (isMobileOpen) {
      e.preventDefault();
      navigate(to);
      setMobileOpen(false);
    }
  };

  /** Render the player sidebar content (used for both desktop and mobile drawer) */
  const renderSidebar = (opts: { collapsed: boolean; showToggle: boolean }) => (
    <aside
      className={`flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ${
        opts.collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <nav className="flex-1 overflow-auto p-2">
        <ul className="space-y-1">
          {/* Home Link */}
          <li>
            <NavLink
              to="/player"
              end
              onClick={handleNavClick('/player')}
              className={({ isActive }) =>
                `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  opts.collapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <Home className="h-4 w-4 shrink-0" />
              {!opts.collapsed && <span>Home</span>}
            </NavLink>
          </li>

          {/* Module Links — only modules with a player-facing view */}
          {visibleModules.length > 0 && (
            <>
              {!opts.collapsed && (
                <li className="pt-4">
                  <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Browse
                  </span>
                </li>
              )}
              {opts.collapsed && <li className="pt-2" />}

              {visibleModules.map((module) => (
                <li key={module.id}>
                  <NavLink
                    to={`/player/modules/${module.id}`}
                    onClick={handleNavClick(`/player/modules/${module.id}`)}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        opts.collapsed ? 'justify-center' : 'gap-3'
                      } ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`
                    }
                    title={opts.collapsed ? module.name : undefined}
                  >
                    <DynamicIcon name={module.icon} className="h-4 w-4 shrink-0" />
                    {!opts.collapsed && <span>{module.name}</span>}
                  </NavLink>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      {/* Footer with toggle — desktop only */}
      {opts.showToggle && (
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            title={opts.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {opts.collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="flex w-full items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">Read-only view</span>
                <ChevronLeft className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          {/* Hamburger menu — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/player" className="flex items-center gap-2">
            <Scroll className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              {campaign.name}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {campaigns.length > 1 && (
            <button
              onClick={() => {
                // POST to clear session campaign, then reload to show selector
                fetch('/api/player/campaigns/clear', { method: 'POST', credentials: 'include' })
                  .finally(() => window.location.reload());
              }}
              className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Switch campaign"
            >
              <RefreshCw className="h-3 w-3" />
              Switch
            </button>
          )}
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
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          {renderSidebar({ collapsed: isCollapsed, showToggle: true })}
        </div>

        {/* Mobile drawer overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-50 h-full">
              {renderSidebar({ collapsed: false, showToggle: false })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Root layout component for the player view. */
export function PlayerLayout() {
  return (
    <SidebarProvider>
      <PlayerLayoutInner />
    </SidebarProvider>
  );
}
