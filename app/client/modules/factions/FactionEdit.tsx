import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { affinityLabels, FACTION_TYPE_LABELS, type FactionType, type FactionFrontmatter } from '@shared/schemas/faction';

export function FactionEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = useFiles('factions');

  const isNew = fileId === 'new';
  const { data: existingFaction, isLoading } = get(isNew ? '' : fileId || '');

  const [name, setName] = useState('');
  const [type, setType] = useState<FactionType>('other');
  const [description, setDescription] = useState('');
  const [affinity, setAffinity] = useState(0);
  const [location, setLocation] = useState('');
  const [leader, setLeader] = useState('');
  const [tags, setTags] = useState('');
  const [hidden, setHidden] = useState(false);
  const [dmSecrets, setDmSecrets] = useState('');
  const [dmNotes, setDmNotes] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingFaction && !isNew) {
      const fm = existingFaction.frontmatter as unknown as FactionFrontmatter;
      setName(fm.name);
      setType(fm.type || 'other');
      setDescription(fm.description || '');
      setAffinity(fm.affinity ?? 0);
      setLocation(fm.location || '');
      setLeader(fm.leader || '');
      setTags((fm.tags || []).join(', '));
      setHidden(fm.hidden || false);
      setDmSecrets(fm.dmOnly?.secrets || '');
      setDmNotes(fm.dmOnly?.notes || '');
      setContent(existingFaction.content);
    }
  }, [existingFaction, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const dmOnly = dmSecrets || dmNotes
        ? {
            secrets: dmSecrets || undefined,
            notes: dmNotes || undefined,
          }
        : undefined;

      if (isNew) {
        const newFaction = await create.mutateAsync({
          name: name.trim(),
          content,
          frontmatter: {
            type,
            description: description || undefined,
            affinity,
            location: location || undefined,
            leader: leader || undefined,
            tags: tagsArray,
            hidden,
            dmOnly,
          },
        });
        navigate(`/modules/factions/${newFaction.frontmatter.id}`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: {
            name: name.trim(),
            content,
            frontmatter: {
              type,
              description: description || undefined,
              affinity,
              location: location || undefined,
              leader: leader || undefined,
              tags: tagsArray,
              hidden,
              dmOnly,
            },
          },
        });
        navigate(`/modules/factions/${fileId}`);
      }
    } catch (error) {
      console.error('Failed to save faction:', error);
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
        to={isNew ? '/modules/factions' : `/modules/factions/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Factions' : 'Back to Faction'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? 'New Faction' : 'Edit Faction'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Merchant Guild"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Type and Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FactionType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(FACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Port Haven"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Leader */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Leader
          </label>
          <input
            type="text"
            value={leader}
            onChange={(e) => setLeader(e.target.value)}
            placeholder="e.g., Guildmaster Thorne"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Short Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A brief description shown on the faction card..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Affinity */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Starting Affinity
          </label>
          <div className="flex items-center gap-2">
            {[-3, -2, -1, 0, 1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAffinity(value)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  value === affinity
                    ? `${getAffinityBgColor(value)} text-white`
                    : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {value > 0 ? `+${value}` : value}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {affinityLabels[affinity]}
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., trade, wealthy, influential"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hidden"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="hidden" className="text-sm text-foreground">
            Hidden from players
          </label>
        </div>
      </div>

      {/* DM Only Section */}
      <div className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <h3 className="font-medium text-amber-500">DM Only</h3>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Secrets
          </label>
          <textarea
            value={dmSecrets}
            onChange={(e) => setDmSecrets(e.target.value)}
            rows={3}
            placeholder="Hidden information about this faction..."
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
            rows={3}
            placeholder="Notes for running this faction..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Notes / Content */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-6">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Notes (Markdown)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Detailed notes about this faction. Supports Markdown formatting and [[links]] to other entries."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown. Link to other entries: [[npcs:character-id]] or [[factions:faction-id]]
        </p>
      </div>
    </div>
  );
}

function getAffinityBgColor(affinity: number): string {
  if (affinity >= 3) return 'bg-emerald-500';
  if (affinity === 2) return 'bg-green-500';
  if (affinity === 1) return 'bg-lime-500';
  if (affinity === 0) return 'bg-gray-500';
  if (affinity === -1) return 'bg-yellow-500';
  if (affinity === -2) return 'bg-orange-500';
  return 'bg-red-500'; // -3
}
