import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

async function updateCampaign(
  campaignId: string,
  updates: Record<string, unknown>
) {
  const res = await fetch(`/api/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export function Settings() {
  const { campaign, allModules } = useCampaign();
  const queryClient = useQueryClient();

  const [name, setName] = useState(campaign?.name || '');
  const [description, setDescription] = useState(campaign?.description || '');
  const [selectedModules, setSelectedModules] = useState<string[]>(
    campaign?.modules || []
  );

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      updateCampaign(campaign!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['active-campaign'] });
    },
  });

  const handleSave = () => {
    if (!campaign) return;

    updateMutation.mutate({
      name,
      description,
      modules: selectedModules,
    });
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  if (!campaign) {
    return (
      <div className="text-muted-foreground">No campaign selected.</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Campaign Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your campaign and modules.
        </p>
      </div>

      {/* Basic Info */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Basic Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Module Selection */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Enabled Modules
        </h2>
        {allModules.length > 0 ? (
          <div className="space-y-2">
            {allModules.map((module) => (
              <label
                key={module.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selectedModules.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
                <DynamicIcon name={module.icon} className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <span className="font-medium text-foreground">
                    {module.name}
                  </span>
                  {module.description && (
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No modules are registered. Modules will appear here when they are
            built and registered with the system.
          </p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {updateMutation.isSuccess && (
        <p className="text-center text-sm text-green-500">
          Settings saved successfully!
        </p>
      )}

      {updateMutation.isError && (
        <p className="text-center text-sm text-destructive">
          Failed to save settings. Please try again.
        </p>
      )}
    </div>
  );
}
