import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Save, RefreshCw } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import type { GeneratedNPC } from '@shared/schemas/npc';

export function NPCGenerate() {
  const navigate = useNavigate();
  const { create } = useFiles('npcs');

  const [prompt, setPrompt] = useState('');
  const [includeSecrets, setIncludeSecrets] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedNPC | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGenerated(null);

    try {
      const res = await fetch('/api/modules/npcs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), includeSecrets }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate NPC');
      }

      setGenerated(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate NPC');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generated) return;

    setIsSaving(true);
    try {
      const tagsArray = generated.tags || [];

      const frontmatter = {
        occupation: generated.occupation || undefined,
        location: generated.location || undefined,
        appearance: generated.appearance || undefined,
        personality: generated.personality || undefined,
        goals: generated.goals || undefined,
        dmOnly: generated.dmOnly || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      };

      const newNPC = await create.mutateAsync({
        name: generated.name,
        content: generated.content || '',
        frontmatter,
      });

      navigate(`/modules/npcs/${newNPC.frontmatter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save NPC');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/npcs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to NPCs
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Generate NPC with AI</h1>
      </div>

      {/* Generation Form */}
      {!generated && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Describe the NPC you want
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g., A gruff dwarven blacksmith who runs a shop in the merchant district. He's been in the city for decades and knows everyone's business."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The AI will use your campaign's lore to make the NPC fit your world.
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeSecrets}
              onChange={(e) => setIncludeSecrets(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span className="text-sm text-foreground">
              Include secrets and DM-only information
            </span>
          </label>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate NPC
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated Preview */}
      {generated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Generated NPC</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setGenerated(null)}
                className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <RefreshCw className="h-4 w-4" />
                Generate Again
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save NPC'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Preview Cards */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-xl font-bold text-foreground">{generated.name}</h3>
            {generated.occupation && (
              <p className="text-muted-foreground">{generated.occupation}</p>
            )}

            {generated.tags && generated.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {generated.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {generated.location && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Location
                </p>
                <p className="mt-1 text-foreground">{generated.location}</p>
              </div>
            )}

            {generated.goals && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Goals
                </p>
                <p className="mt-1 text-foreground">{generated.goals}</p>
              </div>
            )}
          </div>

          {generated.appearance && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Appearance
              </p>
              <p className="mt-1 text-foreground">{generated.appearance}</p>
            </div>
          )}

          {generated.personality && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Personality
              </p>
              <p className="mt-1 text-foreground">{generated.personality}</p>
            </div>
          )}

          {generated.dmOnly && (generated.dmOnly.secrets || generated.dmOnly.voice) && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-xs font-medium uppercase text-amber-500">
                DM Only
              </p>

              {generated.dmOnly.voice && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Voice & Mannerisms</p>
                  <p className="text-foreground">{generated.dmOnly.voice}</p>
                </div>
              )}

              {generated.dmOnly.secrets && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Secrets</p>
                  <p className="text-foreground">{generated.dmOnly.secrets}</p>
                </div>
              )}
            </div>
          )}

          {generated.content && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Additional Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {generated.content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
