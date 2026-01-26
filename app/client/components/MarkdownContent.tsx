import { Link } from 'react-router-dom';
import { useMemo } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Parse [[module:id]] links and render them as React Router Links
function parseLinks(text: string): (string | JSX.Element)[] {
  const linkRegex = /\[\[(\w+):([^\]]+)\]\]/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, module, id] = match;
    const displayName = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    parts.push(
      <Link
        key={`${module}-${id}-${match.index}`}
        to={`/modules/${module}/${id}`}
        className="text-primary hover:underline"
      >
        {displayName}
      </Link>
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Simple markdown-to-JSX converter
function renderMarkdown(content: string): JSX.Element[] {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag
          key={elements.length}
          className={listType === 'ul' ? 'list-disc pl-6 my-2' : 'list-decimal pl-6 my-2'}
        >
          {listItems.map((item, i) => (
            <li key={i} className="text-foreground">
              {parseLinks(item)}
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
      elements.push(
        <h1 key={elements.length} className="mb-4 mt-6 text-2xl font-bold text-foreground first:mt-0">
          {parseLinks(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={elements.length} className="mb-3 mt-5 text-xl font-semibold text-foreground">
          {parseLinks(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="mb-2 mt-4 text-lg font-semibold text-foreground">
          {parseLinks(line.slice(4))}
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
      elements.push(
        <blockquote
          key={elements.length}
          className="my-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground"
        >
          {parseLinks(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph
    flushList();

    // Apply inline formatting
    let formattedLine = line;

    elements.push(
      <p key={elements.length} className="my-2 text-foreground">
        {parseLinks(formattedLine)}
      </p>
    );
  }

  flushList();

  return elements;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);

  return <div className={`prose prose-invert max-w-none ${className}`}>{rendered}</div>;
}
