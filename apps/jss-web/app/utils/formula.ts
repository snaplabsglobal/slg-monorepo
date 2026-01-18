/**
 * Formula Logic v1.0
 */

/**
 * Evaluate a formula string with variables.
 * @param formula e.g. "{area} * 1.1"
 * @param variables e.g. { area: 100, perimeter: 40 }
 */
export function evaluateFormula(formula: string, variables: Record<string, number>): number {
    if (!formula) return 0;
    
    // Replace {var} with values
    let parsed = formula;
    for (const [key, value] of Object.entries(variables)) {
        // Regex to replace {key} globally case-insensitive
        const regex = new RegExp(`{${key}}`, 'gi');
        parsed = parsed.replace(regex, String(value));
    }
    
    // Safety check: only allow numbers, operators, parens, decimal
    if (!/^[0-9+\-*/().\s]*$/.test(parsed)) {
        console.error('Unsafe formula char detected:', parsed);
        return 0; // Prevent eval injection
    }
    
    try {
        // eslint-disable-next-line no-new-func
        return new Function(`return ${parsed}`)();
    } catch (e) {
        console.error('Formula eval error:', e);
        return 0;
    }
}

export type EstimateItem = {
    id: string;
    logic_formula?: string;
    unit_price: number; // If formula exists, this might be base rate? 
                        // Actually, formula usually calculates Quantity. 
                        // Price = Qty * UnitPrice.
                        // Or Formula calculates Total Price directly?
                        // Plan said: "Floor Tile Qty = {area} * 1.1". 
                        // So Formula -> Quantity.
                        // Let's assume Formula output = Quantity. 
                        // If logic_formula is present, quantity is derived.
    quantity: number;
    total_price?: number; 
};

export function calculateDynamicCost(items: EstimateItem[], variables: Record<string, number>): number {
    let total = 0;
    items.forEach(item => {
        let itemQty = item.quantity;
        if (item.logic_formula) {
            itemQty = evaluateFormula(item.logic_formula, variables);
            // Optional: Should we update item.quantity in memory? Yes for display.
        }
        // If logic_formula calculates QTY, then Total = Qty * Price
        // Wait, plan said "Cost Panel shows $500".
        // item must have unit_price.
        total += (itemQty * (item.unit_price || 0)); 
    });
    return total;
}
