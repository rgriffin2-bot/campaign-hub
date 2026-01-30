import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Users, X } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { StatsBlock } from './components/StatsBlock';
import { GearList } from './components/GearList';
import { ImageUpload } from '../../components/ImageUpload';
import type {
  PlayerCharacterFrontmatter,
  ResourceLevel,
} from '@shared/schemas/player-character';
import { useQuery } from '@tanstack/react-query';

const resourceLevels: ResourceLevel[] = ['screwed', 'dry', 'light', 'covered', 'flush', 'swimming'];

const resourceLabels: Record<ResourceLevel, string> = {
  screwed: 'Screwed',
  dry: 'Dry',
  light: 'Light',
  covered: 'Covered',
  flush: 'Flush',
  swimming: 'Swimming in it',
};

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function PlayerCharacterEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { get, create, update } = useFiles('player-characters');

  const isNew = fileId === 'new';
  const { data: existingPC, isLoading } = get(isNew ? '' : fileId || '');

  // Fetch available playbook moves
  const { data: availableMoves } = useQuery({
    queryKey: ['available-moves', campaign?.id],
    queryFn: async () => {
      if (!campaign) return [];
      const res = await fetch('/api/modules/player-characters/available-moves');
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!campaign,
  });

  const [form, setForm] = useState<Partial<PlayerCharacterFrontmatter>>({
    name: '',
    player: '',
    portrait: '',
    pronouns: '',
    species: '',
    age: '',
    appearance: '',
    background: '',
    playbook: '',
    playbookMoves: [],
    stats: { poise: 0, insight: 0, grit: 0, presence: 0, resonance: 0 },
    pressure: 0,
    harm: {},
    resources: 'covered',
    experience: 0,
    luck: true,
    gear: [],
  });
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingPC && !isNew) {
      const fm = existingPC.frontmatter as unknown as PlayerCharacterFrontmatter;
      setForm({
        name: fm.name || '',
        player: fm.player || '',
        portrait: fm.portrait || '',
        pronouns: fm.pronouns || '',
        species: fm.species || '',
        age: fm.age || '',
        appearance: fm.appearance || '',
        background: fm.background || '',
        playbook: fm.playbook || '',
        playbookMoves: fm.playbookMoves || [],
        stats: fm.stats || { poise: 0, insight: 0, grit: 0, presence: 0, resonance: 0 },
        pressure: fm.pressure || 0,
        harm: fm.harm || {},
        resources: fm.resources || 'covered',
        experience: fm.experience || 0,
        luck: fm.luck ?? true,
        gear: fm.gear || [],
      });
      setContent(existingPC.content || '');
    }
  }, [existingPC, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.player) return;

    setSaving(true);
    try {
      const id = isNew ? generateId(form.name) : fileId!;

      const frontmatter = {
        id,
        ...form,
        playerVisible: true,
      };

      if (isNew) {
        await create.mutateAsync({ name: form.name!, frontmatter, content });
      } else {
        await update.mutateAsync({
          fileId: id,
          input: { frontmatter, content },
        });
      }

      navigate(`/modules/player-characters/${id}`);
    } catch (error) {
      console.error('Error saving character:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMove = (moveId: string) => {
    if (!form.playbookMoves?.includes(moveId)) {
      setForm((prev) => ({
        ...prev,
        playbookMoves: [...(prev.playbookMoves || []), moveId],
      }));
    }
  };

  const handleRemoveMove = (moveId: string) => {
    setForm((prev) => ({
      ...prev,
      playbookMoves: (prev.playbookMoves || []).filter((id) => id !== moveId),
    }));
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to={isNew ? '/modules/player-characters' : `/modules/player-characters/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Characters' : 'Back to Character'}
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {isNew ? 'New Character' : `Edit ${form.name}`}
            </h1>
          </div>
          <button
            type="submit"
            disabled={saving || !form.name || !form.player}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Portrait */}
        {!isNew && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">Portrait</h2>
            <ImageUpload
              currentImage={form.portrait}
              entityId={fileId || ''}
              uploadEndpoint="pc-portraits"
              onUploadComplete={(path) => setForm((prev) => ({ ...prev, portrait: path }))}
              onRemove={() => setForm((prev) => ({ ...prev, portrait: '' }))}
            />
          </div>
        )}

        {/* Basic Info */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Basic Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Player *
              </label>
              <input
                type="text"
                value={form.player}
                onChange={(e) => setForm((prev) => ({ ...prev, player: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Playbook
              </label>
              <input
                type="text"
                value={form.playbook}
                onChange={(e) => setForm((prev) => ({ ...prev, playbook: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Pronouns
              </label>
              <input
                type="text"
                value={form.pronouns}
                onChange={(e) => setForm((prev) => ({ ...prev, pronouns: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Species
              </label>
              <input
                type="text"
                value={form.species}
                onChange={(e) => setForm((prev) => ({ ...prev, species: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Age
              </label>
              <input
                type="text"
                value={form.age}
                onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground">
              Appearance
            </label>
            <textarea
              value={form.appearance}
              onChange={(e) => setForm((prev) => ({ ...prev, appearance: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground">
              Background
            </label>
            <textarea
              value={form.background}
              onChange={(e) => setForm((prev) => ({ ...prev, background: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Stats</h2>
          <StatsBlock
            stats={form.stats || { poise: 0, insight: 0, grit: 0, presence: 0, resonance: 0 }}
            editable
            onChange={(stats) => setForm((prev) => ({ ...prev, stats }))}
          />
        </div>

        {/* Trackers */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Trackers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Pressure (0-5)
              </label>
              <input
                type="number"
                min={0}
                max={5}
                value={form.pressure}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pressure: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)),
                  }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Resources
              </label>
              <select
                value={form.resources}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, resources: e.target.value as ResourceLevel }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {resourceLevels.map((level) => (
                  <option key={level} value={level}>
                    {resourceLabels[level]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Experience (0-5)
              </label>
              <input
                type="number"
                min={0}
                max={5}
                value={form.experience}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    experience: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)),
                  }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Luck
              </label>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.luck}
                  onChange={(e) => setForm((prev) => ({ ...prev, luck: e.target.checked }))}
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Has luck</span>
              </label>
            </div>
          </div>

          {/* Harm */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground">Harm</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Old Wounds</label>
                <input
                  type="text"
                  value={form.harm?.oldWounds || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      harm: { ...prev.harm, oldWounds: e.target.value || undefined },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mild</label>
                <input
                  type="text"
                  value={form.harm?.mild || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      harm: { ...prev.harm, mild: e.target.value || undefined },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Moderate</label>
                <input
                  type="text"
                  value={form.harm?.moderate || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      harm: { ...prev.harm, moderate: e.target.value || undefined },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Severe</label>
                <input
                  type="text"
                  value={form.harm?.severe || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      harm: { ...prev.harm, severe: e.target.value || undefined },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gear */}
        <div className="rounded-lg border border-border bg-card p-4">
          <GearList
            gear={form.gear || []}
            editable
            onChange={(gear) => setForm((prev) => ({ ...prev, gear }))}
          />
        </div>

        {/* Playbook Moves */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Playbook Moves</h2>

          {/* Selected moves */}
          {form.playbookMoves && form.playbookMoves.length > 0 && (
            <div className="mb-4 space-y-2">
              {form.playbookMoves.map((moveId) => {
                const move = availableMoves?.find((m: { id: string }) => m.id === moveId);
                return (
                  <div
                    key={moveId}
                    className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2"
                  >
                    <span className="text-sm text-foreground">
                      {move?.name || moveId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMove(moveId)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available moves to add */}
          {availableMoves && availableMoves.length > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground">Add a move:</label>
              <select
                value=""
                onChange={(e) => e.target.value && handleAddMove(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a move...</option>
                {availableMoves
                  .filter((m: { id: string }) => !form.playbookMoves?.includes(m.id))
                  .map((move: { id: string; name: string }) => (
                    <option key={move.id} value={move.id}>
                      {move.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {(!availableMoves || availableMoves.length === 0) && (
            <p className="text-xs text-muted-foreground">
              Add rules with category "playbook-move" to enable move selection.
            </p>
          )}
        </div>

        {/* Notes (markdown content) */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Notes</h2>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Additional notes, session developments, goals, etc. (Markdown supported)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground font-mono text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </form>
    </div>
  );
}
