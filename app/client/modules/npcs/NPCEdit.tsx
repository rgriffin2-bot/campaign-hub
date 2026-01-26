import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { RelatedCharacterInput, normalizeRelatedCharacters } from '../../components/RelatedCharacterInput';
import { PortraitUpload } from '../../components/PortraitUpload';
import type { NPCFrontmatter, NPCDmOnly, RelatedCharacter } from '@shared/schemas/npc';

export function NPCEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = useFiles('npcs');

  const isNew = fileId === 'new';
  const { data: existingNPC, isLoading } = get(isNew ? '' : fileId || '');

  // Form state
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [goals, setGoals] = useState('');
  const [secrets, setSecrets] = useState('');
  const [voice, setVoice] = useState('');
  const [dmNotes, setDmNotes] = useState('');
  const [relatedCharacters, setRelatedCharacters] = useState<RelatedCharacter[]>([]);
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [portrait, setPortrait] = useState<string | undefined>();
  const [portraitPosition, setPortraitPosition] = useState<{ x: number; y: number; scale: number } | undefined>();
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (existingNPC && !isNew) {
      const fm = existingNPC.frontmatter as unknown as NPCFrontmatter;
      const dmOnlyData = fm.dmOnly as NPCDmOnly | undefined;
      setName(fm.name);
      setOccupation(fm.occupation || '');
      setLocation(fm.location || '');
      setAppearance(fm.appearance || '');
      setPersonality(fm.personality || '');
      setGoals(fm.goals || '');
      setSecrets(dmOnlyData?.secrets || '');
      setVoice(dmOnlyData?.voice || '');
      setDmNotes(dmOnlyData?.notes || '');
      setRelatedCharacters(normalizeRelatedCharacters(fm.relatedCharacters || []));
      setTags((fm.tags || []).join(', '));
      setContent(existingNPC.content);
      setPortrait(fm.portrait);
      setPortraitPosition(fm.portraitPosition);
    }
  }, [existingNPC, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const dmOnly =
        secrets || voice || dmNotes
          ? {
              secrets: secrets || undefined,
              voice: voice || undefined,
              notes: dmNotes || undefined,
            }
          : undefined;

      const frontmatter = {
        occupation: occupation || undefined,
        location: location || undefined,
        appearance: appearance || undefined,
        personality: personality || undefined,
        goals: goals || undefined,
        dmOnly,
        relatedCharacters: relatedCharacters.length > 0 ? relatedCharacters : undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        portrait: portrait || undefined,
        portraitPosition: portraitPosition || undefined,
      };

      if (isNew) {
        const newNPC = await create.mutateAsync({
          name: name.trim(),
          content,
          frontmatter,
        });
        navigate(`/modules/npcs/${newNPC.frontmatter.id}`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: {
            name: name.trim(),
            content,
            frontmatter,
          },
        });
        navigate(`/modules/npcs/${fileId}`);
      }
    } catch (error) {
      console.error('Failed to save NPC:', error);
    } finally {
      setIsSaving(false);
    }
  };


  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to={isNew ? '/modules/npcs' : `/modules/npcs/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to NPCs' : 'Back to NPC'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? 'Create NPC' : 'Edit NPC'}
        </h1>
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Portrait */}
      {!isNew && fileId && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Portrait</h2>
          <PortraitUpload
            currentPortrait={portrait}
            portraitPosition={portraitPosition}
            npcId={fileId}
            onUploadComplete={(path, position) => {
              setPortrait(path);
              setPortraitPosition(position);
            }}
          />
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Basic Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Thaldrin Ironforge"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Occupation
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g., Blacksmith"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Ironhammer District"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., merchant, dwarf, ally"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Description</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Appearance
          </label>
          <textarea
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
            rows={2}
            placeholder="Physical description..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Personality
          </label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={2}
            placeholder="Personality traits and demeanor..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Goals
          </label>
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={2}
            placeholder="What they want or are working toward..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* DM Only */}
      <div className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="font-semibold text-amber-500">DM Only</h2>
        <p className="text-sm text-muted-foreground">
          This information is hidden from player-facing exports.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Voice & Mannerisms
          </label>
          <textarea
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            rows={2}
            placeholder="How they speak, accent, gestures..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Secrets
          </label>
          <textarea
            value={secrets}
            onChange={(e) => setSecrets(e.target.value)}
            rows={2}
            placeholder="Hidden information, true motivations..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            DM Notes
          </label>
          <textarea
            value={dmNotes}
            onChange={(e) => setDmNotes(e.target.value)}
            rows={2}
            placeholder="Session notes, plot hooks, etc..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Related Characters */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Related Characters</h2>
        <RelatedCharacterInput
          value={relatedCharacters}
          onChange={setRelatedCharacters}
          currentNpcId={fileId}
        />
      </div>

      {/* Additional Notes */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Additional Notes</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Extended backstory, session notes, etc. Supports Markdown and [[module:id]] links."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}
