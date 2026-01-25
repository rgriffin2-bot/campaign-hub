import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { MapEntry } from '../types';

interface MapSheetProps {
  mapEntry: MapEntry;
  onDelete?: () => void;
}

export function MapSheet({ mapEntry, onDelete }: MapSheetProps) {
  const navigate = useNavigate();

  const detailItems = [
    { label: 'Map Type', value: mapEntry.map_type },
    { label: 'Location', value: mapEntry.location },
    { label: 'Scale', value: mapEntry.scale },
    { label: 'File Path', value: mapEntry.file },
  ].filter((item) => item.value);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/maps')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Maps
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/maps/${mapEntry.id}/edit`)}
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

      <div>
        <h1 className="text-4xl font-bold tracking-tight">{mapEntry.name}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          {mapEntry.map_type || 'Map'}
        </p>
      </div>

      {mapEntry.tags && mapEntry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mapEntry.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {mapEntry.description && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{mapEntry.description}</p>
          </CardContent>
        </Card>
      )}

      {detailItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {detailItems.map((item) => (
                <div key={item.label} className="text-sm">
                  <div className="text-muted-foreground">{item.label}</div>
                  <div className="font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {mapEntry.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{mapEntry.notes}</p>
          </CardContent>
        </Card>
      )}

      {(mapEntry as any)._content && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown>{(mapEntry as any)._content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
