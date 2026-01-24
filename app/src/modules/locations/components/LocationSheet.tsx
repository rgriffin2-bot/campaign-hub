import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import type { Location } from '../types';

interface LocationSheetProps {
  location: Location;
  allLocations: Location[];
  onDelete?: () => void;
}

export function LocationSheet({ location, allLocations, onDelete }: LocationSheetProps) {
  const navigate = useNavigate();

  // Build breadcrumb trail
  const buildBreadcrumb = () => {
    const trail: Location[] = [];
    let current: Location | undefined = location;

    while (current?.parent) {
      const parent = allLocations.find(loc => loc.id === current?.parent);
      if (parent) {
        trail.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    return trail;
  };

  const breadcrumb = buildBreadcrumb();

  // Get child locations
  const children = allLocations.filter(loc => loc.parent === location.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/locations')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Locations
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/locations/${location.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumb.map((loc) => (
            <div key={loc.id} className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/locations/${loc.id}`)}
                className="hover:text-primary transition-colors"
              >
                {loc.name}
              </button>
              <ChevronRight className="h-4 w-4" />
            </div>
          ))}
          <span className="text-foreground font-medium">{location.name}</span>
        </div>
      )}

      {/* Location Name and Type */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{location.name}</h1>
        <p className="text-lg text-muted-foreground mt-2 capitalize">
          {location.location_type}
        </p>
      </div>

      {/* Tags */}
      {location.tags && location.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {location.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium">Type:</span>
              <span className="ml-2 capitalize">{location.location_type}</span>
            </div>
            {location.parent && (
              <div>
                <span className="text-sm font-medium">Parent Location:</span>
                <button
                  onClick={() => navigate(`/locations/${location.parent}`)}
                  className="ml-2 text-primary hover:underline"
                >
                  {allLocations.find(loc => loc.id === location.parent)?.name || location.parent}
                </button>
              </div>
            )}
            {(location as any).faction_control && (
              <div>
                <span className="text-sm font-medium">Controlled By:</span>
                <span className="ml-2">{(location as any).faction_control}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {location.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{location.description}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Atmosphere */}
      {location.atmosphere && (
        <Card>
          <CardHeader>
            <CardTitle>Atmosphere</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{location.atmosphere}</p>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      {(location as any).features && (
        <Card>
          <CardHeader>
            <CardTitle>Notable Features</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{(location as any).features}</p>
          </CardContent>
        </Card>
      )}

      {/* Sub-Locations */}
      {children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sub-Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => navigate(`/locations/${child.id}`)}
                  className="text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="font-medium">{child.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {child.location_type}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secrets (DM Only) */}
      {(location as any).secrets && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Secrets (DM Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{(location as any).secrets}</p>
          </CardContent>
        </Card>
      )}

      {/* Markdown Content */}
      {(location as any)._content && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans">
                {(location as any)._content}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationships */}
      {location.relationships && location.relationships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {location.relationships.map((rel) => (
                <div key={`${rel.type}-${rel.target}`} className="flex items-start gap-2 text-sm">
                  <span className="font-medium capitalize">{rel.type}:</span>
                  <span>{rel.target}</span>
                  {rel.description && (
                    <span className="text-muted-foreground">- {rel.description}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
