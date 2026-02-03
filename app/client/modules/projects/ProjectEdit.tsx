import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Clock } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { ProjectClock } from './components/ProjectClock';
import { CLOCK_SIZE_LABELS, type ProjectFrontmatter, type ClockSize } from '@shared/schemas/project';

export function ProjectEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = useFiles('projects');

  const isNew = fileId === 'new';
  const { data: existingProject, isLoading } = get(isNew ? '' : fileId || '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clockSize, setClockSize] = useState<ClockSize>('6');
  const [progress, setProgress] = useState(0);
  const [owner, setOwner] = useState('');
  const [phase, setPhase] = useState(1);
  const [totalPhases, setTotalPhases] = useState(1);
  const [tags, setTags] = useState('');
  const [hidden, setHidden] = useState(false);
  const [notes, setNotes] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingProject && !isNew) {
      const fm = existingProject.frontmatter as unknown as ProjectFrontmatter;
      setName(fm.name);
      setDescription(fm.description || '');
      setClockSize((fm.clockSize as ClockSize) || '6');
      setProgress(fm.progress ?? 0);
      setOwner(fm.owner || '');
      setPhase(fm.phase ?? 1);
      setTotalPhases(fm.totalPhases ?? 1);
      setTags((fm.tags || []).join(', '));
      setHidden(fm.hidden || false);
      setNotes(fm.notes || '');
      setContent(existingProject.content);
    }
  }, [existingProject, isNew]);

  // Reset progress if it exceeds new clock size
  useEffect(() => {
    const maxProgress = parseInt(clockSize);
    if (progress > maxProgress) {
      setProgress(maxProgress);
    }
  }, [clockSize, progress]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (isNew) {
        const newProject = await create.mutateAsync({
          name: name.trim(),
          content,
          frontmatter: {
            description: description || undefined,
            clockSize,
            progress,
            owner: owner || undefined,
            phase,
            totalPhases,
            tags: tagsArray,
            hidden,
            notes: notes || undefined,
          },
        });
        navigate(`/modules/projects/${newProject.frontmatter.id}`);
      } else {
        await update.mutateAsync({
          fileId: fileId!,
          input: {
            name: name.trim(),
            content,
            frontmatter: {
              description: description || undefined,
              clockSize,
              progress,
              owner: owner || undefined,
              phase,
              totalPhases,
              tags: tagsArray,
              hidden,
              notes: notes || undefined,
            },
          },
        });
        navigate(`/modules/projects/${fileId}`);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
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

  const maxProgress = parseInt(clockSize);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to={isNew ? '/modules/projects' : `/modules/projects/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Projects' : 'Back to Project'}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? 'New Project' : 'Edit Project'}
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
            placeholder="e.g., Repair the Navigation System"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of the project goal..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Owner */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Owner / Responsible
          </label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g., Captain Vex"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Clock Size and Preview */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Clock Size
            </label>
            <select
              value={clockSize}
              onChange={(e) => setClockSize(e.target.value as ClockSize)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(CLOCK_SIZE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              4 = simple, 6 = standard, 8 = complex
            </p>
          </div>

          <div className="flex flex-col items-center">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Preview
            </label>
            <div className="w-24 h-24">
              <ProjectClock
                size={maxProgress}
                progress={progress}
                editable
                onChange={setProgress}
              />
            </div>
          </div>
        </div>

        {/* Progress slider */}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Initial Progress: {progress} / {maxProgress}
          </label>
          <input
            type="range"
            min="0"
            max={maxProgress}
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Multi-phase */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Current Phase
            </label>
            <input
              type="number"
              min="1"
              max={totalPhases}
              value={phase}
              onChange={(e) => setPhase(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Total Phases
            </label>
            <input
              type="number"
              min="1"
              value={totalPhases}
              onChange={(e) => setTotalPhases(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Set to 1 for single-phase projects
            </p>
          </div>
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
            placeholder="e.g., repair, ship, urgent"
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

      {/* DM Notes */}
      <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <label className="mb-1 block text-sm font-medium text-amber-500">
          DM Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Private notes about this project..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Content */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-6">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Additional Notes (Markdown)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="Detailed notes about this project. What needs to happen, who's involved, etc."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown. Link to other entries: [[npcs:character-id]]
        </p>
      </div>
    </div>
  );
}
