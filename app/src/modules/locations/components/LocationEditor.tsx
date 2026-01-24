import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import type { Location } from '../types';
import { useCampaign } from '@/core/context/CampaignContext';

interface LocationEditorProps {
  location?: Location;
  allLocations: Location[];
  onSave: (location: Partial<Location>) => Promise<boolean>;
}

export function LocationEditor({ location, allLocations, onSave }: LocationEditorProps) {
  const navigate = useNavigate();
  const { currentCampaign } = useCampaign();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Location>>({
    name: '',
    location_type: currentCampaign?.entity_types?.location_types?.[0]?.id || 'region',
    description: '',
    atmosphere: '',
    tags: [],
    ...location,
  });

  const isNewLocation = !location;

  function updateField(field: keyof Location, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Location name is required');
      return;
    }

    setSaving(true);
    const success = await onSave(formData);
    setSaving(false);

    if (success) {
      navigate(isNewLocation ? '/locations' : `/locations/${location?.id}`);
    }
  }

  // Store tags as string for easier editing
  const [tagsInput, setTagsInput] = useState<string>(
    location?.tags?.join(', ') || ''
  );

  function handleTagsChange(value: string) {
    setTagsInput(value);
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    updateField('tags', tags);
  }

  // Filter valid parent locations based on can_contain rules
  const currentLocationType = currentCampaign?.entity_types?.location_types?.find(
    (type) => type.id === formData.location_type
  );

  const validParents = allLocations.filter((loc) => {
    // Don't allow selecting self as parent
    if (loc.id === location?.id) return false;

    const parentType = currentCampaign?.entity_types?.location_types?.find(
      (type) => type.id === loc.location_type
    );

    // If can_contain is not defined, allow all
    if (!parentType?.can_contain) return true;

    // Check if parent type can contain current type
    return parentType.can_contain.includes(formData.location_type || '');
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(isNewLocation ? '/locations' : `/locations/${location?.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Location'}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNewLocation ? 'New Location' : `Edit ${location.name}`}
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
              placeholder="Location name"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location_type">Type</Label>
              <select
                id="location_type"
                value={formData.location_type}
                onChange={(e) => updateField('location_type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {currentCampaign?.entity_types?.location_types?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                )) || (
                  <>
                    <option value="system">System</option>
                    <option value="world">World</option>
                    <option value="region">Region</option>
                    <option value="city">City</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Location</Label>
              <select
                id="parent"
                value={formData.parent || ''}
                onChange={(e) => updateField('parent', e.target.value || undefined)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">None (top-level)</option>
                {validParents.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>
              {currentLocationType?.can_contain && (
                <p className="text-xs text-muted-foreground">
                  Only showing locations that can contain a {formData.location_type}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="hub, visited, dangerous"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="A brief description of this location"
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
            <Label htmlFor="atmosphere">Atmosphere</Label>
            <Textarea
              id="atmosphere"
              value={formData.atmosphere || ''}
              onChange={(e) => updateField('atmosphere', e.target.value)}
              placeholder="The feel and mood of this location"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">Notable Features</Label>
            <Textarea
              id="features"
              value={(formData as any).features || ''}
              onChange={(e) => updateField('features' as any, e.target.value)}
              placeholder="Key landmarks, resources, or points of interest"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secrets">Secrets (DM Only)</Label>
            <Textarea
              id="secrets"
              value={(formData as any).secrets || ''}
              onChange={(e) => updateField('secrets' as any, e.target.value)}
              placeholder="Hidden information players don't know"
              rows={4}
              className="border-destructive/50"
            />
            <p className="text-xs text-muted-foreground">
              This information will be marked as DM-only
            </p>
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
      {currentCampaign?.custom_fields?.location && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentCampaign.custom_fields.location.map((field) => (
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
