/**
 * Layout -- main app shell for the DM view.
 * Provides the header, collapsible sidebar, mobile drawer, and content outlet.
 */
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useCampaign } from './providers/CampaignProvider';
import { NoCampaignView } from './NoCampaignView';
import { SidebarProvider, useSidebar } from './providers/SidebarProvider';

/** Inner layout that consumes sidebar context */
function LayoutInner() {
  const { campaign, isLoading } = useCampaign();
  const { isCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebar();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading Campaign Hub...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return <NoCampaignView />;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header — passes a menu click handler for the mobile hamburger */}
      <Header onMenuClick={() => setMobileOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — hidden on mobile, shown from md: up */}
        <div className="hidden md:flex">
          <Sidebar
            collapsed={isCollapsed}
            onToggle={toggleCollapsed}
          />
        </div>

        {/* Mobile drawer overlay — shown only when open, hidden on md: up */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Dark backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            {/* Sidebar panel — slides in from the left */}
            <div className="relative z-50 h-full w-56">
              <Sidebar
                onClose={() => setMobileOpen(false)}
                hideToggle
              />
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Exported layout wraps everything in the SidebarProvider */
export function Layout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}
