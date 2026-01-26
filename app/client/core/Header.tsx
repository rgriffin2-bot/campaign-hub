import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Settings, Scroll, Plus, LogOut } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { useAuth } from './providers/AuthProvider';
import { CreateCampaignDialog } from './CreateCampaignDialog';

export function Header() {
  const { campaign, campaigns, switchCampaign } = useCampaign();
  const { authEnabled, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <Scroll className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            Campaign Hub
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Campaign Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <span className="max-w-[200px] truncate">
              {campaign?.name || 'Select Campaign'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-card shadow-lg">
                <div className="max-h-64 overflow-auto p-1">
                  {campaigns.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        switchCampaign(c.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full flex-col items-start rounded px-3 py-2 text-left transition-colors hover:bg-accent ${
                        campaign?.id === c.id ? 'bg-accent' : ''
                      }`}
                    >
                      <span className="font-medium text-foreground">
                        {c.name}
                      </span>
                      {c.description && (
                        <span className="text-xs text-muted-foreground">
                          {c.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border p-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setCreateDialogOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Campaign</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings Link */}
        <Link
          to="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Link>

        {/* Logout Button (only show if auth is enabled) */}
        {authEnabled && (
          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>

      <CreateCampaignDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </header>
  );
}
