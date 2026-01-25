import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Faction } from '../types';

interface FactionSheetProps {
  faction: Faction;
  onDelete?: () => void;
}

export function FactionSheet({ faction, onDelete }: FactionSheetProps) {
  const navigate = useNavigate();

  const detailItems = [
    { label: 'Type', value: faction.faction_type },
    { label: 'Motto', value: faction.motto },
    { label: 'Leader', value: faction.leader },
    { label: 'Headquarters', value: faction.headquarters },
  ].filter((item) => item.value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/factions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Factions
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/factions/${faction.id}/edit`)}
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
        <h1 className="text-4xl font-bold tracking-tight">{faction.name}</h1>
        <p className="text-lg text-muted-foreground mt-2 capitalize">
          {faction.faction_type}
        </p>
      </div>

      {faction.tags && faction.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {faction.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {faction.description && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{faction.description}</p>
          </CardContent>
        </Card>
      )}

      {detailItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faction Details</CardTitle>
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

      <div className="grid gap-6 md:grid-cols-2">
        {faction.goals && (
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{faction.goals}</p>
            </CardContent>
          </Card>
        )}

        {faction.secret_goals && (
          <Card>
            <CardHeader>
              <CardTitle>Secret Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{faction.secret_goals}</p>
            </CardContent>
          </Card>
        )}

        {faction.resources && (
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{faction.resources}</p>
            </CardContent>
          </Card>
        )}

        {faction.history && (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{faction.history}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {faction.territory && faction.territory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Territory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {faction.territory.map((locationId) => (
                <button
                  key={locationId}
                  onClick={() => navigate(`/locations/${locationId}`)}
                  className="block text-sm text-primary hover:underline"
                >
                  {locationId}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {faction.members && faction.members.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Notable Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {faction.members.map((memberId) => (
                <button
                  key={memberId}
                  onClick={() => navigate(`/characters/${memberId}`)}
                  className="block text-sm text-primary hover:underline"
                >
                  {memberId}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {(faction as any)._content && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown>{(faction as any)._content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
