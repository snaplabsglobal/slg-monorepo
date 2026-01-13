# SnapUI Design System

**Version**: 1.0.0  
**Status**: Active Development

## Overview

SnapUI is the shared component library and design system for all SnapLabs Global products. It provides a consistent, luxury SaaS aesthetic across SLG Portal, LedgerSnap, and JobSite Snap.

## Installation

```bash
# In your app's package.json
{
  "dependencies": {
    "@slo/snap-ui": "*"
  }
}
```

## Usage

### Import Styles

```tsx
// In your app's root layout or _app.tsx
import '@slo/snap-ui/styles';
```

### Use Components

```tsx
import { Button, Input, Card } from '@slo/snap-ui';

function MyComponent() {
  return (
    <Card variant="elevated">
      <Input label="Email" type="email" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## Components

### Button

Primary action component with multiple variants.

**Variants**: `primary`, `secondary`, `ghost`, `danger`  
**Sizes**: `sm`, `md`, `lg`

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

### Input

Text input with label and error states.

```tsx
<Input 
  label="Vendor Name"
  placeholder="Enter vendor name"
  error={errors.vendor}
  fullWidth
/>
```

### Card

Content container with elevation and interaction states.

**Variants**: `elevated`, `flat`, `interactive`

```tsx
<Card variant="interactive" header={<h3>Title</h3>}>
  Content goes here
</Card>
```

## Design Tokens

### Colors

```css
--snap-graphite: #1A1A1B
--snap-glacier: #F5F5F7
--snap-emerald: #00C805
```

### Spacing (8px grid)

```css
--snap-space-1: 4px
--snap-space-2: 8px
--snap-space-3: 16px
--snap-space-4: 24px
```

### Typography

```css
--snap-text-sm: 14px
--snap-text-base: 16px
--snap-text-lg: 20px
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm run test

# Storybook
npm run storybook
```

## Documentation

- [Full Design System Spec](../../.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/design-system-spec.md)
- [Moodboard](../../.gemini/antigravity/brain/754cbca8-262c-4a00-b209-63a412b7e128/moodboard.md)

## License

Proprietary - SnapLabs Global © 2026
