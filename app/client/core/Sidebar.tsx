import { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, GripVertical } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';
import { useAuth } from './providers/AuthProvider';

export function Sidebar() {
  const { enabledModules, reorderModules, campaign } = useCampaign();
  const { role, authEnabled } = useAuth();
  const isDm = !authEnabled || role === 'dm';

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragNode = useRef<HTMLLIElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, moduleId: string) => {
    setDraggedId(moduleId);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', moduleId);
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.style.opacity = '1';
    }
    setDraggedId(null);
    setDragOverId(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, moduleId: string) => {
    e.preventDefault();
    if (draggedId === moduleId) return;
    setDragOverId(moduleId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !campaign) return;

    const currentOrder = [...campaign.modules];
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at new position
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedId);

    reorderModules(currentOrder);
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <nav className="flex-1 overflow-auto p-2">
        <ul className="space-y-1">
          {/* Dashboard Link */}
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {/* Module Links */}
          {enabledModules.length > 0 && (
            <>
              <li className="pt-4">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modules
                </span>
              </li>
              {enabledModules.map((module) => (
                <li
                  key={module.id}
                  draggable={isDm}
                  onDragStart={(e) => isDm && handleDragStart(e, module.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => isDm && handleDragOver(e, module.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => isDm && handleDrop(e, module.id)}
                  className={`relative ${
                    dragOverId === module.id && draggedId !== module.id
                      ? 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-primary'
                      : ''
                  }`}
                >
                  <NavLink
                    to={`/modules/${module.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      } ${draggedId === module.id ? 'opacity-50' : ''}`
                    }
                  >
                    {isDm && (
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    )}
                    <DynamicIcon name={module.icon} className="h-4 w-4" />
                    <span className="truncate">{module.name}</span>
                  </NavLink>
                </li>
              ))}
            </>
          )}

          {enabledModules.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              No modules enabled.
              <br />
              <span className="text-xs">
                Configure modules in campaign settings.
              </span>
            </li>
          )}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-sidebar-border p-3">
        <p className="text-xs text-muted-foreground">
          Campaign Hub v0.1.0
        </p>
      </div>
    </aside>
  );
}
