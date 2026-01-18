'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FileText, Plus, DollarSign, Calculator } from 'lucide-react';
import Link from 'next/link';
import { getTerm } from '@/utils/terms';

export default function EstimatesPage() {
    const supabase = createClient();
    const [estimates, setEstimates] = useState<any[]>([]);

    useEffect(() => {
        const fetchEstimates = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).single();
                if (members) {
                    const { data } = await supabase
                        .from('estimates')
                        .select('*, projects(name)')
                        .eq('organization_id', members.organization_id)
                        .order('updated_at', { ascending: false });
                    if (data) setEstimates(data);
                }
            }
        };
        fetchEstimates();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
                    <p className="text-gray-500">Draft quotes & win work.</p>
                </div>
                <button className="bg-black text-white p-3 rounded-full" onClick={() => alert('New Estimate Wizard coming in Sprint 2')}>
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {/* Ballpark Tool Promotion */}
                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-xl">Ballpark Engine</h3>
                        <p className="text-blue-200 text-sm">Need a quick rough number?</p>
                    </div>
                    <button
                        onClick={() => alert('Ballpark Engine loaded...')}
                        className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                    >
                        <Calculator className="w-6 h-6" />
                    </button>
                </div>

                {estimates.map(e => (
                    <div key={e.id} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-blue-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gray-100 rounded-xl text-gray-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{e.name}</h3>
                                    <p className="text-sm text-gray-500">{e.projects?.name || 'Unknown Project'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${e.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        e.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {e.status}
                                </span>
                                <p className="font-mono font-bold mt-1 text-lg">${e.total_amount?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {estimates.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No estimates yet. Start a draft!
                    </div>
                )}
            </div>
        </div>
    );
}
