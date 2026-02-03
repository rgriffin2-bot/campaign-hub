import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Users, Rocket } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { ShipImageUpload } from './components/ShipImageUpload';
import type { ShipFrontmatter, ShipDmOnly } from '@shared/schemas/ship';

export function ShipEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = useFiles('ships');

  const isNew = fileId === 'new';
  const { data: existingShip, isLoading } = get(isNew ? '' : fileId || '');

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [shipClass, setShipClass] = useState('');
  const [owner, setOwner] = useState('');
  const [isCrewShip, setIsCrewShip] = useState(false);
  const [affiliations, setAffiliations] = useState('');
  const [appearance, setAppearance] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [notes, setNotes] = useState('');
  const [secrets, setSecrets] = useState('');
  const [dmNotes, setDmNotes] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [imagePosition, setImagePosition] = useState<{ x: number; y: number; scale: number } | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingShip && !isNew) {
      const fm = existingShip.frontmatter as unknown as ShipFrontmatter;
      const dmOnlyData = fm.dmOnly as ShipDmOnly | undefined;
      setName(fm.name);
      setType(fm.type || '');
      setShipClass(fm.class || '');
      setOwner(fm.owner || '');
      setIsCrewShip(fm.isCrewShip || false);
      setAffiliations((fm.affiliations || []).join(', '));
      setAppearance(fm.appearance || '');
      setCharacteristics((fm.characteristics || []).join(', '));
      setNotes(fm.notes || '');
      setSecrets(dmOnlyData?.secrets || '');
      setDmNotes(dmOnlyData?.notes || '');
      setTags((fm.tags || []).join(', '));
      setImage(fm.image);
      setImagePosition(fm.imagePosition);
      setContent(existingShip.content);
    }
  }, [existingShip, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const affiliationsArray = affiliations
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const characteristicsArray = characteristics
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const dmOnly =
        secrets || dmNotes
          ? {
              secrets: secrets || undefined,
              notes: dmNotes || undefined,
            }
          : undefined;

      const frontmatter = {
        type: type || undefined,
        class: shipClass || undefined,
        owner: owner || undefined,
        isCrewShip, // Always include, even when false
        affiliations: affiliationsArray.length > 0 ? affiliationsArray : undefined,
        appearance: appearance || undefined,
        characteristics: characteristicsArray.length > 0 ? characteristicsArray : undefined,
        notes: notes || undefined,
        dmOnly,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        image,
        imagePosition,
      };

      if (isNew) {
        const result = await create.mutateAsync({ name, frontmatter, content });
        navigate(`/modules/ships/${result.frontmatter.id}`);
      } else if (fileId) {
        await update.mutateAsync({ fileId, input: { name, frontmatter, content } });
        navigate(`/modules/ships/${fileId}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (path: string, position: { x: number; y: number; scale: number }) => {
    setImage(path);
    setImagePosition(position);
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
        to={isNew ? '/modules/ships' : `/modules/ships/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Ships' : 'Cancel'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? 'New Ship' : 'Edit Ship'}
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
      <div className="space-y-6">
        {/* Image Upload - only show for existing ships */}
        {!isNew && fileId && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 font-medium text-foreground">Ship Image</h3>
            <ShipImageUpload
              currentImage={image}
              imagePosition={imagePosition}
              shipId={fileId}
              onUploadComplete={handleImageUpload}
            />
          </div>
        )}

        {/* Basic Info */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 font-medium text-foreground">Basic Information</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ship name"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="starship, vehicle, mech, drone..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Class</label>
                <input
                  type="text"
                  value={shipClass}
                  onChange={(e) => setShipClass(e.target.value)}
                  placeholder="freighter, interceptor, capital..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Owner / Controller</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Person or faction"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Crew Ship Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCrewShip(!isCrewShip)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isCrewShip
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-accent'
                }`}
              >
                <Users className="h-4 w-4" />
                Crew Ship
              </button>
              <span className="text-sm text-muted-foreground">
                Mark as controlled by the player crew
              </span>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Affiliations</label>
              <input
                type="text"
                value={affiliations}
                onChange={(e) => setAffiliations(e.target.value)}
                placeholder="Comma-separated factions or characters"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 font-medium text-foreground">Description</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Appearance</label>
              <textarea
                value={appearance}
                onChange={(e) => setAppearance(e.target.value)}
                placeholder="Physical description..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Characteristics</label>
              <input
                type="text"
                value={characteristics}
                onChange={(e) => setCharacteristics(e.target.value)}
                placeholder="fast, heavily-armed, stealth-capable... (comma-separated)"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Notes (visible to players)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General notes about the ship..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated tags for search..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* DM Only Section */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mb-4 font-medium text-amber-500">DM Only</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Secrets</label>
              <textarea
                value={secrets}
                onChange={(e) => setSecrets(e.target.value)}
                placeholder="Hidden capabilities, true purpose..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">DM Notes</label>
              <textarea
                value={dmNotes}
                onChange={(e) => setDmNotes(e.target.value)}
                placeholder="Running notes, plot hooks..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Additional Content */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 font-medium text-foreground">Additional Content</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Extended markdown content..."
            rows={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
