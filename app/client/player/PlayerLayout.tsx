/**
 * PlayerLayout.tsx
 *
 * Top-level layout shell for the player (read-only) view.
 * Uses the shared Sidebar (variant="player") and a simple player header.
 * Only modules with player-facing views are shown in the sidebar.
 */
import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Scroll, LogOut, Menu, RefreshCw } from 'lucide-react';
import { useCampaign } from '../core/providers/CampaignProvider';
import { useAuth } from '../core/providers/AuthProvider';
import { Sidebar } from '../core/Sidebar';
import { SidebarProvider, useSidebar } from '../core/providers/SidebarProvider';
import type { CampaignMeta } from '@shared/types/campaign';

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
  const { campaign, campaigns, isLoading, selectCampaign } = useCampaign();
  const { authEnabled, logout, playerName } = useAuth();
  const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebar();
  const [selecting, setSelecting] = useState(false);

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

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Player header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
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
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            variant="player"
            collapsed={isCollapsed}
            onToggle={toggleCollapsed}
          />
        </div>

        {/* Mobile drawer overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-50 h-full w-56">
              <Sidebar
                variant="player"
                onClose={() => setMobileOpen(false)}
                hideToggle
              />
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
