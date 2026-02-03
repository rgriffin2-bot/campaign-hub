import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Clock } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import { ProjectCard } from './components/ProjectCard';

export function ProjectList() {
  const { list } = useFiles('projects');
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Downtime Projects</h1>
        </div>
        <Link
          to="/modules/projects/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
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

      {/* Clock size legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span><strong>4 segments:</strong> Simple project</span>
        <span><strong>6 segments:</strong> Standard project</span>
        <span><strong>8 segments:</strong> Complex project</span>
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
              ? 'Create a project to track long-term goals with progress clocks.'
              : 'Try adjusting your search.'}
          </p>
          {projects.length === 0 && (
            <Link
              to="/modules/projects/new"
              className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
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
