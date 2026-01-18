'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Plus, FileText, CheckCircle, Clock } from 'lucide-react';
import ChangeOrderModal from './ChangeOrderModal';

interface ChangeOrder {
    id: string;
    title: string;
    amount_change: number;
    impact_days: number;
    status: string;
    created_at: string;
}

export default function ChangeOrderSection({ projectId }: { projectId: string }) {
    const supabase = createClient();
    const [orders, setOrders] = useState<ChangeOrder[]>([]);
    const [showModal, setShowModal] = useState(false);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('change_orders')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
    };

    useEffect(() => {
        fetchOrders();
    }, [projectId]);

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
            <div className="border-b px-6 py-4 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Change Orders (Visas)
                </h3>
                <button
                    onClick={() => setShowModal(true)}
                    className="text-sm bg-black text-white px-3 py-1.5 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" /> New CO
                </button>
            </div>

            <div className="divide-y">
                {orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        No change orders yet. Projects usually obey the plan... right?
                    </div>
                ) : (
                    orders.map(co => (
                        <div key={co.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 p-1.5 rounded-full ${co.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {co.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{co.title}</h4>
                                    <p className="text-xs text-gray-500">
                                        {new Date(co.created_at).toLocaleDateString()} • {co.status.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-gray-900 text-sm">
                                    {co.amount_change >= 0 ? '+' : '-'}${Math.abs(co.amount_change).toLocaleString()}
                                </div>
                                {co.impact_days > 0 && (
                                    <div className="text-xs text-orange-600 font-medium">
                                        +{co.impact_days} Days
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <ChangeOrderModal
                    projectId={projectId}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        fetchOrders();
                        // Trigger a page refresh or re-fetch parent stats? 
                        // For MVP, router.refresh() might be heavy. 
                        // The user will see refreshed list here. The Financial Board needs refresh too.
                        window.location.reload(); // Hard refresh to update Server Components (Stats)
                    }}
                />
            )}
        </div>
    );
}
