import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>;
  const IconComponent = icons[name];

  if (!IconComponent) {
    return <LucideIcons.Circle {...props} />;
  }

  return <IconComponent {...props} />;
}
