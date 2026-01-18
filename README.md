# SnapLabs Global - Frontend Monorepo

**Brand Positioning**: Luxury SaaS · Premium Construction Tech · Apple-Grade Polish

## Overview

This monorepo contains the complete frontend ecosystem for SnapLabs Global:

- **SLG Portal** (`apps/slg-portal`) - Brand showcase website
- **LedgerSnap** (`apps/ledgersnap`) - Mobile-first receipt management tool
- **JobSite Snap** (`apps/jobsitesnap`) - Construction project management dashboard
- **SnapUI** (`packages/snap-ui`) - Shared component library and design system

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **Styling**: CSS Modules + CSS Variables
- **Monorepo**: Turborepo
- **Package Manager**: npm 9+
- **Node**: 20+ LTS

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher

### Installation

```bash
# Install all dependencies
npm install
```

### Development

```bash
# Run all apps in development mode
npm run dev

# Run specific app
npm run dev --filter=slg-portal
npm run dev --filter=ledgersnap
npm run dev --filter=jobsitesnap
```

### Build

```bash
# Build all apps
npm run build

# Build specific app
npm run build --filter=slg-portal
```

### Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --filter=snap-ui
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Type check
npm run type-check
```

## Project Structure

```
slo-monorepos/
├── apps/
│   ├── slg-portal/          # SLG - The Face
│   ├── ledgersnap/          # LS - The Edge
│   └── jobsitesnap/         # JSS - The Core
├── packages/
│   ├── snap-ui/             # Shared component library
│   ├── snap-types/          # Shared TypeScript types
│   └── snap-config/         # Shared configs
├── tools/
│   └── scripts/             # Build and deployment scripts
├── turbo.json               # Turborepo configuration
└── package.json             # Root package.json
```

## Design System

All applications use the **SnapUI Design System v1.0**:

- **Colors**: Graphite Black (#1A1A1B), Glacier White (#F5F5F7), Emerald Green (#00C805)
- **Typography**: SF Pro (iOS), Inter (Android/Web)
- **Spacing**: 8px grid system
- **Components**: Atomic design methodology

See `packages/snap-ui/README.md` for full design system documentation.

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 80-character line limit
- **Linting**: ESLint with recommended rules
- **Naming**: PascalCase for components, camelCase for functions

### Git Workflow

```bash
# Branch naming
feature/camera-ux
fix/receipt-upload
hotfix/security-patch

# Commit messages (Conventional Commits)
feat: add camera capture functionality
fix: resolve receipt upload timeout
docs: update README
```

### Testing Standards

- **Unit Tests**: Vitest
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: 80% minimum

## Performance Targets

| App | Lighthouse Score | Bundle Size (Gzipped) |
|-----|------------------|----------------------|
| SLG Portal | 95+ | < 300 KB |
| LedgerSnap | 95+ | < 400 KB |
| JobSite Snap | 95+ | < 500 KB |

## Documentation

- [Implementation Plan](/.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/implementation_plan.md)
- [Design System Spec](/.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/design-system-spec.md)
- [Visual Moodboard](/.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/moodboard.md)
- [Camera UX Spec](/.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/camera-ux-spec.md)
- [Clean Code Promise](/.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/clean-code-promise.md)

## License

Proprietary - SnapLabs Global © 2026

## Contact

For   questions or support, contact the AG Development Team.
