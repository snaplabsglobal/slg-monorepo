/**
 * Shared TypeScript types for SnapLabs Global
 */

// Auth and permissions
export * from './src/auth'

// Receipt types (shared across LS and JSS)
export interface Receipt {
    id: string;
    vendor_name: string;
    total_amount: number;
    currency: 'CAD' | 'USD';
    date: string;
    is_clear: boolean;
    summary: string;
    category?: string;
    notes?: string;
    image_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    user_id: string;
}

// User types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    app_origin: 'LS' | 'JSS' | 'SLG';
    created_at: string;
}

// API Response types
export interface APIResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// Common UI types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
