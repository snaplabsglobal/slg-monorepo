/**
 * Design token exports for programmatic access
 */

export const colors = {
    graphite: '#1A1A1B',
    glacier: '#F5F5F7',
    emerald: '#00C805',
    gray: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
    },
    semantic: {
        success: '#00C805',
        warning: '#FF9500',
        error: '#FF3B30',
        info: '#007AFF',
    },
} as const;

export const spacing = {
    1: '4px',
    2: '8px',
    3: '16px',
    4: '24px',
    5: '32px',
    6: '48px',
    7: '64px',
    8: '96px',
    9: '128px',
} as const;

export const typography = {
    sizes: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
    },
    weights: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },
} as const;
