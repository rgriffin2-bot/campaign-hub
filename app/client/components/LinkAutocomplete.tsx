import { useState, useRef, useEffect } from 'react';
import { useFiles } from '../hooks/useFiles';
import type { FileMetadata } from '@shared/types/file';

interface LinkAutocompleteProps {
  moduleType: 'npcs' | 'lore';
  value: string;
  onChange: (value: string) => void;
  onSelect: (id: string, name: string) => void;
  placeholder?: string;
  excludeIds?: string[];
  className?: string;
}

export function LinkAutocomplete({
  moduleType,
  value,
  onChange,
  onSelect,
  placeholder,
  excludeIds = [],
  className = '',
}: LinkAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { list } = useFiles(moduleType);
  const allItems = list.data || [];

  // Filter items based on search value
  const filteredItems = allItems.filter((item) => {
    if (excludeIds.includes(item.id)) return false;
    const searchLower = value.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.id.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (item: FileMetadata) => {
    onSelect(item.id, item.name);
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      />

      {isOpen && filteredItems.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
        >
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent/50'
              }`}
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {item.id}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && value && filteredItems.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card p-3 text-sm text-muted-foreground shadow-lg">
          No matches found
        </div>
      )}
    </div>
  );
}
