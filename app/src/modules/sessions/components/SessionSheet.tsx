import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Session } from '../types';

interface SessionSheetProps {
  session: Session;
  onDelete?: () => void;
}

export function SessionSheet({ session, onDelete }: SessionSheetProps) {
  const navigate = useNavigate();

  const detailItems = [
    { label: 'Session Number', value: session.session_number?.toString() },
    { label: 'Date Played', value: session.date },
    { label: 'In-Game Date', value: session.in_game_date },
    { label: 'Episode Title', value: session.title },
  ].filter((item) => item.value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/sessions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/sessions/${session.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-4xl font-bold tracking-tight">{session.name}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Session {session.session_number}
          {session.date && ` • ${session.date}`}
        </p>
      </div>

      {session.tags && session.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {session.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {detailItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {detailItems.map((item) => (
                <div key={item.label} className="text-sm">
                  <div className="text-muted-foreground">{item.label}</div>
                  <div className="font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {session.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{session.summary}</p>
          </CardContent>
        </Card>
      )}

      {session.highlights && (
        <Card>
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{session.highlights}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {session.clues && (
          <Card>
            <CardHeader>
              <CardTitle>Clues & Discoveries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{session.clues}</p>
            </CardContent>
          </Card>
        )}

        {session.open_threads && (
          <Card>
            <CardHeader>
              <CardTitle>Open Threads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{session.open_threads}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {session.next_session && (
        <Card>
          <CardHeader>
            <CardTitle>Next Session Prep</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{session.next_session}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {session.characters_present && session.characters_present.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Characters Present</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.characters_present.map((id) => (
                <button
                  key={id}
                  onClick={() => navigate(`/characters/${id}`)}
                  className="block text-sm text-primary hover:underline"
                >
                  {id}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {session.locations_visited && session.locations_visited.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Locations Visited</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.locations_visited.map((id) => (
                <button
                  key={id}
                  onClick={() => navigate(`/locations/${id}`)}
                  className="block text-sm text-primary hover:underline"
                >
                  {id}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {session.npcs_met && session.npcs_met.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>NPCs Met</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.npcs_met.map((id) => (
                <button
                  key={id}
                  onClick={() => navigate(`/characters/${id}`)}
                  className="block text-sm text-primary hover:underline"
                >
                  {id}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {session.loot && session.loot.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Loot & Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {session.loot.map((item) => (
                <div key={item} className="text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {(session as any)._content && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown>{(session as any)._content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
