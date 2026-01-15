export type Feature =
    | 'access_payroll'
    | 'multi_org_dashboard';

export type Plan = 'Free' | 'JSS Base' | 'Team' | 'Enterprise';

export const PERMISSIONS: Record<Feature, Plan[]> = {
    access_payroll: ['Team', 'Enterprise'],
    multi_org_dashboard: ['Enterprise']
};

export function hasPermission(plan: Plan, feature: Feature): boolean {
    const allowedPlans = PERMISSIONS[feature];
    return allowedPlans.includes(plan);
}

export function isPlan(plan: string): plan is Plan {
    return ['Free', 'JSS Base', 'Team', 'Enterprise'].includes(plan);
}
