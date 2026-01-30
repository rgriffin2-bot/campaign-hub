import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Settings, Scroll, Plus, LogOut, Users, Copy, Check, ExternalLink } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { useAuth } from './providers/AuthProvider';
import { CreateCampaignDialog } from './CreateCampaignDialog';

export function Header() {
  const { campaign, campaigns, switchCampaign } = useCampaign();
  const { authEnabled, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [playerLinkDropdown, setPlayerLinkDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch tunnel URL for player link
  const { data: tunnelData } = useQuery({
    queryKey: ['tunnel-url'],
    queryFn: async () => {
      const res = await fetch('/api/tunnel-url', { credentials: 'include' });
      const data = await res.json();
      return data.data?.url || null;
    },
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });

  const tunnelUrl = tunnelData as string | null;
  const playerUrl = tunnelUrl ? `${tunnelUrl}/player` : `${window.location.origin}/player`;
  const isRemoteAvailable = !!tunnelUrl;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(playerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

        {/* Player Link Button */}
        <div className="relative">
          <button
            onClick={() => setPlayerLinkDropdown(!playerLinkDropdown)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isRemoteAvailable
                ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            title={isRemoteAvailable ? 'Remote player access available' : 'Local player access only'}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Player Link</span>
          </button>

          {playerLinkDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setPlayerLinkDropdown(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-border bg-card p-3 shadow-lg">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {isRemoteAvailable ? 'Remote Player Link (via ngrok)' : 'Local Player Link'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-secondary px-2 py-1 text-xs text-foreground">
                        {playerUrl}
                      </code>
                      <button
                        onClick={handleCopyLink}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90"
                        title="Copy link"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isRemoteAvailable && (
                    <p className="text-xs text-green-500">
                      ✓ Remote access enabled - players can connect from anywhere
                    </p>
                  )}

                  {!isRemoteAvailable && (
                    <p className="text-xs text-muted-foreground">
                      Players on your local network can use this link. For remote access, start Campaign Hub with the app launcher to enable ngrok.
                    </p>
                  )}

                  <div className="flex gap-2">
                    <a
                      href={playerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Player View
                    </a>
                  </div>
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
