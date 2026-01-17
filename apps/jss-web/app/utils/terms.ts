export type TermKey = 
  | 'PROJECT'
  | 'SITE'
  | 'TIMECARD'
  | 'RECEIPT'
  | 'CLIENT'
  | 'SUB_CONTRACTOR';

export const DEFAULT_TERMS: Record<TermKey, string> = {
  PROJECT: 'Project',
  SITE: 'Job Site',
  TIMECARD: 'Timecard',
  RECEIPT: 'Receipt',
  CLIENT: 'Client',
  SUB_CONTRACTOR: 'Subcontractor'
};

export const LEGAL_TERMS: Record<TermKey, string> = {
  PROJECT: 'Matter',
  SITE: 'Case Location',
  TIMECARD: 'Billable Hours',
  RECEIPT: 'Expense',
  CLIENT: 'Client',
  SUB_CONTRACTOR: 'Co-Counsel'
};

/**
 * Get the display text for a specific term based on configuration.
 * @param key The universal term key (e.g. 'PROJECT')
 * @param config Optional JSON configuration from Organization settings
 * @returns The localized/industry-specific string
 */
export function getTerm(key: TermKey, config?: Record<string, string> | null): string {
    if (config && config[key]) {
        return config[key];
    }
    return DEFAULT_TERMS[key];
}

/**
 * Hook-like helper if we need pluralization later
 */
export function getTermPlural(key: TermKey, config?: Record<string, string> | null): string {
    const term = getTerm(key, config);
    if (term.endsWith('y')) return term.slice(0, -1) + 'ies';
    if (term.endsWith('ss')) return term + 'es';
    return term + 's';
}
