/**
 * Ballpark Engine v1.0
 * Provides rough order of magnitude (ROM) estimates.
 */

interface BallparkRequest {
    type: 'BATHROOM' | 'KITCHEN' | 'DECK' | 'PAINT';
    level: 'BASIC' | 'MID' | 'HIGH';
    sqft?: number;
}

interface BallparkResult {
    low: number;
    high: number;
    currency: string;
    description: string;
}

export const getBallparkEstimate = (req: BallparkRequest): BallparkResult => {
    let base = 0;
    let multiplier = 1;

    // Quality Level
    switch (req.level) {
        case 'BASIC': multiplier = 1.0; break;
        case 'MID': multiplier = 1.5; break;
        case 'HIGH': multiplier = 2.5; break;
    }

    // Type Baselines (CAD)
    switch (req.type) {
        case 'BATHROOM':
            base = 15000; // Standard 5x8
            break;
        case 'KITCHEN':
            base = 35000;
            break;
        case 'DECK':
            base = 50 * (req.sqft || 200); // $50/sqft base
            break;
        case 'PAINT':
            base = 3 * (req.sqft || 1000); // $3/sqft
            break;
    }

    const estimate = base * multiplier;
    
    // Create Range (-10% to +20%)
    return {
        low: Math.round(estimate * 0.9 / 100) * 100,
        high: Math.round(estimate * 1.2 / 100) * 100,
        currency: 'CAD',
        description: `Ballpark for ${req.level.toLowerCase()} ${req.type.toLowerCase()}`
    };
};
