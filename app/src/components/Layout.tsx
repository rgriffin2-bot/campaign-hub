import { ReactNode } from 'react';
import { Navigation } from './Navigation';
import { CampaignSelector } from './CampaignSelector';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b p-6">
            <h1 className="text-2xl font-bold tracking-tight">
              Campaign Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              TTRPG Campaign Manager
            </p>
          </div>

          {/* Campaign Selector */}
          <div className="px-4 pt-4">
            <CampaignSelector />
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <Navigation />
          </div>

          {/* Footer */}
          <div className="border-t p-4 text-xs text-muted-foreground">
            Phase 1 MVP
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
