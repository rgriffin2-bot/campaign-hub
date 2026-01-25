import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Search, Plus } from 'lucide-react';
import type { Session } from '../types';

interface SessionListProps {
  sessions: Session[];
}

export function SessionList({ sessions }: SessionListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = sessions.filter((session) => {
      if (!query) return true;
      return (
        session.name.toLowerCase().includes(query) ||
        (session.title && session.title.toLowerCase().includes(query)) ||
        (session.summary && session.summary.toLowerCase().includes(query))
      );
    });

    return [...filtered].sort((a, b) => {
      const numberDiff = (b.session_number || 0) - (a.session_number || 0);
      if (numberDiff !== 0) return numberDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [sessions, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sessions</h2>
        <Button onClick={() => navigate('/sessions/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating your first session'}
          </p>
          {!searchTerm && (
            <Button onClick={() => navigate('/sessions/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/sessions/${session.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{session.name}</CardTitle>
                    <CardDescription>
                      Session {session.session_number}
                      {session.date && ` • ${session.date}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {session.summary && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {session.summary}
                  </p>
                </CardContent>
              )}
              {session.tags && session.tags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {session.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {session.tags.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                        +{session.tags.length - 3}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
