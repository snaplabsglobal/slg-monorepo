/**
 * Geometry Utils for Sketch Module
 */

export interface Point {
    x: number;
    y: number;
}

/**
 * Calculate area of a closed polygon using the Shoelace formula.
 * @param points Array of {x, y} coordinates usually in pixels
 * @param scale Area scale factor (e.g., if 1 unit = 1 inch, result is sq inches). 
 *              To get SqFt from pixels where 1px = 1 inch, divide by 144.
 * @returns Area in square units
 */
export function calculatePolygonArea(points: Point[], scale: number = 1): number {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area / 2) * scale;
}

/**
 * Convert pixel area to Square Feet assuming 1px = 1 inch
 */
export function pixelsToSqFt(pixelArea: number): number {
    return Math.round((pixelArea / 144) * 100) / 100;
}

/**
 * Snap end point to nearest 0, 45, 90 degree angle from start pount
 * @param start Start Point
 * @param current Current Point
 * @param thresholdPx Distance threshold in pixels (not angle) to trigger snap. 
 *                    Actually, angle threshold is better. Let's use distance deviation.
 *                    Actually, plan said "Magnetic Snapping: 15px radius".
 * @returns { point: Point, angle: number | null } angle is returned if snapped
 */
export function snapToAngle(start: Point, current: Point, thresholdPx: number = 15): { point: Point, angle: number | null, label: string | null } {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 10) return { point: current, angle: null, label: null }; // Too short to snap

    // Calculate actual angle
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * (180 / Math.PI); // -180 to 180

    // Candidates: 0, 90, 180, -90, 45, -45, 135, -135
    // Normalize to 0-360 or check differences
    
    const candidates = [
        { deg: 0, label: '0°' },
        { deg: 90, label: '90°' },
        { deg: 180, label: '0°' }, // Flat line is 0 deg for construction
        { deg: -180, label: '0°' },
        { deg: -90, label: '90°' },
        { deg: 45, label: '45°' },
        { deg: -45, label: '45°' },
        { deg: 135, label: '45°' },
        { deg: -135, label: '45°' }
    ];

    for (const cand of candidates) {
        // Check "distance deviation" - if we projected current point onto this angle line, how far is it?
        // Or simpler: check angular difference? 
        // Plan said: "15px radius". implies if |current - projected| < 15.
        
        const candRad = cand.deg * (Math.PI / 180);
        
        // Projected point on vector
        // Vector is (cos(candRad), sin(candRad))
        // Project (dx, dy) onto this vector
        // Dot product
        // wait, we just want to force the angle if it's close.
        
        const diff = Math.abs(angleDeg - cand.deg);
        // Normalize diff for -180/180 wrap
        // Actually simpler: 
        // 1. Calculate the ideal point at this angle with same distance
        const idealX = start.x + dist * Math.cos(candRad);
        const idealY = start.y + dist * Math.sin(candRad);
        
        // 2. Distance between current and ideal
        const distToSnap = Math.sqrt(Math.pow(current.x - idealX, 2) + Math.pow(current.y - idealY, 2));
        
        if (distToSnap < thresholdPx) {
            return { 
                point: { x: idealX, y: idealY }, 
                angle: cand.deg,
                label: cand.label
            };
        }
    }

    return { point: current, angle: null, label: null };
}
