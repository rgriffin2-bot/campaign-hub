import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { Session } from '../types';

interface SessionEditorProps {
  session?: Session;
  onSave: (session: Partial<Session>) => Promise<boolean>;
}

export function SessionEditor({ session, onSave }: SessionEditorProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Session>>({
    name: '',
    session_number: 1,
    date: '',
    title: '',
    summary: '',
    highlights: '',
    clues: '',
    open_threads: '',
    next_session: '',
    in_game_date: '',
    tags: [],
    ...session,
  });

  const isNewSession = !session;

  function updateField(field: keyof Session, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Session name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);

    if (success) {
      navigate(isNewSession ? '/sessions' : `/sessions/${session?.id}`);
    }
  }

  const [tagsInput, setTagsInput] = useState<string>(
    session?.tags?.join(', ') || ''
  );

  const [charactersInput, setCharactersInput] = useState<string>(
    session?.characters_present?.join(', ') || ''
  );

  const [locationsInput, setLocationsInput] = useState<string>(
    session?.locations_visited?.join(', ') || ''
  );

  const [npcsInput, setNpcsInput] = useState<string>(
    session?.npcs_met?.join(', ') || ''
  );

  const [lootInput, setLootInput] = useState<string>(
    session?.loot?.join(', ') || ''
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
    field: 'characters_present' | 'locations_visited' | 'npcs_met' | 'loot',
    setter: (value: string) => void
  ) {
    setter(value);
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    updateField(field as keyof Session, items);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(isNewSession ? '/sessions' : `/sessions/${session?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Session'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewSession ? 'New Session' : `Edit ${session.name}`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Session Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Session title or label"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="session_number">Session Number</Label>
              <Input
                id="session_number"
                type="number"
                value={formData.session_number ?? ''}
                onChange={(e) => updateField('session_number', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date Played</Label>
              <Input
                id="date"
                type="date"
                value={formData.date || ''}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="in_game_date">In-Game Date</Label>
              <Input
                id="in_game_date"
                value={formData.in_game_date || ''}
                onChange={(e) => updateField('in_game_date', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Episode Title</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Optional episode title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="heist, downtime, cliffhanger"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              placeholder="What happened this session?"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Highlights & Threads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="highlights">Highlights</Label>
            <Textarea
              id="highlights"
              value={formData.highlights || ''}
              onChange={(e) => updateField('highlights', e.target.value)}
              placeholder="Key moments, reveals, or standout scenes"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clues">Clues & Discoveries</Label>
            <Textarea
              id="clues"
              value={formData.clues || ''}
              onChange={(e) => updateField('clues', e.target.value)}
              placeholder="Evidence, secrets, or lore uncovered"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="open_threads">Open Threads</Label>
            <Textarea
              id="open_threads"
              value={formData.open_threads || ''}
              onChange={(e) => updateField('open_threads', e.target.value)}
              placeholder="Unresolved plot points"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_session">Next Session Prep</Label>
            <Textarea
              id="next_session"
              value={formData.next_session || ''}
              onChange={(e) => updateField('next_session', e.target.value)}
              placeholder="Notes or hooks for the next session"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entities & Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="characters_present">Characters Present</Label>
            <Input
              id="characters_present"
              value={charactersInput}
              onChange={(e) => handleListChange(e.target.value, 'characters_present', setCharactersInput)}
              placeholder="Comma-separated character IDs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locations_visited">Locations Visited</Label>
            <Input
              id="locations_visited"
              value={locationsInput}
              onChange={(e) => handleListChange(e.target.value, 'locations_visited', setLocationsInput)}
              placeholder="Comma-separated location IDs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="npcs_met">NPCs Met</Label>
            <Input
              id="npcs_met"
              value={npcsInput}
              onChange={(e) => handleListChange(e.target.value, 'npcs_met', setNpcsInput)}
              placeholder="Comma-separated NPC IDs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loot">Loot & Rewards</Label>
            <Input
              id="loot"
              value={lootInput}
              onChange={(e) => handleListChange(e.target.value, 'loot', setLootInput)}
              placeholder="Comma-separated rewards"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Notes (Markdown)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="_content"
            value={(formData as any)._content || ''}
            onChange={(e) => updateField('_content' as any, e.target.value)}
            placeholder="Extra notes in markdown format..."
            rows={8}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Supports markdown formatting (headings, lists, bold, italic, etc.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
