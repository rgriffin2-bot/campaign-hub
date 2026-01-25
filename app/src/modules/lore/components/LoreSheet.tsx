import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { LoreEntry } from '../types';

interface LoreSheetProps {
  loreEntry: LoreEntry;
  onDelete?: () => void;
}

export function LoreSheet({ loreEntry, onDelete }: LoreSheetProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/lore')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lore
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/lore/${loreEntry.id}/edit`)}
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

      {/* Entry Name and Type */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{loreEntry.name}</h1>
        <p className="text-lg text-muted-foreground mt-2 capitalize">
          {loreEntry.lore_type}
          {(loreEntry as any).era && ` • ${(loreEntry as any).era}`}
        </p>
      </div>

      {/* Tags */}
      {loreEntry.tags && loreEntry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loreEntry.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      {loreEntry.description && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{loreEntry.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Related Entities */}
      <div className="grid gap-6 md:grid-cols-2">
        {loreEntry.related_factions && loreEntry.related_factions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Related Factions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loreEntry.related_factions.map(factionId => (
                  <div key={factionId} className="text-sm">
                    <button
                      onClick={() => navigate(`/factions/${factionId}`)}
                      className="text-primary hover:underline"
                    >
                      {factionId}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loreEntry.related_locations && loreEntry.related_locations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Related Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loreEntry.related_locations.map(locationId => (
                  <div key={locationId} className="text-sm">
                    <button
                      onClick={() => navigate(`/locations/${locationId}`)}
                      className="text-primary hover:underline"
                    >
                      {locationId}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loreEntry.related_characters && loreEntry.related_characters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Related Characters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loreEntry.related_characters.map(charId => (
                  <div key={charId} className="text-sm">
                    <button
                      onClick={() => navigate(`/characters/${charId}`)}
                      className="text-primary hover:underline"
                    >
                      {charId}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      {(loreEntry as any)._content && (
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown>{(loreEntry as any)._content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationships */}
      {loreEntry.relationships && loreEntry.relationships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loreEntry.relationships.map((rel, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="font-medium capitalize">{rel.type}:</span>
                  <span>{rel.target}</span>
                  {rel.description && (
                    <span className="text-muted-foreground">- {rel.description}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
