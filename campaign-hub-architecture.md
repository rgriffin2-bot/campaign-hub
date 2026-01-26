# Campaign Hub: Dashboard Architecture Specification

## Overview

Campaign Hub is a modular, campaign-agnostic dashboard for tabletop RPG game masters. This document specifies the **dashboard shell architecture only**—the framework that accepts pluggable modules. Individual modules (characters, locations, sessions, etc.) will be designed and built separately.

## Core Principles

1. **Campaign as Data**: The dashboard is generic; all campaign-specific content lives in data directories
2. **Module as Plugin**: Features plug into a defined interface; the shell knows nothing about module internals
3. **Files as Source of Truth**: All content stored as markdown with YAML frontmatter
4. **Minimal Assumptions**: The architecture makes no assumptions about what modules exist or what they contain

---

## Project Structure

```
campaign-hub/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
│
├── app/
│   ├── server/
│   │   ├── index.ts                    # Express app entry point
│   │   ├── config.ts                   # Environment & configuration
│   │   │
│   │   ├── core/
│   │   │   ├── campaign-manager.ts     # Load/switch/list campaigns
│   │   │   ├── file-store.ts           # Generic CRUD for markdown files
│   │   │   ├── markdown-parser.ts      # Parse/serialize md + frontmatter
│   │   │   ├── relationship-index.ts   # Build/query link graph
│   │   │   ├── file-watcher.ts         # Watch for external file changes
│   │   │   └── sync-manager.ts         # Google Drive sync operations
│   │   │
│   │   └── modules/
│   │       ├── registry.ts             # Module registration & routing
│   │       ├── base-routes.ts          # Factory for standard CRUD routes
│   │       └── [modules added later]
│   │
│   ├── client/
│   │   ├── index.html
│   │   ├── main.tsx                    # React entry point
│   │   ├── App.tsx                     # Root component with providers
│   │   │
│   │   ├── core/
│   │   │   ├── Layout.tsx              # Main layout shell
│   │   │   ├── Sidebar.tsx             # Module navigation
│   │   │   ├── Header.tsx              # Campaign selector, global actions
│   │   │   ├── ModuleRouter.tsx        # Dynamic module routing
│   │   │   └── providers/
│   │   │       ├── CampaignProvider.tsx
│   │   │       └── QueryProvider.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCampaign.ts          # Current campaign context
│   │   │   ├── useFiles.ts             # Generic file operations
│   │   │   └── useRelationships.ts     # Query related items
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn/ui components
│   │   │   └── [shared components added as needed]
│   │   │
│   │   └── modules/
│   │       └── [module UI added later]
│   │
│   └── shared/
│       ├── types/
│       │   ├── module.ts               # ModuleDefinition interface
│       │   ├── campaign.ts             # Campaign config types
│       │   ├── file.ts                 # Generic file types
│       │   └── api.ts                  # Request/response types
│       │
│       └── utils/
│           ├── ids.ts                  # ID generation
│           ├── dates.ts                # Date formatting
│           └── paths.ts                # Path resolution helpers
│
├── campaigns/                          # Campaign data directories
│   └── .gitkeep
│
└── player-sites/                       # Generated static sites
    └── .gitkeep
```

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Server | Express + TypeScript | Full control, simple deployment |
| Client | React + TypeScript | Component-based, wide ecosystem |
| Styling | Tailwind + shadcn/ui | Fast iteration, accessible components |
| State | TanStack Query | Optimized for CRUD operations |
| Build | Vite | Fast dev server, simple config |
| Validation | Zod | Runtime type checking, schema definition |

---

## Campaign System

### Campaign Directory Structure

Each campaign is a folder in `campaigns/` containing:

```
campaigns/{campaign-id}/
├── campaign.yaml           # Campaign metadata and settings
├── {module-folder}/        # One folder per enabled module
│   └── *.md               # Content files for that module
└── assets/                 # Images, maps, etc.
```

