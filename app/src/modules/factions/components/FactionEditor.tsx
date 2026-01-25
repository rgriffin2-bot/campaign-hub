import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { Faction } from '../types';
import { useCampaign } from '@/core/context/CampaignContext';

interface FactionEditorProps {
  faction?: Faction;
  onSave: (faction: Partial<Faction>) => Promise<boolean>;
}

export function FactionEditor({ faction, onSave }: FactionEditorProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Faction>>({
    name: '',
    faction_type: 'other',
    description: '',
    motto: '',
    headquarters: '',
    leader: '',
    goals: '',
    secret_goals: '',
    resources: '',
    history: '',
    tags: [],
    ...faction,
  });

  const isNewFaction = !faction;

  function updateField(field: keyof Faction, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Faction name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);

    if (success) {
      navigate(isNewFaction ? '/factions' : `/factions/${faction?.id}`);
    }
  }

  const [tagsInput, setTagsInput] = useState<string>(
    faction?.tags?.join(', ') || ''
  );

  const [territoryInput, setTerritoryInput] = useState<string>(
    faction?.territory?.join(', ') || ''
  );

  const [membersInput, setMembersInput] = useState<string>(
    faction?.members?.join(', ') || ''
  );

  function handleTagsChange(value: string) {
    setTagsInput(value);
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    updateField('tags', tags);
  }

  function handleListChange(
    value: string,
    field: 'territory' | 'members',
    setter: (value: string) => void
  ) {
    setter(value);
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    updateField(field as keyof Faction, items);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(isNewFaction ? '/factions' : `/factions/${faction?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Faction'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewFaction ? 'New Faction' : `Edit ${faction.name}`}
        </h1>
      </div>

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
              placeholder="Faction name"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="faction_type">Type</Label>
              <select
                id="faction_type"
                value={formData.faction_type}
                onChange={(e) => updateField('faction_type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {currentCampaign?.entity_types?.faction_types?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                )) || (
                  <>
                    <option value="government">Government</option>
                    <option value="corporation">Corporation</option>
                    <option value="guild">Guild</option>
                    <option value="cult">Cult</option>
                    <option value="military">Military</option>
                    <option value="criminal">Criminal</option>
                    <option value="other">Other</option>
                  </>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motto">Motto</Label>
              <Input
                id="motto"
                value={formData.motto || ''}
                onChange={(e) => updateField('motto', e.target.value)}
                placeholder="Short slogan or mantra"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leader">Leader</Label>
              <Input
                id="leader"
                value={formData.leader || ''}
                onChange={(e) => updateField('leader', e.target.value)}
                placeholder="Leader character ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headquarters">Headquarters</Label>
              <Input
                id="headquarters"
                value={formData.headquarters || ''}
                onChange={(e) => updateField('headquarters', e.target.value)}
                placeholder="Headquarters location ID"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="alliances, secretive, mercantile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Brief Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="A short summary of this faction"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goals">Public Goals</Label>
            <Textarea
              id="goals"
              value={formData.goals || ''}
              onChange={(e) => updateField('goals', e.target.value)}
              placeholder="What the faction claims to want"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret_goals">Secret Goals</Label>
            <Textarea
              id="secret_goals"
              value={formData.secret_goals || ''}
              onChange={(e) => updateField('secret_goals', e.target.value)}
              placeholder="Hidden agendas"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resources">Resources</Label>
            <Textarea
              id="resources"
              value={formData.resources || ''}
              onChange={(e) => updateField('resources', e.target.value)}
              placeholder="Assets, leverage, or capabilities"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Territory & Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="territory">Territory</Label>
            <Input
              id="territory"
              value={territoryInput}
              onChange={(e) => handleListChange(e.target.value, 'territory', setTerritoryInput)}
              placeholder="Comma-separated location IDs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="members">Notable Members</Label>
            <Input
              id="members"
              value={membersInput}
              onChange={(e) => handleListChange(e.target.value, 'members', setMembersInput)}
              placeholder="Comma-separated character IDs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="history">History</Label>
            <Textarea
              id="history"
              value={formData.history || ''}
              onChange={(e) => updateField('history', e.target.value)}
              placeholder="Origins and notable events"
              rows={4}
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
    </div>
  );
}
