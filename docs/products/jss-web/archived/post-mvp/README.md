# Post-MVP / Advanced Features

> **Status: ARCHIVED** - Do not execute. Reserved for future releases.

This folder contains design documents for advanced features that are **not part of MVP**.

## Rescue Mode (Self-Rescue)

The original "Rescue Mode" concept was a multi-step wizard flow for organizing unassigned photos. It has been **simplified** for MVP:

### MVP Implementation (Current)
- Route: `/import`
- Single page with "Find Unassigned Photos" button
- Simple cluster review: Confirm or Skip
- No wizard, no session storage, stateless API

### Post-MVP Features (This Folder)
- Multi-step wizard flow
- Session-based scan with persistent state
- Geocoding integration
- Three-state logic (unreviewed/confirmed/skipped)
- Marketing materials and onboarding flows

## Files in This Folder

| File | Description |
|------|-------------|
| `260207_JSS_SelfRescueMode产品改进会议记录与最终方案.md` | Product meeting notes |
| `260207_JSS_SelfRescueMode官网宣传文案与营销策略.md` | Marketing copy |
| `260207_JSS_SelfRescueMode完整技术规格_CTO执行版.md` | Full technical spec |
| `260207_JSS_SelfRescueMode完整UI实现_前端执行版.md` | Full UI implementation |
| `260208_JSS_SelfRescueMode_CTO执行版_整合精简.md` | Consolidated CTO spec |
| `260208_JSS_RescueMode三态逻辑与产品改造方案.md` | Three-state logic design |
| `260208_JSS_RescueMode流程补回完整方案.md` | Flow completion plan |

## When to Revisit

Consider implementing these features when:
1. MVP is stable and adopted
2. Users request advanced organization features
3. Geocoding/mapping integration is prioritized