### Campaign Configuration Schema

```typescript
// app/shared/types/campaign.ts

interface CampaignConfig {
  id: string;
  name: string;
  description?: string;
  created: string;              // ISO date
  lastAccessed?: string;        // ISO date
  
  // Which modules are enabled (must match registered module IDs)
  modules: string[];
  
  // Module-specific settings (opaque to the dashboard)
  // Each module defines what settings it expects
  moduleSettings?: {
    [moduleId: string]: Record<string, unknown>;
  };
  
  // Sync configuration
  sync?: {
    googleDrivePath?: string;
    playerSitePath?: string;
  };
}

interface CampaignMeta {
  id: string;
  name: string;
  description?: string;
  lastAccessed?: string;
  path: string;
}
```

### Campaign Manager API

```typescript
// app/server/core/campaign-manager.ts

interface CampaignManager {
  // List available campaigns
  list(): Promise<CampaignMeta[]>;
  
  // Load a campaign's full config
  load(campaignId: string): Promise<CampaignConfig>;
  
  // Create a new campaign
  create(config: Omit<CampaignConfig, 'created'>): Promise<CampaignConfig>;
  
  // Update campaign config
  update(campaignId: string, updates: Partial<CampaignConfig>): Promise<CampaignConfig>;
  
  // Delete a campaign
  delete(campaignId: string): Promise<void>;
  
  // Get the currently active campaign
  getActive(): CampaignConfig | null;
  
  // Set the active campaign
  setActive(campaignId: string): Promise<CampaignConfig>;
}
```

---

## Module System

### Module Interface

This is the contract any module must fulfill to plug into the dashboard:

```typescript
// app/shared/types/module.ts

interface ModuleDefinition {
  // Identity
  id: string;                           // Unique identifier (e.g., 'characters')
  name: string;                         // Display name
  icon: string;                         // Lucide icon name for sidebar
  description?: string;
  
  // Data
  dataFolder: string;                   // Folder name within campaign directory
  
  // Validation (module provides its own schema)
  schema: ZodSchema;                    // For validating file frontmatter
  
  // Server routes (module provides its own handlers)
  routes: ModuleRoute[];
  
  // Client views (module provides its own components)
  views: {
    list: React.ComponentType;          // Main list/grid view
    detail: React.ComponentType;        // Single item view
    [key: string]: React.ComponentType; // Additional views as needed
  };
  
  // Optional: AI integration config
  ai?: ModuleAIConfig;
  
  // Optional: Player site generation
  playerSite?: ModulePlayerSiteConfig;
}

interface ModuleRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;                         // Relative to /api/modules/{moduleId}
  handler: express.RequestHandler;
}

interface ModuleAIConfig {
  enabled: boolean;
  // Module defines its own AI configuration
  [key: string]: unknown;
}

interface ModulePlayerSiteConfig {
  enabled: boolean;
  // Module defines its own player site configuration
  [key: string]: unknown;
}
```

### Module Registration

```typescript
// app/server/modules/registry.ts

interface ModuleRegistry {
  // Register a module
  register(module: ModuleDefinition): void;
  
  // Get all registered modules
  getAll(): ModuleDefinition[];
  
  // Get a specific module
  get(moduleId: string): ModuleDefinition | undefined;
  
  // Get modules enabled for a campaign
  getForCampaign(campaign: CampaignConfig): ModuleDefinition[];
  
  // Mount all module routes on the Express app
  mountRoutes(app: Express): void;
}
```

### Adding a Module (Future Process)

When a module is created, it will:

1. Define its schema in `app/shared/schemas/{module}.ts`
2. Define its routes in `app/server/modules/{module}/routes.ts`
3. Define its views in `app/client/modules/{module}/`
4. Export a `ModuleDefinition` from `app/server/modules/{module}/index.ts`
5. Register itself in `app/server/modules/registry.ts`

The dashboard shell does not need to change when modules are added.

---

## File System

### Generic File Types

