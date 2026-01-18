'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, AlertTriangle, RefreshCw, Wand2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TradeSettingsPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Org State
    const [orgId, setOrgId] = useState<string | null>(null);
    const [currentTrade, setCurrentTrade] = useState('general');
    const [currentCustomName, setCurrentCustomName] = useState('');

    // Form State
    const [selectedTrade, setSelectedTrade] = useState('general');
    const [customNameInput, setCustomNameInput] = useState('');
    const [resetInventory, setResetInventory] = useState(false);

    // AI & List State
    const [aiLoading, setAiLoading] = useState(false);
    const [customList, setCustomList] = useState<any[]>([
        { name: '', unit: 'ea', default_price: 0 },
        { name: '', unit: 'ea', default_price: 0 },
        { name: '', unit: 'ea', default_price: 0 }
    ]);

    useEffect(() => {
        loadOrg();
    }, []);

    const loadOrg = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (profile?.organization_id) {
            setOrgId(profile.organization_id);
            const { data: org } = await supabase
                .from('organizations')
                .select('trade_type, custom_trade_name')
                .eq('id', profile.organization_id)
                .single();

            if (org) {
                setCurrentTrade(org.trade_type);
                setSelectedTrade(org.trade_type);
                if (org.custom_trade_name) {
                    setCurrentCustomName(org.custom_trade_name);
                    setCustomNameInput(org.custom_trade_name);
                }
            }
        }
        setLoading(false);
    };

    const handleGenerateAI = async () => {
        if (!customNameInput) return alert("Enter a trade name first!");
        setAiLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('trade-suggester', {
                body: { trade_name: customNameInput }
            });
            if (error) throw error;
            if (data?.items) {
                setCustomList(data.items);
            }
        } catch (e: any) {
            alert("AI Generation Failed: " + e.message);
        }
        setAiLoading(false);
    };

    const handleSave = async () => {
        if (!orgId) return;
        setSaving(true);

        // 1. Switch Trade
        const { error } = await supabase.rpc('fn_switch_org_trade', {
            p_org_id: orgId,
            p_new_trade: selectedTrade,
            p_reset_inventory: resetInventory,
            p_custom_name: selectedTrade === 'custom' ? customNameInput : null
        });

        if (error) {
            alert('Error updating trade: ' + error.message);
            setSaving(false);
            return;
        }

        // 2. If Custom & Reset, we must manually seed the list
        if (selectedTrade === 'custom' && resetInventory) {
            // Filter empty rows
            const validItems = customList.filter(i => i.name.trim() !== '');
            if (validItems.length > 0) {
                const { error: seedError } = await supabase.from('stock_presets').insert(
                    validItems.map(i => ({
                        organization_id: orgId,
                        name: i.name,
                        unit: i.unit,
                        default_price: i.default_price
                    }))
                );
                if (seedError) console.error("Seeding error", seedError);
            }
        }

        alert('Trade settings updated!');
        router.refresh();
        setCurrentTrade(selectedTrade);
        if (selectedTrade === 'custom') setCurrentCustomName(customNameInput);
        setResetInventory(false);
        setSaving(false);
    };

    const updateRow = (index: number, field: string, value: any) => {
        const newList = [...customList];
        newList[index] = { ...newList[index], [field]: value };
        setCustomList(newList);

        // Auto-add row if typing in last row
        if (index === customList.length - 1 && value) {
            setCustomList([...newList, { name: '', unit: 'ea', default_price: 0 }]);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    const trades = [
        { id: 'general', name: 'General Contractor' },
        { id: 'electrician', name: 'Electrician' },
        { id: 'plumber', name: 'Plumber' },
        { id: 'hvac', name: 'HVAC Technician' },
        { id: 'carpenter', name: 'Carpenter' },
        { id: 'custom', name: 'Custom / DIY' }
    ];

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Industry Intelligence</h1>

            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-8">

                {/* Current Status */}
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Current Identity</p>
                    <p className="text-xl font-bold text-gray-900 capitalize">
                        {currentTrade === 'custom' ? `${currentCustomName} (Custom)` : currentTrade}
                    </p>
                </div>

                {/* Switcher */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {trades.map(trade => (
                        <button
                            key={trade.id}
                            onClick={() => setSelectedTrade(trade.id)}
                            className={`p-4 rounded-lg border text-left transition-all ${selectedTrade === trade.id
                                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <span className="block font-bold text-sm text-gray-900">{trade.name}</span>
                        </button>
                    ))}
                </div>

                {/* Custom Editor */}
                {selectedTrade === 'custom' && (
                    <div className="bg-gray-50 p-6 rounded-xl space-y-6 border border-gray-200">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Your Trade Name</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 p-3 border rounded-lg shadow-sm"
                                    placeholder="e.g. Landscaper, Tiler, Roofer..."
                                    value={customNameInput}
                                    onChange={e => setCustomNameInput(e.target.value)}
                                />
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={aiLoading}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {aiLoading ? <RefreshCw className="animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                    Auto-Fill
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">✨ Tip: Enter your trade and click Auto-Fill to let AI suggest your inventory.</p>
                        </div>

                        {/* Inventory List */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-sm text-gray-700">Initial Inventory List</h4>
                            {customList.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        placeholder="Item Name"
                                        className="flex-[2] p-2 border rounded text-sm"
                                        value={item.name}
                                        onChange={e => updateRow(idx, 'name', e.target.value)}
                                    />
                                    <input
                                        placeholder="Unit"
                                        className="w-20 p-2 border rounded text-sm"
                                        value={item.unit}
                                        onChange={e => updateRow(idx, 'unit', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="$ Price"
                                        className="w-24 p-2 border rounded text-sm"
                                        value={item.default_price}
                                        onChange={e => updateRow(idx, 'default_price', e.target.value)}
                                    />
                                    <button
                                        onClick={() => {
                                            const l = [...customList];
                                            l.splice(idx, 1);
                                            setCustomList(l);
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reset Option */}
                <div className="border-t pt-6">
                    <div className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="reset"
                            checked={resetInventory}
                            onChange={(e) => setResetInventory(e.target.checked)}
                            className="mt-1 h-4 w-4 text-blue-600 rounded"
                        />
                        <label htmlFor="reset" className="text-sm">
                            <span className="block font-bold text-gray-900">Reset Inventory Presets</span>
                            <span className="block text-gray-500 mt-1">
                                This will <strong>DELETE</strong> all current items and replace them with the {selectedTrade === 'custom' ? 'list above' : 'standard defaults'}.
                            </span>
                        </label>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-black text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    Save Configuration
                </button>

            </div>
        </div>
    );
}
