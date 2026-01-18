import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import FinancialExecutionBoard from '@/app/components/dashboard/FinancialExecutionBoard';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const { id } = params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 1. Fetch Project Basics (Name, Status) - Financials handled by Client Component
    const { data: project } = await supabase
        .from('projects')
        .select('name, status')
        .eq('id', id)
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
                            <h1 className="font-bold text-xl text-gray-900">{project.name}</h1>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                {project.status}
                            </span>
                        </div>
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

                {/* 2. Financial Execution Board (Real-Time) */}
                <FinancialExecutionBoard projectId={id} />

                {/* 3. Recent Activity / Tabs Placeholder */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                    </div>
                    <div className="p-12 text-center text-gray-400">
                        Transaction list component would render here filtered by Project ID: {id}
                    </div>
                </div>
            </main>
        </div>
    );
}
