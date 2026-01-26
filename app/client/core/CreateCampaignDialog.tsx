import { useState } from 'react';
import { X } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';

interface CreateCampaignDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCampaignDialog({
  open,
  onClose,
}: CreateCampaignDialogProps) {
  const { createCampaign, allModules } = useCampaign();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        modules: selectedModules,
      });
      setName('');
      setDescription('');
      setSelectedModules([]);
      onClose();
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Create New Campaign
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Campaign Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Curse of Strahd"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your campaign..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {allModules.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Enable Modules
              </label>
              <div className="max-h-40 space-y-2 overflow-auto">
                {allModules.map((module) => (
                  <label
                    key={module.id}
                    className="flex cursor-pointer items-center gap-2 rounded border border-border p-2 transition-colors hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                    <DynamicIcon name={module.icon} className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{module.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
