import { Link } from 'react-router-dom';
import { useMemo, createContext, useContext } from 'react';
import { useFiles } from '../hooks/useFiles';

interface MarkdownContentProps {
  content: string;
  className?: string;
  /** Base path for [[module:id]] links. Defaults to '/modules' */
  linkBasePath?: string;
}

// Context to hold valid IDs for each module
interface LinkValidationContextValue {
  validIds: Map<string, Set<string>>; // module -> set of valid IDs
  isLoading: boolean;
}

const LinkValidationContext = createContext<LinkValidationContextValue>({
  validIds: new Map(),
  isLoading: true,
});

// Provider that loads all module data for link validation
function LinkValidationProvider({ children }: { children: React.ReactNode }) {
  const { list: npcList } = useFiles('npcs');
  const { list: loreList } = useFiles('lore');

  const validIds = useMemo(() => {
    const map = new Map<string, Set<string>>();

    // NPCs - support both 'npcs' and 'npc' module names
    const npcIds = new Set((npcList.data || []).map((item) => item.id));
    map.set('npcs', npcIds);
    map.set('npc', npcIds); // Alias

    // Lore
    const loreIds = new Set((loreList.data || []).map((item) => item.id));
    map.set('lore', loreIds);

    return map;
  }, [npcList.data, loreList.data]);

  const isLoading = npcList.isLoading || loreList.isLoading;

  return (
    <LinkValidationContext.Provider value={{ validIds, isLoading }}>
      {children}
    </LinkValidationContext.Provider>
  );
}

// Hook to check if a link target exists
function useLinkExists(module: string, id: string): boolean | null {
  const { validIds, isLoading } = useContext(LinkValidationContext);

  if (isLoading) return null; // Still loading

  const moduleIds = validIds.get(module);
  if (!moduleIds) return null; // Unknown module

  return moduleIds.has(id);
}

// Validated link component
function ValidatedLink({
  module,
  id,
  displayName,
  linkBasePath,
  linkKey,
}: {
  module: string;
  id: string;
  displayName: string;
  linkBasePath: string;
  linkKey: string;
}) {
  const exists = useLinkExists(module, id);

  // If we can't determine validity or entry doesn't exist, show as deleted
  if (exists === false) {
    return (
      <span
        key={linkKey}
        className="text-muted-foreground line-through"
        title="Entry no longer exists"
      >
        {displayName}
      </span>
    );
  }

  return (
    <Link
      key={linkKey}
      to={`${linkBasePath}/${module}/${id}`}
      className="text-primary hover:underline"
    >
      {displayName}
    </Link>
  );
}

// Apply inline formatting (bold, italic, inline code) to text
function applyInlineFormatting(text: string, keyPrefix: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];

  // Combined regex for inline formatting
  // Order matters: check bold (**) before italic (*), and bold italic (***) first
  const inlineRegex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;

  let lastIndex = 0;
  let match;
  let matchCount = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[1];
    matchCount++;
    const key = `${keyPrefix}-${matchCount}`;

    if (match[2]) {
      // Bold italic (***)
      parts.push(
        <strong key={key} className="font-bold italic">{match[2]}</strong>
      );
    } else if (match[3]) {
      // Bold (**)
      parts.push(
        <strong key={key} className="font-bold">{match[3]}</strong>
      );
    } else if (match[4]) {
      // Italic (*)
      parts.push(
        <em key={key} className="italic">{match[4]}</em>
      );
    } else if (match[5]) {
      // Inline code (`)
      parts.push(
        <code key={key} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">{match[5]}</code>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Parsed link info for deferred rendering
interface ParsedLink {
  type: 'link';
  module: string;
  id: string;
  displayName: string;
  key: string;
}

interface ParsedText {
  type: 'text';
  content: (string | JSX.Element)[];
}

type ParsedContent = ParsedLink | ParsedText;

// Parse [[module:id]] links and apply inline formatting
// Returns parsed content that can be rendered with validation
function parseLinksToContent(text: string, keyPrefix: string = 'link'): ParsedContent[] {
  const linkRegex = /\[\[(\w+):([^\]]+)\]\]/g;
  const parts: ParsedContent[] = [];
  let lastIndex = 0;
  let match;
  let linkCount = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the match (with inline formatting)
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      parts.push({
        type: 'text',
        content: applyInlineFormatting(textBefore, `${keyPrefix}-pre-${linkCount}`),
      });
    }

    const [fullMatch, module, id] = match;
    const displayName = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    linkCount++;

    parts.push({
      type: 'link',
      module,
      id,
      displayName,
      key: `${keyPrefix}-${module}-${id}-${linkCount}`,
    });

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text (with inline formatting)
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    parts.push({
      type: 'text',
      content: applyInlineFormatting(textAfter, `${keyPrefix}-post`),
    });
  }

  // If no content was parsed, still apply inline formatting
  if (parts.length === 0) {
    return [{
      type: 'text',
      content: applyInlineFormatting(text, keyPrefix),
    }];
  }

  return parts;
}

