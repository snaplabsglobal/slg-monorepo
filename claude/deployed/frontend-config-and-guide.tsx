// ========================================
// LedgerSnap - Frontend Configuration & Styling
// ========================================
// Tailwind Config, Global Styles, and Component Guide
// ========================================

// ========================================
// 1. Tailwind Configuration
// ========================================
// File: tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Secondary colors
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // Indigo
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Success/Emerald
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Warning/Amber
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Error/Red
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Lexend', 'Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
        'strong': '0 10px 40px -5px rgba(0, 0, 0, 0.15), 0 20px 30px -10px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;

// ========================================
// 2. Global Styles
// ========================================
// File: app/globals.css

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap');

@layer base {
  :root {
    /* Custom CSS variables for theming */
    --radius: 0.75rem;
  }

  * {
    @apply border-gray-200;
  }

  body {
    @apply bg-gray-50 text-gray-900;
    @apply font-sans antialiased;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    @apply w-2 h-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-gray-100;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
  }

  /* Selection */
  ::selection {
    @apply bg-blue-100 text-blue-900;
  }
}

@layer components {
  /* Button variants */
  .btn-primary {
    @apply px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 
           hover:from-blue-700 hover:to-indigo-700 text-white font-semibold 
           rounded-xl shadow-lg hover:shadow-xl transition-all duration-200;
  }

  .btn-secondary {
    @apply px-6 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 
           text-gray-700 font-semibold rounded-xl transition-all duration-200;
  }

  .btn-ghost {
    @apply px-4 py-2 text-gray-700 hover:bg-gray-100 
           rounded-lg transition-all duration-200;
  }

  /* Input styles */
  .input-base {
    @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
           focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
           transition-all outline-none;
  }

  /* Card styles */
  .card {
    @apply bg-white rounded-2xl shadow-md border border-gray-100 p-6;
  }

  .card-hover {
    @apply bg-white rounded-2xl shadow-md hover:shadow-xl 
           border border-gray-100 hover:border-blue-200 
           transition-all duration-300 cursor-pointer;
  }

  /* Badge styles */
  .badge {
    @apply inline-flex items-center px-3 py-1.5 rounded-lg 
           text-xs font-semibold border;
  }

  /* Gradient backgrounds */
  .gradient-blue {
    @apply bg-gradient-to-br from-blue-600 to-indigo-600;
  }

  .gradient-emerald {
    @apply bg-gradient-to-br from-emerald-600 to-teal-600;
  }

  .gradient-purple {
    @apply bg-gradient-to-br from-purple-600 to-pink-600;
  }

  /* Animation helpers */
  .animate-on-scroll {
    @apply opacity-0 translate-y-4 transition-all duration-700;
  }

  .animate-on-scroll.is-visible {
    @apply opacity-100 translate-y-0;
  }
}

