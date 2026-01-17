import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, DollarSign, Users, ClipboardList } from 'lucide-react';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const { id } = params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 1. Fetch Project Summary
    const { data: project } = await supabase
        .from('view_project_financial_summary')
        .select('*')
        .eq('project_id', id)
        .single();

    if (!project) return <div>Project not found</div>;

    // 2. Fetch Recent Alerts (Profit Warnings)
    const { data: alerts } = await supabase
        .from('construction_alerts')
        .select('*')
        .eq('project_id', id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(3);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/projects" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-xl text-gray-900">{project.project_name}</h1>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                {project.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <span className="text-gray-500">Budget: <strong className="text-gray-900">${project.total_budget?.toLocaleString()}</strong></span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

                {/* 1. Alerts Section */}
                {alerts && alerts.length > 0 && (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-lg flex gap-3 ${alert.severity === 'critical' ? 'bg-red-50 border border-red-200 text-red-700' :
                                    alert.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                                        'bg-blue-50 border border-blue-200 text-blue-800'
                                }`}>
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">{alert.title}</h4>
                                    <p className="text-sm opacity-90">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <h3 className="font-medium text-gray-500">Spent (Materials)</h3>
                        </div>
                        <p className="text-3xl font-bold">${project.total_spent_materials?.toLocaleString()}</p>
                        <p className="text-sm text-gray-400 mt-1">vs ${project.total_budget?.toLocaleString()} Budget</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <Users className="w-5 h-5" />
                            </div>
                            <h3 className="font-medium text-gray-500">Labor Cost</h3>
                        </div>
                        <p className="text-3xl font-bold">${project.total_labor_cost?.toLocaleString() || '0'}</p>
                        <p className="text-sm text-gray-400 mt-1">From Timecards</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <h3 className="font-medium text-gray-500">Pending & Drafts</h3>
                        </div>
                        {/* Placeholder for future implementation */}
                        <p className="text-3xl font-bold text-gray-400">-</p>
                        <p className="text-sm text-gray-400 mt-1">Buy List / Drafts</p>
                    </div>
                </div>

                {/* 3. Recent Activity / Tabs Placeholder */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                    </div>
                    {/* 
                   Ideally we would fetch transactions specifically for this project here.
                   For now, leaving as a clear slot for the "TransactionTable" component.
                */}
                    <div className="p-12 text-center text-gray-400">
                        Transaction list component would render here filtered by Project ID: {id}
                    </div>
                </div>
            </main>
        </div>
    );
}
