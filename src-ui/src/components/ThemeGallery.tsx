import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const THEMES = [
  {
    value: 'onyx',
    label: 'Onyx',
    description: 'Dark, technical, sharp edges',
    audience: 'Developers, engineers',
  },
  {
    value: 'coral',
    label: 'Coral',
    description: 'Warm, inviting, rounded',
    audience: 'Designers, creatives',
  },
  {
    value: 'serene',
    label: 'Serene',
    description: 'Clean, minimal, editorial',
    audience: 'Writers, consultants',
  },
  {
    value: 'jade',
    label: 'Jade',
    description: 'Classic, refined, traditional',
    audience: 'Executives, academics',
  },
  {
    value: 'quartz',
    label: 'Quartz',
    description: 'Modern, geometric, bold',
    audience: 'Product managers, marketers',
  },
];

interface ThemeGalleryProps {
  selected: string;
  onSelect: (theme: string) => void;
  variant?: 'portfolio' | 'targeted';
}

export function ThemeGallery({ selected, onSelect, variant = 'portfolio' }: ThemeGalleryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {THEMES.map((theme) => {
        const isSelected = selected === theme.value;
        const screenshotSrc = `/showcases/${theme.value}-${variant}.png`;

        return (
          <Card
            key={theme.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelect(theme.value)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
                <img
                  src={screenshotSrc}
                  alt={`${theme.label} theme`}
                  className="h-full w-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {isSelected && (
                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{theme.label}</h3>
                  <Badge variant="outline" className="text-xs">
                    {theme.audience}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { THEMES };
