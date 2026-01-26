import { Link } from 'react-router-dom';
import { useMemo } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
  /** Base path for [[module:id]] links. Defaults to '/modules' */
  linkBasePath?: string;
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

// Parse [[module:id]] links and apply inline formatting
function parseLinks(text: string, keyPrefix: string = 'link', linkBasePath: string = '/modules'): (string | JSX.Element)[] {
  const linkRegex = /\[\[(\w+):([^\]]+)\]\]/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let linkCount = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the match (with inline formatting)
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      parts.push(...applyInlineFormatting(textBefore, `${keyPrefix}-pre-${linkCount}`));
    }

    const [fullMatch, module, id] = match;
    const displayName = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    linkCount++;

    parts.push(
      <Link
        key={`${keyPrefix}-${module}-${id}-${linkCount}`}
        to={`${linkBasePath}/${module}/${id}`}
        className="text-primary hover:underline"
      >
        {displayName}
      </Link>
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text (with inline formatting)
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    parts.push(...applyInlineFormatting(textAfter, `${keyPrefix}-post`));
  }

  // If no links were found, still apply inline formatting
  if (parts.length === 0) {
    return applyInlineFormatting(text, keyPrefix);
  }

  return parts;
}

// Simple markdown-to-JSX converter
function renderMarkdown(content: string, linkBasePath: string = '/modules'): JSX.Element[] {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let listItems: string[] = [];
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
              {parseLinks(item, `list-${listKey}-${i}`, linkBasePath)}
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
          {parseLinks(line.slice(2), `h1-${key}`, linkBasePath)}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      const key = elements.length;
      elements.push(
        <h2 key={key} className="mb-3 mt-5 text-xl font-semibold text-foreground">
          {parseLinks(line.slice(3), `h2-${key}`, linkBasePath)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      const key = elements.length;
      elements.push(
        <h3 key={key} className="mb-2 mt-4 text-lg font-semibold text-foreground">
          {parseLinks(line.slice(4), `h3-${key}`, linkBasePath)}
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
      listItems.push(line.replace(/^[-*+]\s/, ''));
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(line.replace(/^\d+\.\s/, ''));
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
          {parseLinks(line.slice(2), `quote-${key}`, linkBasePath)}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    const key = elements.length;

    elements.push(
      <p key={key} className="my-2 text-foreground">
        {parseLinks(line, `p-${key}`, linkBasePath)}
      </p>
    );
  }

  flushList();

  return elements;
}

export function MarkdownContent({ content, className = '', linkBasePath = '/modules' }: MarkdownContentProps) {
  const rendered = useMemo(() => renderMarkdown(content, linkBasePath), [content, linkBasePath]);

  return <div className={`prose prose-invert max-w-none ${className}`}>{rendered}</div>;
}