@layer utilities {
  /* Text gradients */
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600;
  }

  /* Glass morphism */
  .glass {
    @apply bg-white/70 backdrop-blur-lg border border-white/20;
  }

  /* Truncate multiple lines */
  .line-clamp-1 {
    @apply overflow-hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .line-clamp-2 {
    @apply overflow-hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .line-clamp-3 {
    @apply overflow-hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
}

// ========================================
// 3. Component Usage Guide
// ========================================
// File: COMPONENT_GUIDE.md

# LedgerSnap Frontend Components Guide

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6) - Trust, professionalism
- **Secondary**: Indigo (#8B5CF6) - Premium, modern
- **Success**: Emerald (#10B981) - Positive actions
- **Warning**: Amber (#F59E0B) - Caution
- **Error**: Red (#EF4444) - Destructive actions

### Typography
- **Display**: Lexend (headings, hero text)
- **Body**: Inter (paragraphs, UI text)

### Spacing
- Small: 0.5rem (8px)
- Medium: 1rem (16px)
- Large: 1.5rem (24px)
- XL: 2rem (32px)

## 📦 Component Inventory

### 1. Upload Receipt
**File**: `components/receipts/upload-receipt.tsx`

**Usage**:
```tsx
import { UploadReceipt } from '@/components/receipts/upload-receipt';

<UploadReceipt
  onUploadSuccess={(receiptId) => console.log(receiptId)}
  onCancel={() => router.back()}
/>
```

**Features**:
- Drag & drop support
- Image preview
- File validation (type, size)
- AI analysis loading state
- Success animation
- Error handling

---

### 2. Receipt Card
**File**: `components/receipts/receipt-card.tsx`

**Usage**:
```tsx
import { ReceiptCard } from '@/components/receipts/receipt-card';

<ReceiptCard
  receipt={receipt}
  onClick={() => router.push(`/receipts/${receipt.id}`)}
  onDelete={(id) => handleDelete(id)}
  onEdit={(id) => router.push(`/receipts/${id}/edit`)}
/>
```

**Features**:
- Responsive card layout
- Image lazy loading
- Category badge with color coding
- Hover effects
- Context menu (edit, delete, download)
- Confidence score indicator

---

### 3. Receipt List
**File**: `components/receipts/receipt-list.tsx`

**Usage**:
```tsx
import { ReceiptList } from '@/components/receipts/receipt-list';

<ReceiptList
  onReceiptClick={(receipt) => handleClick(receipt)}
  onReceiptDelete={(id) => handleDelete(id)}
  onReceiptEdit={(id) => handleEdit(id)}
/>
```

**Features**:
- Search functionality
- Category filtering
- Date range filtering
- Responsive grid layout
- Loading skeletons
- Empty state

---

### 4. Receipt Detail
**File**: `components/receipts/receipt-detail.tsx`

**Usage**:
```tsx
import { ReceiptDetail } from '@/components/receipts/receipt-detail';

<ReceiptDetail
  receipt={receipt}
  onBack={() => router.back()}
  onUpdate={(id, updates) => handleUpdate(id, updates)}
  onDelete={(id) => handleDelete(id)}
/>
```

**Features**:
- Full receipt image display
- Inline editing
- Form validation
- Confidence score visualization
- Metadata display
- Action buttons (edit, delete, download)

---

### 5. Monthly Report
**File**: `components/reports/monthly-report.tsx`

**Usage**:
```tsx
import { MonthlyReport } from '@/components/reports/monthly-report';

<MonthlyReport />
```

**Features**:
- Month navigation
- Summary cards with gradients
- Pie chart (category breakdown)
- Detailed category table
- CSV export
- Responsive layout

---

### 6. Dashboard Layout
**File**: `components/layout/dashboard-layout.tsx`

**Usage**:
```tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Your page content */}
    </DashboardLayout>
  );
}
```

**Features**:
- Responsive sidebar
- Mobile menu
- Navigation highlighting
- User menu
- Upload button (sticky)
- Logout functionality

---

### 7. Login & Register Pages
**Files**: 
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`

**Features**:
- Form validation
- Password visibility toggle
- Error handling
- Success states
- Responsive design
- Loading states

---

## 🎯 Page Structure Examples

### Receipt List Page
```tsx
// app/(dashboard)/receipts/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ReceiptList } from '@/components/receipts/receipt-list';

export default function ReceiptsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            My Receipts
          </h1>
          <Link href="/receipts/upload">
            <button className="btn-primary">
              Upload Receipt
            </button>
          </Link>
        </div>
        
        <ReceiptList />
      </div>
    </DashboardLayout>
  );
}
```

### Upload Page
```tsx
// app/(dashboard)/receipts/upload/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UploadReceipt } from '@/components/receipts/upload-receipt';

export default function UploadPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Upload Receipt
        </h1>
        <UploadReceipt />
      </div>
    </DashboardLayout>
  );
}
```

### Reports Page
```tsx
// app/(dashboard)/reports/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { MonthlyReport } from '@/components/reports/monthly-report';

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <MonthlyReport />
    </DashboardLayout>
  );
}
```

---

## 🔧 Utilities

### Format Utilities
```tsx
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/format';

formatCurrency(45.99, 'CAD'); // "$45.99"
formatDate('2026-01-27'); // "Jan 27, 2026"
formatRelativeTime(new Date()); // "Just now"
```

### API Client
```tsx
import { api } from '@/lib/api/client';

// GET request
const receipts = await api.get('/api/receipts');

// POST request
const newReceipt = await api.post('/api/receipts', { 
  merchant_name: 'Starbucks',
  total_amount: 15.99,
});

// PATCH request
await api.patch(`/api/receipts/${id}`, { notes: 'Updated note' });

// DELETE request
await api.delete(`/api/receipts/${id}`);
```

---

## 🎨 Custom Styling

### Using Tailwind Classes
```tsx
// Primary button
<button className="btn-primary">
  Click Me
</button>

// Card with hover effect
<div className="card-hover">
  Content
</div>

// Input field
<input className="input-base" />

// Badge
<span className="badge bg-blue-100 text-blue-700 border-blue-200">
  Category
</span>
```

### Custom Gradients
```tsx
// Blue gradient background
<div className="gradient-blue text-white p-8 rounded-2xl">
  Content
</div>

// Text gradient
<h1 className="text-4xl font-bold text-gradient">
  LedgerSnap
</h1>
```

---

## 📱 Responsive Design

All components are mobile-first and responsive:

- **Mobile**: 320px - 639px
- **Tablet**: 640px - 1023px
- **Desktop**: 1024px+

Example:
```tsx
<div className="
  grid 
  grid-cols-1           /* Mobile: 1 column */
  md:grid-cols-2        /* Tablet: 2 columns */
  lg:grid-cols-3        /* Desktop: 3 columns */
  gap-6
">
  {/* Cards */}
</div>
```

---

## ✨ Animation Examples

```tsx
// Fade in on mount
<div className="animate-fade-in">
  Content
</div>

// Slide up effect
<div className="animate-slide-up">
  Content
</div>

// Scale in effect
<div className="animate-scale-in">
  Content
</div>

// Loading spinner
<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
```

---

## 🚀 Best Practices

1. **Always use TypeScript** for type safety
2. **Import types** from `@/types/receipt`
3. **Use API client** for all HTTP requests
4. **Handle errors gracefully** with try-catch
5. **Show loading states** during async operations
6. **Validate user input** before submission
7. **Use semantic HTML** for accessibility
8. **Test on mobile devices** regularly
9. **Keep components focused** (single responsibility)
10. **Document complex logic** with comments

---

## 📚 Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "lucide-react": "^0.300.0",
    "recharts": "^2.10.0",
    "@supabase/supabase-js": "^2.38.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

**Need help?** Contact the development team or check the main project documentation.
