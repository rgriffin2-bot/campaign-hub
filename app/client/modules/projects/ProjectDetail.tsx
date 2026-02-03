import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Clock, Eye, EyeOff, Minus, Plus, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFiles } from '../../hooks/useFiles';
import { useCampaign } from '../../core/providers/CampaignProvider';
import { MarkdownContent } from '../../components/MarkdownContent';
import { CopyableId } from '../../components/CopyableId';
import { ProjectClock } from './components/ProjectClock';
import { CLOCK_SIZE_LABELS, type ProjectFrontmatter, type ClockSize } from '@shared/schemas/project';

export function ProjectDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();
  const { get, delete: deleteMutation, toggleVisibility } = useFiles('projects');

  const { data: project, isLoading } = get(fileId || '');

  // Mutation for updating progress
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ProjectFrontmatter>) => {
      if (!campaign || !fileId) throw new Error('Missing campaign or file ID');

      const res = await fetch(
        `/api/campaigns/${campaign.id}/files/projects/${fileId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frontmatter: updates,
          }),
          credentials: 'include',
        }
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['files', campaign?.id, 'projects', fileId],
      });
      queryClient.invalidateQueries({
        queryKey: ['files', campaign?.id, 'projects'],
      });
    },
  });

  const handleDelete = async () => {
    if (!fileId) return;
    if (!confirm('Are you sure you want to delete this project?')) return;

    await deleteMutation.mutateAsync(fileId);
    navigate('/modules/projects');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Project not found
        </h3>
        <Link
          to="/modules/projects"
          className="mt-4 text-primary hover:underline"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const { content } = project;
  const frontmatter = project.frontmatter as unknown as ProjectFrontmatter;
  const isHidden = frontmatter.hidden === true;

  const clockSize = parseInt(frontmatter.clockSize || '6');
  const progress = frontmatter.progress ?? 0;
  const isComplete = progress >= clockSize;

  const handleToggleVisibility = () => {
    if (!fileId) return;
    toggleVisibility.mutate({ fileId, hidden: !isHidden });
  };

  const handleProgressChange = (delta: number) => {
    const newProgress = Math.max(0, Math.min(clockSize, progress + delta));
    if (newProgress !== progress) {
      updateMutation.mutate({ progress: newProgress });
    }
  };

  const handleClockChange = (newProgress: number) => {
    if (newProgress !== progress) {
      updateMutation.mutate({ progress: newProgress });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/modules/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header Card */}
      <div className={`rounded-lg border bg-card p-6 ${
        isComplete ? 'border-emerald-500/50' : 'border-border'
      }`}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            {/* Clock */}
            <div className="w-32 h-32 shrink-0">
              <ProjectClock
                size={clockSize}
                progress={progress}
                editable
                onChange={handleClockChange}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {frontmatter.name}
                </h1>
                {isComplete && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
                    <Check className="h-3 w-3" />
                    Complete
                  </span>
                )}
              </div>

              {frontmatter.owner && (
                <p className="mt-1 text-lg text-muted-foreground">
                  {frontmatter.owner}
                </p>
              )}

              {frontmatter.description && (
                <p className="mt-2 text-muted-foreground">
                  {frontmatter.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{CLOCK_SIZE_LABELS[frontmatter.clockSize as ClockSize || '6']}</span>
                {frontmatter.totalPhases && frontmatter.totalPhases > 1 && (
                  <span>Phase {frontmatter.phase || 1} of {frontmatter.totalPhases}</span>
                )}
              </div>

              {frontmatter.tags && frontmatter.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {frontmatter.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <CopyableId moduleType="projects" id={fileId || ''} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleToggleVisibility}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isHidden
                    ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                    : 'bg-secondary text-foreground hover:bg-accent'
                }`}
                title={isHidden ? 'Show to players' : 'Hide from players'}
              >
                {isHidden ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hidden
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Visible
                  </>
                )}
              </button>
              <Link
                to={`/modules/projects/${fileId}/edit`}
                className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>

            {/* Progress controls */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => handleProgressChange(-1)}
                disabled={progress <= 0 || updateMutation.isPending}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove progress"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="w-16 text-center text-lg font-medium">
                {progress} / {clockSize}
              </span>
              <button
                onClick={() => handleProgressChange(1)}
                disabled={progress >= clockSize || updateMutation.isPending}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                title="Add progress"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes / Content */}
      {content && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium text-foreground">Notes</h3>
          <MarkdownContent content={content} />
        </div>
      )}
    </div>
  );
}
