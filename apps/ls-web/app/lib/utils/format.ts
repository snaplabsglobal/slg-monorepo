// lib/utils/format.ts
// Utility functions for formatting data
// COO: "所见即所得" — transaction dates are stored as YYYY-MM-DD; display without timezone shift.

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Parse YYYY-MM-DD (or YYYY-MM-DDTHH:mm:ss...) without creating a Date object.
 * Returns [year, month1Based, day] or null if not parseable.
 * Accepts Date so Realtime/API payloads that deserialize as Date still parse correctly.
 */
function parseDateOnly(s: string | Date | null | undefined): [number, number, number] | null {
  if (s == null) return null;
  let str: string;
  if (typeof s === 'string') {
    str = s.trim();
  } else if (s instanceof Date && !Number.isNaN(s.getTime())) {
    str = s.toISOString().slice(0, 10);
  } else {
    return null;
  }
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return [y, m, d];
}

/**
 * Format a date-only value (YYYY-MM-DD string or Date) for display without timezone conversion.
 * Use this for transaction_date so 2025-01-30 always shows as Jan 30, 2025 regardless of user TZ.
 * Do NOT use new Date().toLocaleDateString() for display — it causes PST off-by-one and hydration #418.
 * Accepts Date so Realtime/API payloads that deserialize as Date still display consistently.
 */
export function formatDateOnly(isoDateString: string | Date | null | undefined, format: 'short' | 'long' = 'short'): string {
  const parsed = parseDateOnly(isoDateString);
  if (!parsed) return '';
  const [year, month1Based, day] = parsed;
  const months = format === 'short' ? MONTH_SHORT : MONTH_LONG;
  const month = months[month1Based - 1];
  return `${month} ${day}, ${year}`;
}

export function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format date for display. For ISO date-only strings (YYYY-MM-DD), uses timezone-agnostic
 * parsing so transaction_date does not shift (e.g. 2025-01-30 stays Jan 30, 2025 in Vancouver).
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  if (typeof date === 'string') {
    const parsed = parseDateOnly(date);
    if (parsed) return formatDateOnly(date, format);
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(d);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
