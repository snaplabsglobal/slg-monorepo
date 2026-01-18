'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { AlertTriangle, DollarSign, TrendingUp, Users, Wallet } from 'lucide-react';

interface FinancialSummary {
    project_id: string;
    total_budget: number;
    total_spent_materials: number;
    total_labor_cost: number;
    total_spent: number;
    remaining_profit: number;
    budget_usage_percent: number;
}

export default function FinancialExecutionBoard({ projectId }: { projectId: string }) {
    const supabase = createClient();
    const [stats, setStats] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const { data, error } = await supabase
                .from('view_project_financial_summary')
                .select('*')
                .eq('project_id', projectId)
                .single();

            if (data) setStats(data);
            setLoading(false);
        };

        fetchStats();

        // Subscription for real-time updates? 
        // Views are hard to subscribe to directly. 
        // We can subscribe to transactions/timecards effectively, but for MVP, poll or load once.
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);

    }, [projectId]);

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-2xl w-full"></div>;
    if (!stats) return null;

    const isOverBudget = stats.total_spent > stats.total_budget;
    const isWarning = stats.budget_usage_percent > 90;

    return (
        <div className={`rounded-3xl p-6 shadow-sm border mb-8 transition-colors duration-500
            ${isOverBudget
                ? 'bg-[#FFF7ED] border-orange-200'  // Vibrant Orange Light
                : 'bg-white border-gray-100'
            }
        `}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${isOverBudget ? 'text-orange-700' : 'text-gray-900'}`}>
                        {isOverBudget && <AlertTriangle className="w-5 h-5 text-orange-600 animate-pulse" />}
                        Financial Execution
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Real-time Budget vs Actuals</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold tracking-tight text-gray-900">
                        {stats.remaining_profit < 0 ? '-' : ''}${Math.abs(stats.remaining_profit).toLocaleString()}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${stats.remaining_profit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                        Running {stats.remaining_profit >= 0 ? 'Profit' : 'Loss'}
                    </div>
                </div>
            </div>

            {/* Progress Bar High Contrast */}
            <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden mb-8 shadow-inner">
                {/* Safe Budget Zone */}
                <div
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-1000
                        ${isOverBudget ? 'bg-orange-500' : isWarning ? 'bg-yellow-400' : 'bg-[#1A4F8B]'}
                    `}
                    style={{ width: `${Math.min(stats.budget_usage_percent, 100)}%` }}
                >
                    {/* Stripes or texture could go here */}
                </div>

                {/* Label inside bar if wide enough */}
                <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-bold z-10 text-gray-500 mix-blend-multiply">
                    <span>SPENT: ${Math.round(stats.total_spent).toLocaleString()}</span>
                    <span>BUDGET: ${Math.round(stats.total_budget).toLocaleString()}</span>
                </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/50 p-3 rounded-2xl border border-gray-100">
                    <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Labor Cost
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                        ${stats.total_labor_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="bg-white/50 p-3 rounded-2xl border border-gray-100">
                    <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> Materials
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                        ${stats.total_spent_materials.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="bg-white/50 p-3 rounded-2xl border border-gray-100">
                    <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Burn Rate
                    </div>
                    <div className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-800'}`}>
                        {stats.budget_usage_percent}%
                    </div>
                </div>

                <div className="bg-white/50 p-3 rounded-2xl border border-gray-100">
                    <div className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Total Budget
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                        ${stats.total_budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>
        </div>
    );
}
