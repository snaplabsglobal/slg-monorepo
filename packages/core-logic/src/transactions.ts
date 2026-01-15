import { supabase } from './supabase';

interface TransactionItem {
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    category?: string;
}

interface CreateTransactionParams {
    org_id: string;
    user_id: string;
    source_app: string;
    total_amount: number;
    vendor_name: string;
    transaction_date: string;
    currency?: string;
    category_tax?: string;
    summary?: string;
    attachment_url?: string;
    items?: TransactionItem[];
    raw_data?: any;
}

export async function saveTransaction(params: CreateTransactionParams) {
    const { items, ...transactionData } = params;

    // 1. Insert Transaction
    const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
            ...transactionData,
            direction: 'expense', // Default assumption
            currency: params.currency || 'CAD'
        })
        .select()
        .single();

    if (transError) throw transError;
    if (!transaction) throw new Error('Failed to create transaction record');

    // 2. Insert Items (if any)
    if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
            transaction_id: transaction.id,
            description: item.description,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            amount: item.amount,
            category: item.category
        }));

        const { error: itemsError } = await supabase
            .from('transaction_items')
            .insert(itemsToInsert);

        if (itemsError) {
            // Rollback strategy would be ideal here, but Supabase JS client doesn't support transactions without RPC.
            // For now, we log critical error. In production, use RPC.
            console.error('Failed to insert transaction items:', itemsError);
            throw itemsError;
        }
    }

    return transaction;
}
