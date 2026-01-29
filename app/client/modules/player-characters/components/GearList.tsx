import { useState } from 'react';
import { Plus, X, Package } from 'lucide-react';
import type { GearItem } from '@shared/schemas/player-character';

interface GearListProps {
  gear: GearItem[];
  editable?: boolean;
  compact?: boolean;
  onChange?: (gear: GearItem[]) => void;
}

export function GearList({ gear, editable = false, compact = false, onChange }: GearListProps) {
  const [newItem, setNewItem] = useState('');
  const [newTags, setNewTags] = useState('');

  const handleAdd = () => {
    if (!newItem.trim() || !onChange) return;

    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onChange([...gear, { item: newItem.trim(), tags }]);
    setNewItem('');
    setNewTags('');
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    const newGear = [...gear];
    newGear.splice(index, 1);
    onChange(newGear);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Package className="h-3 w-3" />
        Gear
      </div>

      {gear.length === 0 && !editable ? (
        <p className="text-xs text-muted-foreground italic">No gear</p>
      ) : (
        <ul className={compact ? "flex flex-wrap gap-1" : "space-y-1"}>
          {gear.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-1 rounded bg-secondary/50 px-2 py-1 ${compact ? 'text-xs' : ''}`}
            >
              <span className={`${compact ? 'text-xs' : 'text-sm'} text-foreground`}>
                {item.item}
                {item.tags && item.tags.length > 0 && !compact && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    [{item.tags.join(', ')}]
                  </span>
                )}
                {item.notes && !compact && (
                  <span className="ml-1 text-xs text-muted-foreground italic">
                    — {item.notes}
                  </span>
                )}
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className={`flex min-w-0 gap-1 ${compact ? 'flex-wrap' : ''}`}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={compact ? "Add item" : "Item name"}
            className={`min-w-0 ${compact ? 'w-20' : 'flex-1'} rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring`}
          />
          {!compact && (
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tags (comma sep)"
              className="min-w-0 w-24 shrink rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
