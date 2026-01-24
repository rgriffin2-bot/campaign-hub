import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { Character } from '../types';
import { useCampaign } from '@/core/context/CampaignContext';

interface CharacterEditorProps {
  character?: Character;
  onSave: (character: Partial<Character>) => Promise<boolean>;
}

export function CharacterEditor({ character, onSave }: CharacterEditorProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    character_type: 'npc',
    status: 'alive',
    description: '',
    appearance: '',
    personality: '',
    background: '',
    pronouns: '',
    tags: [],
    ...character,
  });

  const isNewCharacter = !character;

  function updateField(field: keyof Character, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Character name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);

    if (success) {
      navigate(isNewCharacter ? '/characters' : `/characters/${character?.id}`);
    }
  }

  // Store tags as string for easier editing
  const [tagsInput, setTagsInput] = useState<string>(
    character?.tags?.join(', ') || ''
  );

  function handleTagsChange(value: string) {
    setTagsInput(value);
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    updateField('tags', tags);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(isNewCharacter ? '/characters' : `/characters/${character?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Character'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewCharacter ? 'New Character' : `Edit ${character.name}`}
        </h1>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Character name"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="character_type">Type</Label>
              <select
                id="character_type"
                value={formData.character_type}
                onChange={(e) => updateField('character_type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {currentCampaign?.entity_types?.character_types?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                )) || (
                  <>
                    <option value="pc">Player Character</option>
                    <option value="npc">NPC</option>
                    <option value="historical">Historical Figure</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="alive">Alive</option>
                <option value="dead">Dead</option>
                <option value="missing">Missing</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pronouns">Pronouns</Label>
              <Input
                id="pronouns"
                value={formData.pronouns || ''}
                onChange={(e) => updateField('pronouns', e.target.value)}
                placeholder="she/her, he/him, they/them, etc."
              />
            </div>

            {formData.character_type === 'pc' && (
              <div className="space-y-2">
                <Label htmlFor="player">Player</Label>
                <Input
                  id="player"
                  value={formData.player || ''}
                  onChange={(e) => updateField('player', e.target.value)}
                  placeholder="Player name"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="pilot, veteran, mysterious"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Brief Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="A short summary of this character"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appearance">Appearance</Label>
            <Textarea
              id="appearance"
              value={formData.appearance || ''}
              onChange={(e) => updateField('appearance', e.target.value)}
              placeholder="Physical description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Textarea
              id="personality"
              value={formData.personality || ''}
              onChange={(e) => updateField('personality', e.target.value)}
              placeholder="Personality traits and mannerisms"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background</Label>
            <Textarea
              id="background"
              value={formData.background || ''}
              onChange={(e) => updateField('background', e.target.value)}
              placeholder="Character history and backstory"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="_content">Additional Notes (Markdown)</Label>
            <Textarea
              id="_content"
              value={(formData as any)._content || ''}
              onChange={(e) => updateField('_content' as any, e.target.value)}
              placeholder="Additional notes in markdown format..."
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Supports markdown formatting (headings, lists, bold, italic, etc.)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields from Campaign Config */}
      {currentCampaign?.custom_fields?.character && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCampaign.custom_fields.character.map((field) => (
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
