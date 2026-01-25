import { Link, useLocation } from 'react-router-dom';
import { Users, BookOpen, Calendar, Shield, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'Characters',
    href: '/characters',
    icon: Users,
  },
  {
    name: 'Maps + Locations',
    href: '/maps-locations',
    icon: Compass,
    disabled: false,
  },
  {
    name: 'Lore',
    href: '/lore',
    icon: BookOpen,
    disabled: false,
  },
  {
    name: 'Sessions',
    href: '/sessions',
    icon: Calendar,
    disabled: false,
  },
  {
    name: 'Factions',
    href: '/factions',
    icon: Shield,
    disabled: false,
  },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            to={item.disabled ? '#' : item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <Icon className="h-5 w-5" />
            {item.name}
            {item.disabled && (
              <span className="ml-auto text-xs">(Soon)</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
