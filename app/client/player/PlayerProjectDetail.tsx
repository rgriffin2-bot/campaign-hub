import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Check } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { MarkdownContent } from '../components/MarkdownContent';
import { ProjectClock } from '../modules/projects/components/ProjectClock';
import { CLOCK_SIZE_LABELS, type ProjectFrontmatter, type ClockSize } from '@shared/schemas/project';

export function PlayerProjectDetail() {
  const { fileId } = useParams<{ fileId: string }>();
  const { get } = usePlayerFiles('projects');

  const { data: project, isLoading } = get(fileId || '');

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
          to="/player/modules/projects"
          className="mt-4 text-primary hover:underline"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const { content } = project;
  const frontmatter = project.frontmatter as unknown as ProjectFrontmatter;

  const clockSize = parseInt(frontmatter.clockSize || '6');
  const progress = frontmatter.progress ?? 0;
  const isComplete = progress >= clockSize;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        to="/player/modules/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header Card */}
      <div className={`rounded-lg border bg-card p-6 ${
        isComplete ? 'border-emerald-500/50' : 'border-border'
      }`}>
        <div className="flex items-start gap-6">
          {/* Clock */}
          <div className="w-32 h-32 shrink-0">
            <ProjectClock
              size={clockSize}
              progress={progress}
            />
          </div>

          <div className="min-w-0 flex-1">
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
          </div>
        </div>
      </div>

      {/* Progress Info */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-medium text-foreground">Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${(progress / clockSize) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground">
            {progress} / {clockSize}
          </span>
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
