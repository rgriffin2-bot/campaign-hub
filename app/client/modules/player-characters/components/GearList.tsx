import { useState } from 'react';
import { Plus, X, Package, Pencil, Check } from 'lucide-react';
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editItem, setEditItem] = useState('');
  const [editTags, setEditTags] = useState('');

  const handleAdd = () => {
    if (!newItem.trim() || !onChange) return;

    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onChange([...gear, { item: newItem.trim(), tags: tags.length > 0 ? tags : undefined }]);
    setNewItem('');
    setNewTags('');
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    const newGear = [...gear];
    newGear.splice(index, 1);
    onChange(newGear);
  };

  const handleStartEdit = (index: number) => {
    const item = gear[index];
    setEditingIndex(index);
    setEditItem(item.item);
    setEditTags(item.tags?.join(', ') || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !onChange || !editItem.trim()) return;

    const tags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newGear = [...gear];
    newGear[editingIndex] = {
      ...newGear[editingIndex],
      item: editItem.trim(),
      tags: tags.length > 0 ? tags : undefined,
    };
    onChange(newGear);
    setEditingIndex(null);
    setEditItem('');
    setEditTags('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditItem('');
    setEditTags('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
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
              {editingIndex === i ? (
                // Editing mode
                <div className="flex flex-1 flex-col gap-1">
                  <input
                    type="text"
                    value={editItem}
                    onChange={(e) => setEditItem(e.target.value)}
                    onKeyDown={handleEditKeyPress}
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Item name"
                  />
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    onKeyDown={handleEditKeyPress}
                    className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Tags (comma sep)"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <span className={`${compact ? 'text-xs' : 'text-sm'} text-foreground`}>
                    {item.item}
                    {item.tags && item.tags.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
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
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(i)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Edit item"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(i)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remove item"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="flex flex-col gap-1">
          <div className="flex min-w-0 gap-1">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Item name"
              className={`min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring`}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tags (comma sep)"
            className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
    </div>
  );
}
