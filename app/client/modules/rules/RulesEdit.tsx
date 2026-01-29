import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, BookOpen } from 'lucide-react';
import { useFiles } from '../../hooks/useFiles';
import type { RuleCategory, RuleFrontmatter } from '@shared/schemas/rules';

const ruleCategories: RuleCategory[] = [
  'core-mechanic',
  'action',
  'general-move',
  'playbook-move',
  'downtime',
  'harm-recovery',
  'gear',
  'ship',
  'gm-reference',
];

const categoryLabels: Record<RuleCategory, string> = {
  'core-mechanic': 'Core Mechanic',
  'action': 'Action',
  'general-move': 'General Move',
  'playbook-move': 'Playbook Move',
  'downtime': 'Downtime',
  'harm-recovery': 'Harm & Recovery',
  'gear': 'Gear',
  'ship': 'Ship',
  'gm-reference': 'GM Reference',
};

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function RulesEdit() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { get, create, update } = useFiles('rules');

  const isNew = fileId === 'new';
  const { data: existingRule, isLoading } = get(isNew ? '' : fileId || '');

  const [form, setForm] = useState<Partial<RuleFrontmatter>>({
    name: '',
    category: 'core-mechanic',
    subcategory: '',
    tags: [],
    playerVisible: true,
    source: '',
  });
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingRule && !isNew) {
      const fm = existingRule.frontmatter as unknown as RuleFrontmatter;
      setForm({
        name: fm.name || '',
        category: fm.category || 'core-mechanic',
        subcategory: fm.subcategory || '',
        tags: fm.tags || [],
        playerVisible: fm.playerVisible !== false,
        source: fm.source || '',
      });
      setTagsInput((fm.tags || []).join(', '));
      setContent(existingRule.content || '');
    }
  }, [existingRule, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) return;

    setSaving(true);
    try {
      const id = isNew ? generateId(form.name) : fileId!;

      // Parse tags from comma-separated input
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const frontmatter = {
        id,
        name: form.name,
        category: form.category,
        subcategory: form.subcategory || undefined,
        tags,
        playerVisible: form.playerVisible,
        source: form.source || undefined,
      };

      if (isNew) {
        await create.mutateAsync({ name: form.name!, frontmatter, content });
      } else {
        await update.mutateAsync({
          fileId: id,
          input: { frontmatter, content },
        });
      }

      navigate(`/modules/rules/${id}`);
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        to={isNew ? '/modules/rules' : `/modules/rules/${fileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isNew ? 'Back to Rules' : 'Back to Rule'}
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {isNew ? 'New Rule' : `Edit ${form.name}`}
            </h1>
          </div>
          <button
            type="submit"
            disabled={saving || !form.name || !form.category}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Basic Info */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Basic Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g., Action Roll, Aid Another, Flashback"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value as RuleCategory }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                {ruleCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Subcategory
              </label>
              <input
                type="text"
                value={form.subcategory}
                onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Optional finer categorization"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Source
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g., Core Rules, Expansion, Homebrew"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Comma-separated tags"
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.playerVisible}
                onChange={(e) => setForm((prev) => ({ ...prev, playerVisible: e.target.checked }))}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">Visible to players</span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Uncheck to make this a GM-only rule (hidden from player view)
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Rule Content</h2>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            placeholder="Write the rule content here using Markdown formatting...

## Overview
Describe the rule or mechanic.

## How It Works
1. Step one
2. Step two

## Examples
> Example scenario

## Notes
- Additional guidance"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground font-mono text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </form>
    </div>
  );
}
