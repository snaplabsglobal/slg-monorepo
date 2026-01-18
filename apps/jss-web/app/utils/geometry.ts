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
