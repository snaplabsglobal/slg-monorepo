'use client';
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Package, Plus, Trash2 } from 'lucide-react';

interface AddFromStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string; // The project getting the stock
    onSuccess?: () => void;
}

export default function AddFromStockModal({ isOpen, onClose, projectId, onSuccess }: AddFromStockModalProps) {
    const supabase = createClient();
    const [presets, setPresets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection State
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);

    // Config State (for adding new items)
    const [isConfigMode, setIsConfigMode] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('ea');
    const [newItemPrice, setNewItemPrice] = useState(0);

    // Load Presets
    useEffect(() => {
        if (isOpen) loadPresets();
    }, [isOpen]);

    const loadPresets = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch User's Org ID first? Or simply RLS handles it?
        // Let's rely on RLS. We just select * from stock_presets.
        const { data, error } = await supabase
            .from('stock_presets')
            .select('*')
            .order('name');

        if (data) setPresets(data);
    };

    const handleAddStock = async () => {
        if (!selectedItem) return;
        setLoading(true);

        const totalCost = selectedItem.default_price * quantity;

        const { error } = await supabase
            .from('transactions')
            .insert({
                project_id: projectId,
                description: `Stock: ${selectedItem.name} (${quantity}${selectedItem.unit})`,
                total_amount: totalCost,
                transaction_date: new Date().toISOString(),
                expense_type: 'internal_stock',
                direction: 'expense',
                status: 'posted' // Auto-approved
            });

        if (error) {
            alert('Failed: ' + error.message);
        } else {
            if (onSuccess) onSuccess();
            onClose();
        }
        setLoading(false);
    };

    const handleCreatePreset = async () => {
        if (!newItemName) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Should handle org fetching properly in real app

        // Fetch Org ID (Hack for MVP: Get from first preset or generic query)
        // Better: Query profile.organization_id.
        // Assuming profile trigger sets it, let's do a quick fetch.
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        if (!profile?.organization_id) {
            alert("No organization found.");
            return;
        }

        const { error } = await supabase.from('stock_presets').insert({
            organization_id: profile.organization_id,
            name: newItemName,
            unit: newItemUnit,
            default_price: newItemPrice
        });

        if (!error) {
            setIsConfigMode(false);
            setNewItemName('');
            loadPresets(); // Reload
        }
    };

    const handleDeletePreset = async (id: string) => {
        if (!confirm("Remove this item from your list?")) return;
        await supabase.from('stock_presets').delete().eq('id', id);
        loadPresets();
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">

                            <div className="flex justify-between items-center mb-4">
                                <Dialog.Title as="h3" className="text-lg font-bold flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    Add From Stock
                                </Dialog.Title>
                                <button
                                    onClick={() => setIsConfigMode(!isConfigMode)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {isConfigMode ? 'Done Managing' : 'Manage Items'}
                                </button>
                            </div>

                            {/* Preset List */}
                            {!isConfigMode ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                        {presets.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedItem(item)}
                                                className={`p-3 rounded-lg border text-left transition-all ${selectedItem?.id === item.id
                                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="font-bold text-sm truncate">{item.name}</div>
                                                <div className="text-xs text-gray-500 flex justify-between mt-1">
                                                    <span>${item.default_price}/{item.unit}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedItem && (
                                        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Quantity ({selectedItem.unit})</span>
                                                <input
                                                    type="number"
                                                    value={quantity}
                                                    onChange={e => setQuantity(Number(e.target.value))}
                                                    className="w-20 text-center border-b-2 border-gray-300 font-bold bg-transparent"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <span className="text-sm font-bold text-gray-500">Total Value</span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    ${(selectedItem.default_price * quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAddStock}
                                        disabled={!selectedItem || loading}
                                        className="w-full bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm Stock Usage'}
                                    </button>
                                </div>
                            ) : (
                                // Manager Mode
                                <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Create New Preset</h4>
                                    <div className="space-y-2">
                                        <input
                                            placeholder="Item Name (e.g. Wire Nuts)"
                                            className="w-full p-2 border rounded"
                                            value={newItemName}
                                            onChange={e => setNewItemName(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="Unit (e.g. box)"
                                                className="w-1/2 p-2 border rounded"
                                                value={newItemUnit}
                                                onChange={e => setNewItemUnit(e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Default Price"
                                                className="w-1/2 p-2 border rounded"
                                                value={newItemPrice}
                                                onChange={e => setNewItemPrice(Number(e.target.value))}
                                            />
                                        </div>
                                        <button
                                            onClick={handleCreatePreset}
                                            className="w-full bg-blue-600 text-white p-2 rounded font-bold text-sm"
                                        >
                                            Add to List
                                        </button>
                                    </div>

                                    <div className="border-t pt-4 mt-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">My List</h4>
                                        <ul className="space-y-1">
                                            {presets.map(item => (
                                                <li key={item.id} className="flex justify-between text-sm p-1 hover:bg-white rounded">
                                                    <span>{item.name}</span>
                                                    <button onClick={() => handleDeletePreset(item.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
