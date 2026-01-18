'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AlertCircle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface UnitPerformance {
    project_id: string;
    category: string;
    total_estimated_qty: number;
    estimated_unit_price: number;
    realized_unit_price: number;
    variance_percent: number;
}

export default function UnitCostAnalysis({ projectId }: { projectId: string }) {
    const supabase = createClient();
    const [data, setData] = useState<UnitPerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: performance, error } = await supabase
                .from('view_realized_unit_performance')
                .select('*')
                .eq('project_id', projectId);

            if (performance) setData(performance);
            setLoading(false);
        };
        fetchData();
    }, [projectId]);

    if (loading) return <div className="p-4 text-gray-500">Loading analysis...</div>;
    if (data.length === 0) return null; // Hide if no data

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Realized Unit Cost Analysis
                </h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Live Tracker</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 text-right">Qty</th>
                            <th className="px-6 py-3 text-right">Est. Unit Price</th>
                            <th className="px-6 py-3 text-right">Real. Unit Price</th>
                            <th className="px-6 py-3 text-right">Variance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => {
                            // Logic: If Realized > Estimated by 5%, show Orange
                            const isOverBudget = row.variance_percent > 5;
                            const isUnderBudget = row.variance_percent < -5;

                            return (
                                <tr key={idx} className={`border-b border-gray-50 ${isOverBudget ? 'bg-[#FFF4E5]' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {row.category || 'Uncategorized'}
                                    </td>
                                    <td className="px-6 py-4 text-right">{row.total_estimated_qty}</td>
                                    <td className="px-6 py-4 text-right font-mono">${row.estimated_unit_price?.toFixed(2)}</td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold ${isOverBudget ? 'text-[#FF7E21]' : ''}`}>
                                        ${row.realized_unit_price?.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`flex items-center justify-end gap-1 ${isOverBudget ? 'text-[#FF7E21] font-bold' : isUnderBudget ? 'text-green-600' : 'text-gray-500'}`}>
                                            {isOverBudget && <AlertCircle className="w-4 h-4" />}
                                            {isUnderBudget && <CheckCircle className="w-4 h-4" />}
                                            {row.variance_percent > 0 ? '+' : ''}{row.variance_percent}%
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
