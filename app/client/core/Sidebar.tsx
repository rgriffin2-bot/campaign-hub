/**
 * Sidebar -- left navigation panel listing the Dashboard link and all
 * enabled modules for the active campaign. DMs can drag-and-drop modules
 * to reorder them; players see a read-only list.
 *
 * Supports two modes:
 * - Expanded (w-56 / 224px): full labels + icons
 * - Collapsed (w-14 / 56px): icons only
 */
import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCampaign } from './providers/CampaignProvider';
import { DynamicIcon } from '../components/ui/DynamicIcon';
import { useAuth } from './providers/AuthProvider';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  /** When true, clicking a nav link calls onClose (used for mobile drawer) */
  onClose?: () => void;
  /** Hide the collapse toggle (e.g. on mobile where it's not needed) */
  hideToggle?: boolean;
}

export function Sidebar({ collapsed = false, onToggle, onClose, hideToggle = false }: SidebarProps) {
  const { enabledModules, reorderModules, campaign } = useCampaign();
  const { role, authEnabled } = useAuth();
  const isDm = !authEnabled || role === 'dm';
  const navigate = useNavigate();

  // --- Drag-and-drop reordering state ---
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

  // Navigate and close the mobile drawer if open
  const handleNavClick = (to: string) => (e: React.MouseEvent) => {
    if (onClose) {
      e.preventDefault();
      navigate(to);
      onClose();
    }
  };

  return (
    <aside
      className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <nav className="flex-1 overflow-auto p-2">
        <ul className="space-y-1">
          {/* Dashboard Link */}
          <li>
            <NavLink
              to="/"
              end
              onClick={handleNavClick('/')}
              className={({ isActive }) =>
                `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3'
                } ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <Home className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
          </li>

          {/* Module Links */}
          {enabledModules.length > 0 && (
            <>
              {/* Section header — hidden when collapsed */}
              {!collapsed && (
                <li className="pt-4">
                  <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Modules
                  </span>
                </li>
              )}
              {/* Spacer when collapsed (replaces the "Modules" header) */}
              {collapsed && <li className="pt-2" />}

              {enabledModules.map((module) => (
                <li
                  key={module.id}
                  draggable={isDm && !collapsed}
                  onDragStart={(e) => isDm && !collapsed && handleDragStart(e, module.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => isDm && !collapsed && handleDragOver(e, module.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => isDm && !collapsed && handleDrop(e, module.id)}
                  className={`relative ${
                    dragOverId === module.id && draggedId !== module.id
                      ? 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-primary'
                      : ''
                  }`}
                >
                  <NavLink
                    to={`/modules/${module.id}`}
                    onClick={handleNavClick(`/modules/${module.id}`)}
                    className={({ isActive }) =>
                      `flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                        collapsed ? 'justify-center' : 'gap-2'
                      } ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      } ${draggedId === module.id ? 'opacity-50' : ''}`
                    }
                    title={collapsed ? module.name : undefined}
                  >
                    {/* Drag handle — only in expanded mode for DMs */}
                    {isDm && !collapsed && (
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    )}
                    <DynamicIcon name={module.icon} className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{module.name}</span>}
                  </NavLink>
                </li>
              ))}
            </>
          )}

          {enabledModules.length === 0 && !collapsed && (
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

      {/* Sidebar Footer — toggle button on desktop, hidden on mobile */}
      {!hideToggle && (
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="flex w-full items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">Campaign Hub v0.1.0</span>
                <ChevronLeft className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