```typescript
// app/shared/types/file.ts

// Minimal required frontmatter (modules can extend this)
interface BaseFrontmatter {
  id: string;
  name: string;
}

// A parsed markdown file
interface ParsedFile<T = Record<string, unknown>> {
  frontmatter: T & BaseFrontmatter;
  content: string;                      // Markdown body
  filePath: string;                     // Relative path within campaign
}

// Lightweight metadata for listings
interface FileMetadata {
  id: string;
  name: string;
  filePath: string;
  modified: string;                     // File modification time
  // Additional fields extracted from frontmatter (module-specific)
  [key: string]: unknown;
}
```

### File Store API

```typescript
// app/server/core/file-store.ts

interface FileStore {
  // List files in a module folder
  list(campaignId: string, moduleFolder: string): Promise<FileMetadata[]>;
  
  // Get a single file
  get(campaignId: string, moduleFolder: string, fileId: string): Promise<ParsedFile>;
  
  // Create a new file
  create(campaignId: string, moduleFolder: string, data: ParsedFile): Promise<ParsedFile>;
  
  // Update an existing file
  update(campaignId: string, moduleFolder: string, fileId: string, data: ParsedFile): Promise<ParsedFile>;
  
  // Delete a file
  delete(campaignId: string, moduleFolder: string, fileId: string): Promise<void>;
  
  // Get raw file path (for assets, etc.)
  getPath(campaignId: string, relativePath: string): string;
}
```

### Markdown Parser

```typescript
// app/server/core/markdown-parser.ts

interface MarkdownParser {
  // Parse markdown string into frontmatter + content
  parse(raw: string): { frontmatter: Record<string, unknown>; content: string };
  
  // Serialize frontmatter + content back to markdown string
  serialize(frontmatter: Record<string, unknown>, content: string): string;
  
  // Validate frontmatter against a Zod schema
  validate<T>(frontmatter: Record<string, unknown>, schema: ZodSchema<T>): T;
}
```

---

## Relationship Index

The dashboard maintains a graph of relationships between files. This is **generic**—modules declare which frontmatter fields contain references to other files.

```typescript
// app/server/core/relationship-index.ts

interface RelationshipIndex {
  // Rebuild index for a campaign (called on startup and file changes)
  rebuild(campaignId: string): Promise<void>;
  
  // Update index for a single file
  updateFile(campaignId: string, file: ParsedFile): Promise<void>;
  
  // Remove file from index
  removeFile(campaignId: string, fileId: string): Promise<void>;
  
  // Query relationships
  getRelated(campaignId: string, fileId: string): Promise<{
    references: FileMetadata[];       // Files this file links to
    referencedBy: FileMetadata[];     // Files that link to this file
  }>;
  
  // Get all files matching IDs
  resolveIds(campaignId: string, ids: string[]): Promise<FileMetadata[]>;
}

// Modules register which fields contain references
interface RelationshipFieldConfig {
  moduleId: string;
  fields: string[];                   // Frontmatter fields containing IDs
}
```

---

## API Routes

### Core Routes (Dashboard Shell)

```
# Campaign management
GET    /api/campaigns                   # List all campaigns
POST   /api/campaigns                   # Create campaign
GET    /api/campaigns/:id               # Get campaign config
PUT    /api/campaigns/:id               # Update campaign config
DELETE /api/campaigns/:id               # Delete campaign
POST   /api/campaigns/:id/activate      # Set as active campaign

# Active campaign info
GET    /api/active-campaign             # Get current active campaign

# Module info
GET    /api/modules                     # List registered modules
GET    /api/modules/:moduleId           # Get module definition

# Generic file operations (modules can use or override)
GET    /api/campaigns/:id/files/:moduleId              # List files
GET    /api/campaigns/:id/files/:moduleId/:fileId      # Get file
POST   /api/campaigns/:id/files/:moduleId              # Create file
PUT    /api/campaigns/:id/files/:moduleId/:fileId      # Update file
DELETE /api/campaigns/:id/files/:moduleId/:fileId      # Delete file

# Relationships
GET    /api/campaigns/:id/relationships/:fileId        # Get related files

# Sync
POST   /api/campaigns/:id/sync                         # Sync to Google Drive
```

