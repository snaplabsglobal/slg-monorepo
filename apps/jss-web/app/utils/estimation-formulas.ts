export type Measurement = {
    area_sqft: number;
    perimeter_ft: number;
    wall_height_ft: number;
}

export type CalcFormula = 'area' | 'perimeter' | 'wall_area' | 'manual';

export function calculateQuantity(m: Measurement, formula: CalcFormula): number {
    switch (formula) {
        case 'area':
            return m.area_sqft;
        case 'perimeter':
            return m.perimeter_ft;
        case 'wall_area':
            return m.perimeter_ft * m.wall_height_ft;
        default:
            return 0;
    }
}
