import { Link } from 'react-router-dom';
import { EyeOff, Minus, Plus, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCampaign } from '../../../core/providers/CampaignProvider';
import { ProjectClock } from './ProjectClock';
import { type ClockSize } from '@shared/schemas/project';
import type { FileMetadata } from '@shared/types/file';

interface ProjectCardProps {
  project: FileMetadata;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { campaign } = useCampaign();
  const queryClient = useQueryClient();

  const clockSize = parseInt((project.clockSize as ClockSize) || '6');
  const progress = (project.progress as number) ?? 0;
  const owner = project.owner as string | undefined;
  const description = project.description as string | undefined;
  const isHidden = project.hidden as boolean | undefined;
  const phase = (project.phase as number) ?? 1;
  const totalPhases = (project.totalPhases as number) ?? 1;

  const isComplete = progress >= clockSize;

  // Mutation for updating progress
  const updateProgress = useMutation({
    mutationFn: async (newProgress: number) => {
      if (!campaign) throw new Error('No active campaign');

      const res = await fetch(
        `/api/campaigns/${campaign.id}/files/projects/${project.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frontmatter: { progress: newProgress },
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
        queryKey: ['files', campaign?.id, 'projects'],
      });
    },
  });

  const handleProgressChange = (delta: number) => {
    const newProgress = Math.max(0, Math.min(clockSize, progress + delta));
    if (newProgress !== progress) {
      updateProgress.mutate(newProgress);
    }
  };

  return (
    <div
      className={`group relative rounded-lg border bg-card p-4 transition-colors ${
        isComplete
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : isHidden
            ? 'border-dashed border-muted'
            : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Hidden indicator */}
      {isHidden && (
        <div className="absolute right-2 top-2">
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Completed badge */}
      {isComplete && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
          <Check className="h-3 w-3" />
          Complete
        </div>
      )}

      {/* Clock centered at top */}
      <div className="flex justify-center mb-3">
        <div className="w-20 h-20">
          <ProjectClock
            size={clockSize}
            progress={progress}
          />
        </div>
      </div>

      {/* Title */}
      <Link to={`/modules/projects/${project.id}`}>
        <h3 className="font-semibold text-foreground group-hover:text-primary text-center truncate">
          {project.name}
        </h3>
      </Link>

      {owner && (
        <p className="text-xs text-muted-foreground mt-0.5 text-center">{owner}</p>
      )}

      {description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 text-center">
          {description}
        </p>
      )}

      {/* Progress indicator */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {progress} / {clockSize} segments
        {totalPhases > 1 && ` • Phase ${phase}/${totalPhases}`}
      </p>

      {/* Progress controls */}
      <div className="flex justify-center items-center gap-2 mt-3">
        <button
          onClick={() => handleProgressChange(-1)}
          disabled={progress <= 0 || updateProgress.isPending}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          title="Remove progress"
        >
          <Minus className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleProgressChange(1)}
          disabled={progress >= clockSize || updateProgress.isPending}
          className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          title="Add progress"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Tags */}
      {(project.tags as string[] | undefined)?.length ? (
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {(project.tags as string[]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
