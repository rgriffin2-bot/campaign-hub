import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableIdProps {
  moduleType: string;
  id: string;
}

export function CopyableId({ moduleType, id }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const linkSyntax = `[[${moduleType}:${id}]]`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkSyntax);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-mono rounded bg-secondary px-2 py-1">
        {linkSyntax}
      </span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-accent hover:text-foreground"
        title="Copy link syntax"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-green-500">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
