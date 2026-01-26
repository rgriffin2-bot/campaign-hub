import { useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LinkAutocomplete } from './LinkAutocomplete';
import { useFiles } from '../hooks/useFiles';
import type { RelatedCharacter } from '@shared/schemas/npc';

interface RelatedCharacterInputProps {
  value: RelatedCharacter[];
  onChange: (value: RelatedCharacter[]) => void;
  currentNpcId?: string;
}

// Helper to normalize old string format to new object format
export function normalizeRelatedCharacters(
  chars: (string | RelatedCharacter)[]
): RelatedCharacter[] {
  return chars.map((c) => {
    if (typeof c === 'string') {
      return { id: c, description: undefined };
    }
    return c;
  });
}

export function RelatedCharacterInput({
  value,
  onChange,
  currentNpcId,
}: RelatedCharacterInputProps) {
  const [searchValue, setSearchValue] = useState('');
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [descriptionValue, setDescriptionValue] = useState('');

  const { list } = useFiles('npcs');
  const allNPCs = list.data || [];

  // Get names for display
  const getNpcName = (id: string) => {
    const npc = allNPCs.find((n) => n.id === id);
    return npc?.name || id;
  };

  const handleAddCharacter = (id: string, _name: string) => {
    if (!value.find((c) => c.id === id)) {
      onChange([...value, { id, description: undefined }]);
    }
    setSearchValue('');
  };

  const handleRemoveCharacter = (id: string) => {
    onChange(value.filter((c) => c.id !== id));
  };

  const handleStartEditDescription = (id: string) => {
    const char = value.find((c) => c.id === id);
    setEditingDescription(id);
    setDescriptionValue(char?.description || '');
  };

  const handleSaveDescription = (id: string) => {
    onChange(
      value.map((c) =>
        c.id === id
          ? { ...c, description: descriptionValue.trim() || undefined }
          : c
      )
    );
    setEditingDescription(null);
    setDescriptionValue('');
  };

  const existingIds = value.map((c) => c.id);
  if (currentNpcId) {
    existingIds.push(currentNpcId);
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div>
        <LinkAutocomplete
          moduleType="npcs"
          value={searchValue}
          onChange={setSearchValue}
          onSelect={handleAddCharacter}
          placeholder="Search NPCs to add..."
          excludeIds={existingIds}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Type to search and add related characters
        </p>
      </div>

      {/* List of related characters */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((char) => (
            <div
              key={char.id}
              className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/modules/npcs/${char.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {getNpcName(char.id)}
                  </Link>
                  <span className="text-xs text-muted-foreground font-mono">
                    [[npcs:{char.id}]]
                  </span>
                </div>

                {editingDescription === char.id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      placeholder="Add a description of the relationship..."
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveDescription(char.id);
                        } else if (e.key === 'Escape') {
                          setEditingDescription(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSaveDescription(char.id)}
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEditDescription(char.id)}
                    className="mt-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {char.description ? (
                      <span>— {char.description}</span>
                    ) : (
                      <span className="italic">+ Add description</span>
                    )}
                  </button>
                )}
              </div>

              <button
                onClick={() => handleRemoveCharacter(char.id)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No related characters yet. Use the search above to add some.
        </p>
      )}
    </div>
  );
}
