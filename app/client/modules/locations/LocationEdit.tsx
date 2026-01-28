import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, X, FolderTree } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { ImageUpload } from '../../components/ImageUpload';
import { LinkAutocomplete } from '../../components/LinkAutocomplete';
import {
  LOCATION_TYPE_SUGGESTIONS,
  type LocationFrontmatter,
  type CelestialData,
} from '@shared/schemas/location';
import { CelestialFields } from './components/CelestialFields';

export function LocationEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update, list } = useFiles('locations');

  const isNew = fileId === 'new';
  const { data: existingLocation, isLoading } = get(isNew ? '' : fileId || '');
  const allLocations = list.data || [];

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [typeInputValue, setTypeInputValue] = useState('');
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [description, setDescription] = useState('');
  const [parent, setParent] = useState<string | undefined>();
  const [parentName, setParentName] = useState<string | undefined>();
  const [parentSearchValue, setParentSearchValue] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // DM Only fields
  const [secrets, setSecrets] = useState('');
  const [plotHooks, setPlotHooks] = useState('');
  const [notes, setNotes] = useState('');

  // Celestial data
  const [celestial, setCelestial] = useState<CelestialData | undefined>();

  // Tree view settings
  const [treeRoot, setTreeRoot] = useState(false);

  const typeInputRef = useRef<HTMLInputElement>(null);
  const typeSuggestionsRef = useRef<HTMLDivElement>(null);

  // Load existing data
  useEffect(() => {
    if (existingLocation && !isNew) {
      const fm = existingLocation.frontmatter as unknown as LocationFrontmatter;
      setName(fm.name);
      setType(fm.type || '');
      setTypeInputValue(fm.type || '');
      setDescription(fm.description || '');
      setParent(fm.parent);
      setTags((fm.tags || []).join(', '));
      setContent(existingLocation.content);
      setImage(fm.image);

      // Find parent name
      if (fm.parent) {
        const parentLoc = allLocations.find((loc) => loc.id === fm.parent);
        setParentName(parentLoc?.name);
      }

      // DM Only
      setSecrets(fm.dmOnly?.secrets || '');
      setPlotHooks(fm.dmOnly?.plotHooks || '');
      setNotes(fm.dmOnly?.notes || '');

      // Celestial data
      setCelestial(fm.celestial);

      // Tree settings
      setTreeRoot(fm.treeRoot || false);
    }
  }, [existingLocation, isNew, allLocations]);

  // Close type suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        typeSuggestionsRef.current &&
        !typeSuggestionsRef.current.contains(e.target as Node) &&
        typeInputRef.current &&
        !typeInputRef.current.contains(e.target as Node)
      ) {
        setShowTypeSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter type suggestions
  const filteredTypeSuggestions = LOCATION_TYPE_SUGGESTIONS.filter((t) =>
    t.toLowerCase().includes(typeInputValue.toLowerCase())
  );

  // Core save function that accepts optional overrides for immediate values
  const saveLocation = async (options?: { imageOverride?: string; skipNavigation?: boolean }) => {
    if (!name.trim()) return;

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const dmOnly =
      secrets || plotHooks || notes
        ? {
            secrets: secrets || undefined,
            plotHooks: plotHooks || undefined,
            notes: notes || undefined,
          }
        : undefined;

    // Use override if provided, otherwise use current state
    const imageValue = options?.imageOverride !== undefined ? options.imageOverride : image;

    if (isNew) {
      const newLocation = await create.mutateAsync({
        name: name.trim(),
        content,
        frontmatter: {
          type: type || undefined,
          description: description || undefined,
          parent: parent || undefined,
          tags: tagsArray,
          image: imageValue || undefined,
          treeRoot: treeRoot || undefined,
          celestial,
          dmOnly,
        },
      });
      if (!options?.skipNavigation) {
        navigate(`/modules/locations/${newLocation.frontmatter.id}`);
      }
    } else {
      await update.mutateAsync({
        fileId: fileId!,
        input: {
          name: name.trim(),
          content,
          frontmatter: {
            type: type || undefined,
            description: description || undefined,
            parent: parent || undefined,
            tags: tagsArray,
            image: imageValue || undefined,
            treeRoot: treeRoot || undefined,
            celestial,
            dmOnly,
          },
        },
      });
      if (!options?.skipNavigation) {
        navigate(`/modules/locations/${fileId}`);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await saveLocation();
    } catch (error) {
      console.error('Failed to save location:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save function for image uploads - saves with the new image path
  const handleImageAutoSave = async (newImagePath: string) => {
    try {
      await saveLocation({ imageOverride: newImagePath, skipNavigation: true });
    } catch (error) {
      console.error('Failed to auto-save after image upload:', error);
    }
  };

  const handleTypeSelect = (selectedType: string) => {
    setType(selectedType);
    setTypeInputValue(selectedType);
    setShowTypeSuggestions(false);
  };

  const handleTypeInputChange = (value: string) => {
    setTypeInputValue(value);
    setType(value);
    setShowTypeSuggestions(true);
  };

  const handleParentSelect = (id: string, locationName: string) => {
    setParent(id);
    setParentName(locationName);
    setParentSearchValue('');
  };

  const handleClearParent = () => {
    setParent(undefined);
    setParentName(undefined);
  };

  // Exclude self and descendants from parent options
  const getDescendantIds = (locationId: string): string[] => {
    const children = allLocations.filter((loc) => loc.parent === locationId);
    return [
      locationId,
      ...children.flatMap((child) => getDescendantIds(child.id)),
    ];
  };

  const excludeFromParent = isNew
    ? []
    : getDescendantIds(fileId!);

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
        to={isNew ? '/modules/locations' : `/modules/locations/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Locations' : 'Back to Location'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? 'New Location' : 'Edit Location'}
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

      {/* Location Image */}
      {!isNew && fileId && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Location Image</h2>
          <ImageUpload
            currentImage={image}
            entityId={fileId}
            uploadEndpoint="location-images"
            onUploadComplete={(path) => setImage(path)}
            onRemove={() => setImage(undefined)}
            autoSave={handleImageAutoSave}
          />
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Basic Information</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Verdant Prime, The Iron Citadel"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Type
          </label>
          <input
            ref={typeInputRef}
            type="text"
            value={typeInputValue}
            onChange={(e) => handleTypeInputChange(e.target.value)}
            onFocus={() => setShowTypeSuggestions(true)}
            placeholder="e.g., Planet, City, Building..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {showTypeSuggestions && filteredTypeSuggestions.length > 0 && (
            <div
              ref={typeSuggestionsRef}
              className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
            >
              {filteredTypeSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleTypeSelect(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Select a suggestion or type your own
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Parent Location
          </label>
          {parent && parentName ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground">
                {parentName}
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  ({parent})
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearParent}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <LinkAutocomplete
              moduleType="locations"
              value={parentSearchValue}
              onChange={setParentSearchValue}
              onSelect={handleParentSelect}
              placeholder="Search for parent location..."
              excludeIds={excludeFromParent}
            />
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Where is this location situated?
          </p>
        </div>

        {/* Tree Root Toggle - only show when there's a parent */}
        {parent && (
          <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3">
            <div className="flex h-6 items-center">
              <input
                type="checkbox"
                id="treeRoot"
                checked={treeRoot}
                onChange={(e) => setTreeRoot(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="treeRoot"
                className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"
              >
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                Show as tree root
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Display this location at the top level of the tree view, even though it has a parent.
                Useful for major regions that deserve their own hierarchy.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Short Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description shown on cards..."
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
            placeholder="e.g., capital, trade-hub, dangerous"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>
      </div>

      {/* Celestial Body Settings */}
      <CelestialFields
        value={celestial}
        onChange={setCelestial}
        hasParent={!!parent}
        locationId={isNew ? undefined : fileId}
      />

      {/* Content */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Description</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="Detailed description of this location. You can use Markdown formatting and link to other entries with [[module:id]] syntax."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown. Link to other entries: [[npcs:character-id]],
          [[lore:entry-id]], [[locations:place-id]]
        </p>
      </div>

      {/* DM Only */}
      <div className="space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="font-semibold text-amber-500">DM Only</h2>
        <p className="text-sm text-muted-foreground">
          This information is hidden from players.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Plot Hooks
          </label>
          <textarea
            value={plotHooks}
            onChange={(e) => setPlotHooks(e.target.value)}
            rows={3}
            placeholder="Story opportunities, adventure hooks..."
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
            rows={3}
            placeholder="Hidden history, secret inhabitants..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            DM Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Personal notes, reminders..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
