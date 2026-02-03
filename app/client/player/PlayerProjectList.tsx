import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, Check } from 'lucide-react';
import { usePlayerFiles } from './hooks/usePlayerFiles';
import { ProjectClock } from '../modules/projects/components/ProjectClock';
import { type ClockSize } from '@shared/schemas/project';

export function PlayerProjectList() {
  const { list } = usePlayerFiles('projects');
  const [search, setSearch] = useState('');

  const projects = list.data || [];

  const filteredProjects = projects.filter((project) => {
    return (
      search === '' ||
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      (project.description as string | undefined)?.toLowerCase().includes(search.toLowerCase()) ||
      (project.owner as string | undefined)?.toLowerCase().includes(search.toLowerCase()) ||
      (project.tags as string[] | undefined)?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase())
      )
    );
  });

  // Sort by name
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Downtime Projects</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Projects Grid */}
      {sortedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {projects.length === 0 ? 'No projects yet' : 'No matches found'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {projects.length === 0
              ? 'The DM hasn\'t added any projects yet.'
              : 'Try adjusting your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((project) => {
            const clockSize = parseInt((project.clockSize as ClockSize) || '6');
            const progress = (project.progress as number) ?? 0;
            const owner = project.owner as string | undefined;
            const description = project.description as string | undefined;
            const phase = (project.phase as number) ?? 1;
            const totalPhases = (project.totalPhases as number) ?? 1;
            const isComplete = progress >= clockSize;

            return (
              <Link
                key={project.id}
                to={`/player/modules/projects/${project.id}`}
                className={`group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 ${
                  isComplete
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-border'
                }`}
              >
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
                    <ProjectClock size={clockSize} progress={progress} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground group-hover:text-primary text-center truncate">
                  {project.name}
                </h3>

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
              </Link>
            );
          })}
        </div>
      )}

      {/* Count */}
      {sortedProjects.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {sortedProjects.length} of {projects.length} projects
        </p>
      )}
    </div>
  );
}
