import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { MapEntry } from '../types';

interface MapEditorProps {
  mapEntry?: MapEntry;
  onSave: (mapEntry: Partial<MapEntry>) => Promise<boolean>;
}

export function MapEditor({ mapEntry, onSave }: MapEditorProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<MapEntry>>({
    name: '',
    map_type: '',
    file: '',
    location: '',
    scale: '',
    description: '',
    tags: [],
    ...mapEntry,
  });

  const isNewMap = !mapEntry;

  function updateField(field: keyof MapEntry, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Map name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);

    if (success) {
      navigate(isNewMap ? '/maps' : `/maps/${mapEntry?.id}`);
    }
  }

  const [tagsInput, setTagsInput] = useState<string>(
    mapEntry?.tags?.join(', ') || ''
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
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(isNewMap ? '/maps' : `/maps/${mapEntry?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Map'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewMap ? 'New Map' : `Edit ${mapEntry.name}`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Map Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Map name"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="map_type">Map Type</Label>
              <Input
                id="map_type"
                value={formData.map_type || ''}
                onChange={(e) => updateField('map_type', e.target.value)}
                placeholder="World, city, building, tactical, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Related Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="Location ID"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="file">File Path</Label>
              <Input
                id="file"
                value={formData.file || ''}
                onChange={(e) => updateField('file', e.target.value)}
                placeholder="assets/maps/world-map.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale">Scale / Zoom Level</Label>
              <Input
                id="scale"
                value={formData.scale || ''}
                onChange={(e) => updateField('scale', e.target.value)}
                placeholder="Continent, region, district, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="overview, travel, combat"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of the map"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annotations & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Map annotations or quick notes"
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
