import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import type { Character } from '../types';

interface CharacterSheetProps {
  character: Character;
  onDelete?: () => void;
}

export function CharacterSheet({ character, onDelete }: CharacterSheetProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/characters')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Characters
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/characters/${character.id}/edit`)}
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

      {/* Character Name and Type */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{character.name}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          {character.character_type === 'pc'
            ? `Player Character ${character.player ? `(played by ${character.player})` : ''}`
            : character.character_type === 'npc'
            ? 'Non-Player Character'
            : 'Historical Figure'}
        </p>
      </div>

      {/* Tags */}
      {character.tags && character.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {character.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {character.status && (
              <div>
                <span className="text-sm font-medium">Status:</span>
                <span className="ml-2 capitalize">{character.status}</span>
              </div>
            )}
            {character.pronouns && (
              <div>
                <span className="text-sm font-medium">Pronouns:</span>
                <span className="ml-2">{character.pronouns}</span>
              </div>
            )}
            {(character as any).species && (
              <div>
                <span className="text-sm font-medium">Species:</span>
                <span className="ml-2">{(character as any).species}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {character.stats && Object.keys(character.stats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(character.stats).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold">{String(value)}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {key}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appearance */}
      {character.appearance && (
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{character.appearance}</p>
          </CardContent>
        </Card>
      )}

      {/* Personality */}
      {character.personality && (
        <Card>
          <CardHeader>
            <CardTitle>Personality</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{character.personality}</p>
          </CardContent>
        </Card>
      )}

      {/* Background */}
      {character.background && (
        <Card>
          <CardHeader>
            <CardTitle>Background</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{character.background}</p>
          </CardContent>
        </Card>
      )}

      {/* Abilities */}
      {character.abilities && character.abilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Abilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {character.abilities.map((ability, index) => (
                <div key={index}>
                  <h4 className="font-medium">{ability.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ability.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Markdown Content */}
      {(character as any)._content && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans">
                {(character as any)._content}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationships */}
      {character.relationships && character.relationships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {character.relationships.map((rel, index) => (
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