### Module Routes

Modules register their own routes, mounted at `/api/modules/:moduleId/`. The dashboard provides base CRUD routes that modules can use or override.

---

## Client Architecture

### Providers

```typescript
// app/client/core/providers/CampaignProvider.tsx

interface CampaignContextValue {
  // Current campaign
  campaign: CampaignConfig | null;
  isLoading: boolean;
  
  // Available campaigns
  campaigns: CampaignMeta[];
  
  // Actions
  switchCampaign: (campaignId: string) => Promise<void>;
  createCampaign: (config: Partial<CampaignConfig>) => Promise<void>;
  
  // Module helpers
  enabledModules: ModuleDefinition[];
  getModuleSetting: <T>(moduleId: string, key: string) => T | undefined;
}
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Header                                                         │
│  [Logo] Campaign Hub          [Campaign Selector ▼] [Settings]  │
├──────────┬──────────────────────────────────────────────────────┤
│ Sidebar  │  Content Area                                        │
│          │                                                      │
│ [Module] │  (Rendered by ModuleRouter based on current route)   │
│ [Module] │                                                      │
│ [Module] │                                                      │
│          │                                                      │
│          │                                                      │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Module Router

The ModuleRouter dynamically renders module views based on the URL:

```
/                           → Dashboard home (campaign overview)
/modules/:moduleId          → Module list view
/modules/:moduleId/:fileId  → Module detail view
/settings                   → Settings page
```

```typescript
// app/client/core/ModuleRouter.tsx

// Router looks up the module from registry and renders its view
function ModuleRouter() {
  const { moduleId, fileId } = useParams();
  const { enabledModules } = useCampaign();
  
  const module = enabledModules.find(m => m.id === moduleId);
  if (!module) return <NotFound />;
  
  if (fileId) {
    return <module.views.detail fileId={fileId} />;
  }
  return <module.views.list />;
}
```

### Generic Hooks

```typescript
// app/client/hooks/useFiles.ts

// Generic file operations hook - modules can use directly or wrap
function useFiles(moduleId: string) {
  const { campaign } = useCampaign();
  
  return {
    // TanStack Query hooks
    list: useQuery([...]),
    get: (fileId: string) => useQuery([...]),
    create: useMutation([...]),
    update: useMutation([...]),
    delete: useMutation([...]),
  };
}
```

---

## Build Order

### Phase 1: Project Setup
- Initialize project with Vite, Express, TypeScript
- Configure Tailwind and shadcn/ui
- Set up folder structure
- Create development scripts

### Phase 2: Campaign Manager
- Implement campaign CRUD operations
- Campaign directory scanning
- campaign.yaml parsing/validation
- Active campaign state

### Phase 3: Module Registry
- Module registration system
- Dynamic route mounting
- Module definition types

### Phase 4: File Store
- Markdown parsing (gray-matter)
- Generic file CRUD
- File watching (chokidar)

### Phase 5: Client Shell
- Layout components
- Campaign provider
- Campaign selector
- Sidebar with module list
- Module router (renders placeholders until modules exist)

### Phase 6: Relationship Index
- Index building from files
- Relationship queries
- Incremental updates

### Phase 7: Sync Manager
- Google Drive sync
- Player site generation framework

---

## What Comes Next (Not Part of This Document)

After the dashboard shell is complete, modules will be designed and built individually. Each module design will specify:

- Its data schema (frontmatter fields)
- Its folder structure within campaigns
- Its UI views
- Its API routes (if beyond basic CRUD)
- Its AI integration (if any)
- Its player site output (if any)
- Its campaign settings (if any)

The dashboard architecture above supports all of this without knowing any details in advance.
