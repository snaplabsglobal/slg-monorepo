# Rescue Components (Post-MVP)

> **Status: ARCHIVED** - Not used in MVP. Reserved for future advanced features.

These components implement a multi-step wizard for the original "Rescue Mode" design:

- `RescueWizard.tsx` - Main wizard state machine
- `RescueWizardLayout.tsx` - Wizard layout wrapper
- `RescueLanding.tsx` - Landing page
- `RescueEntryCard.tsx` - Entry point card
- `SourceSelector.tsx` - Photo source selection
- `ScanProgress.tsx` - Scan progress indicator
- `GroupPreview.tsx` - Cluster preview
- `GroupNaming.tsx` - Job naming step
- `ConfirmApply.tsx` - Final confirmation

## MVP Replacement

For MVP, a simplified single-page import flow is used instead:
- Route: `/import`
- Component: `app/import/page.tsx`
- No wizard, stateless API
