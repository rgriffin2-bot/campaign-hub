import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { LoreEntry } from '../types';
import { useCampaign } from '@/core/context/CampaignContext';

interface LoreEditorProps {
  loreEntry?: LoreEntry;
  onSave: (loreEntry: Partial<LoreEntry>) => Promise<boolean>;
}

export function LoreEditor({ loreEntry, onSave }: LoreEditorProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<LoreEntry>>({
    name: '',
    lore_type: 'history',
    description: '',
    tags: [],
    ...loreEntry,
  });

  const isNewEntry = !loreEntry;

  function updateField(field: keyof LoreEntry, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Lore entry name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);

    if (success) {
      navigate(isNewEntry ? '/lore' : `/lore/${loreEntry?.id}`);
    }
  }

  function handleTagsChange(value: string) {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    updateField('tags', tags);
  }

  function handleListChange(field: keyof LoreEntry, value: string) {
    const items = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    updateField(field, items);
  }

  const loreTypes = ['history', 'culture', 'technology', 'religion', 'geography', 'rules', 'other'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(isNewEntry ? '/lore' : `/lore/${loreEntry?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Lore Entry'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewEntry ? 'New Lore Entry' : `Edit ${loreEntry.name}`}
        </h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name/Title *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Lore entry title"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lore_type">Type</Label>
              <select
                id="lore_type"
                value={formData.lore_type}
                onChange={(e) => updateField('lore_type', e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {loreTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="era">Era (optional)</Label>
              <Input
                id="era"
                value={(formData as any).era || ''}
                onChange={(e) => updateField('era' as any, e.target.value)}
                placeholder="Ancient Past, Recent, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="mystery, important, secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Brief Summary</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="A short summary of this lore entry"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Main Content</Label>
            <Textarea
              id="content"
              value={(formData as any)._content || ''}
              onChange={(e) => updateField('_content' as any, e.target.value)}
              placeholder="Full lore content (supports markdown formatting)"
              rows={12}
            />
            <p className="text-xs text-muted-foreground">
              Use markdown formatting for rich text
            </p>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader>
          <CardTitle>References</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="related_characters">Related Characters (comma-separated IDs)</Label>
            <Input
              id="related_characters"
              value={formData.related_characters?.join(', ') || ''}
              onChange={(e) => handleListChange('related_characters' as any, e.target.value)}
              placeholder="captain-zara-chen, maven"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="related_locations">Related Locations (comma-separated IDs)</Label>
            <Input
              id="related_locations"
              value={formData.related_locations?.join(', ') || ''}
              onChange={(e) => handleListChange('related_locations' as any, e.target.value)}
              placeholder="haven-station, haven-undercity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="related_factions">Related Factions (comma-separated IDs)</Label>
            <Input
              id="related_factions"
              value={formData.related_factions?.join(', ') || ''}
              onChange={(e) => handleListChange('related_factions' as any, e.target.value)}
              placeholder="faction-id-1, faction-id-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sources">In-World Sources</Label>
            <Textarea
              id="sources"
              value={(formData as any).sources || ''}
              onChange={(e) => updateField('sources' as any, e.target.value)}
              placeholder="Where this information comes from in-universe"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contradictions">Known Contradictions</Label>
            <Textarea
              id="contradictions"
              value={(formData as any).contradictions || ''}
              onChange={(e) => updateField('contradictions' as any, e.target.value)}
              placeholder="Conflicting accounts or inconsistencies"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields from Campaign Config */}
      {currentCampaign?.custom_fields?.lore && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCampaign.custom_fields.lore.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === 'number' ? (
                  <Input
                    id={field.name}
                    type="number"
                    value={(formData as any)[field.name] || ''}
                    onChange={(e) => updateField(field.name as any, Number(e.target.value))}
                    placeholder={field.description}
                  />
                ) : field.type === 'select' && field.options ? (
                  <select
                    id={field.name}
                    value={(formData as any)[field.name] || ''}
                    onChange={(e) => updateField(field.name as any, e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Select...</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    value={(formData as any)[field.name] || ''}
                    onChange={(e) => updateField(field.name as any, e.target.value)}
                    placeholder={field.description}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