// Render parsed content with validated links
function RenderParsedContent({
  content,
  linkBasePath
}: {
  content: ParsedContent[];
  linkBasePath: string;
}): JSX.Element {
  return (
    <>
      {content.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.content}</span>;
        }
        return (
          <ValidatedLink
            key={part.key}
            module={part.module}
            id={part.id}
            displayName={part.displayName}
            linkBasePath={linkBasePath}
            linkKey={part.key}
          />
        );
      })}
    </>
  );
}

// Simple markdown-to-JSX converter
function MarkdownRenderer({ content, linkBasePath }: { content: string; linkBasePath: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let listItems: ParsedContent[][] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      const listKey = elements.length;
      elements.push(
        <ListTag
          key={listKey}
          className={listType === 'ul' ? 'list-disc pl-6 my-2' : 'list-decimal pl-6 my-2'}
        >
          {listItems.map((item, i) => (
            <li key={i} className="text-foreground">
              <RenderParsedContent content={item} linkBasePath={linkBasePath} />
            </li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={elements.length}
            className="my-4 overflow-x-auto rounded-md bg-secondary p-4 font-mono text-sm"
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      flushList();
      const key = elements.length;
      elements.push(
        <h1 key={key} className="mb-4 mt-6 text-2xl font-bold text-foreground first:mt-0">
          <RenderParsedContent
            content={parseLinksToContent(line.slice(2), `h1-${key}`)}
            linkBasePath={linkBasePath}
          />
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      const key = elements.length;
      elements.push(
        <h2 key={key} className="mb-3 mt-5 text-xl font-semibold text-foreground">
          <RenderParsedContent
            content={parseLinksToContent(line.slice(3), `h2-${key}`)}
            linkBasePath={linkBasePath}
          />
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      const key = elements.length;
      elements.push(
        <h3 key={key} className="mb-2 mt-4 text-lg font-semibold text-foreground">
          <RenderParsedContent
            content={parseLinksToContent(line.slice(4), `h3-${key}`)}
            linkBasePath={linkBasePath}
          />
        </h3>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      flushList();
      elements.push(<hr key={elements.length} className="my-6 border-border" />);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+]\s/)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(parseLinksToContent(line.replace(/^[-*+]\s/, ''), `list-${elements.length}-${listItems.length}`));
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(parseLinksToContent(line.replace(/^\d+\.\s/, ''), `list-${elements.length}-${listItems.length}`));
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      const key = elements.length;
      elements.push(
        <blockquote
          key={key}
          className="my-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground"
        >
          <RenderParsedContent
            content={parseLinksToContent(line.slice(2), `quote-${key}`)}
            linkBasePath={linkBasePath}
          />
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    const key = elements.length;

    elements.push(
      <p key={key} className="my-2 text-foreground">
        <RenderParsedContent
          content={parseLinksToContent(line, `p-${key}`)}
          linkBasePath={linkBasePath}
        />
      </p>
    );
  }

  flushList();

  return <>{elements}</>;
}

export function MarkdownContent({ content, className = '', linkBasePath = '/modules' }: MarkdownContentProps) {
  return (
    <LinkValidationProvider>
      <div className={`prose prose-invert max-w-none ${className}`}>
        <MarkdownRenderer content={content} linkBasePath={linkBasePath} />
      </div>
    </LinkValidationProvider>
  );
}
