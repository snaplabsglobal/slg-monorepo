/**
 * Theme configuration for SnapLabs Global applications
 * Supports different color schemes for each application
 */

export type ThemeName = 'slg-corporate' | 'ls-web' | 'jss-web'

export interface ThemeConfig {
  name: ThemeName
  primary: {
    DEFAULT: string
    dark: string
    light: string
    50: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
  }
  accent: {
    DEFAULT: string
    dark: string
    light: string
    50: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
  }
  description: string
}

/**
 * 建筑蓝 (Architectural Blue) - Primary theme for LS-Web
 * Focus: Financial rigor, professional, trustworthy
 */
export const lsWebTheme: ThemeConfig = {
  name: 'ls-web',
  primary: {
    DEFAULT: '#1E40AF', // Deep professional blue
    dark: '#1E3A8A',
    light: '#3B82F6',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  accent: {
    DEFAULT: '#1E40AF', // Use primary blue as accent for consistency
    dark: '#1E3A8A',
    light: '#3B82F6',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  description: 'Financial rigor with architectural blue - professional and trustworthy',
}

/**
 * 活力橙 (Vibrant Orange) - Primary theme for JSS-Web
 * Focus: Energy, action, construction site vibrancy
 */
export const jssWebTheme: ThemeConfig = {
  name: 'jss-web',
  primary: {
    DEFAULT: '#F97316', // Vibrant orange
    dark: '#EA580C',
    light: '#FB923C',
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  accent: {
    DEFAULT: '#F97316', // Use primary orange as accent
    dark: '#EA580C',
    light: '#FB923C',
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  description: 'Vibrant orange for action buttons - energetic and construction-focused',
}

/**
 * SLG Corporate - Balanced theme with both colors
 */
export const slgCorporateTheme: ThemeConfig = {
  name: 'slg-corporate',
  primary: {
    DEFAULT: '#1E40AF', // Architectural blue
    dark: '#1E3A8A',
    light: '#3B82F6',
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  accent: {
    DEFAULT: '#F97316', // Vibrant orange
    dark: '#EA580C',
    light: '#FB923C',
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  description: 'Balanced theme with architectural blue and vibrant orange',
}

export const themes: Record<ThemeName, ThemeConfig> = {
  'slg-corporate': slgCorporateTheme,
  'ls-web': lsWebTheme,
  'jss-web': jssWebTheme,
}

/**
 * Get theme configuration by name
 */
export function getTheme(themeName: ThemeName): ThemeConfig {
  return themes[themeName]
}

/**
 * Generate Tailwind CSS theme configuration
 */
export function generateTailwindTheme(theme: ThemeConfig) {
  return {
    colors: {
      primary: theme.primary,
      accent: theme.accent,
    },
  }
}
