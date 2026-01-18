export type PricingContext = {
    quantity: number;
    unitCost: number;
    markupPercent: number; // e.g. 20
    riskFactor: number;    // e.g. 0.10
}

export function calculatePrice(ctx: PricingContext): number {
    const base = ctx.quantity * ctx.unitCost;
    const withMarkup = base * (1 + ctx.markupPercent / 100);
    const withRisk = withMarkup * (1 + ctx.riskFactor);
    return parseFloat(withRisk.toFixed(2));
}

export function determineAutoRisk(serverTags: string[]): number {
    if (serverTags.includes('old_house')) {
        return 0.10;
    }
    return 0;
}
