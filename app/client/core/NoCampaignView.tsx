import { useState } from 'react';
import { Scroll, Plus, FolderOpen } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { CreateCampaignDialog } from './CreateCampaignDialog';

export function NoCampaignView() {
  const { campaigns, switchCampaign } = useCampaign();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Scroll className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Campaign Hub
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your modular TTRPG campaign management dashboard
          </p>
        </div>

        {/* Existing Campaigns */}
        {campaigns.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-center text-sm font-medium text-muted-foreground">
              Select a Campaign
            </h2>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => switchCampaign(campaign.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {campaign.name}
                    </h3>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create New Campaign */}
        <div className="space-y-3">
          {campaigns.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Campaign</span>
          </button>
        </div>
      </div>

      <CreateCampaignDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}
