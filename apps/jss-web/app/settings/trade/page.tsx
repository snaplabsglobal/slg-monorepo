'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TradeSettingsPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Org State
    const [orgId, setOrgId] = useState<string | null>(null);
    const [currentTrade, setCurrentTrade] = useState('general');

    // Form State
    const [selectedTrade, setSelectedTrade] = useState('general');
    const [resetInventory, setResetInventory] = useState(false);

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
                .select('trade_type')
                .eq('id', profile.organization_id)
                .single();

            if (org) {
                setCurrentTrade(org.trade_type);
                setSelectedTrade(org.trade_type);
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!orgId) return;
        if (selectedTrade === currentTrade && !resetInventory) return;

        setSaving(true);
        const { error } = await supabase.rpc('fn_switch_org_trade', {
            p_org_id: orgId,
            p_new_trade: selectedTrade,
            p_reset_inventory: resetInventory
        });

        if (error) {
            alert('Error updating trade: ' + error.message);
        } else {
            alert('Trade updated successfully!');
            router.refresh();
            // Reload local state
            setCurrentTrade(selectedTrade);
            setResetInventory(false);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Trade Settings...</div>;

    const trades = [
        { id: 'general', name: 'General Contractor' },
        { id: 'electrician', name: 'Electrician' },
        { id: 'plumber', name: 'Plumber' },
        { id: 'hvac', name: 'HVAC Technician' },
        { id: 'carpenter', name: 'Carpenter' }
    ];

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Industry Intelligence</h1>

            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">

                {/* Current Status */}
                <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Current Trade</p>
                        <p className="text-xl font-bold text-gray-900 capitalize">{currentTrade}</p>
                    </div>
                </div>

                {/* Switcher */}
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Switch Trade Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {trades.map(trade => (
                            <button
                                key={trade.id}
                                onClick={() => setSelectedTrade(trade.id)}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${selectedTrade === trade.id
                                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="block font-bold text-gray-900">{trade.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reset Option (Only if trade changed or manually checked?) 
                    Lets allow checking it anytime to "Re-seed" even if same trade 
                */}
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
                                This will <strong>DELETE</strong> your current 'Quick-Add' items and replace them with the defaults for <strong>{trades.find(t => t.id === selectedTrade)?.name}</strong>.
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
                    Save Changes
                </button>

            </div>
        </div>
    );
}
