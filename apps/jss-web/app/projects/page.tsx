import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { getTerm, getTermPlural } from '@/utils/terms';

export default async function ProjectsDashboard() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // Fetch Project Summaries
    const { data: projects, error } = await supabase
        .from('view_project_financial_summary')
        .select('*')
        .order('project_name');

    if (error) {
        console.error("Error fetching projects:", error);
        return <div className="p-8 text-red-500">Failed to load projects.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{getTermPlural('PROJECT')}</h1>
                        <p className="text-gray-500 mt-1">Your construction command center.</p>
                    </div>
                    <Link
                        href="/projects/new"
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        + New {getTerm('PROJECT')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects?.map((project) => {
                        // Calculate Health
                        const spent = project.total_spent_materials || 0;
                        const budget = project.total_budget || 0;
                        const ratio = budget > 0 ? (spent / budget) : 0;

                        let healthColor = 'text-green-600';
                        let HealthIcon = CheckCircle;
                        if (ratio > 0.9) {
                            healthColor = 'text-red-600';
                            HealthIcon = AlertTriangle;
                        } else if (ratio > 0.7) {
                            healthColor = 'text-yellow-600';
                            HealthIcon = TrendingUp; // Rising
                        }

                        return (
                            <Link
                                key={project.project_id}
                                href={`/projects/${project.project_id}`}
                                className="block group"
                            >
                                <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    {/* Status Stripe */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${ratio > 0.9 ? 'bg-red-500' : 'bg-green-500'}`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 rounded-lg">
                                                <Building2 className="w-6 h-6 text-gray-700" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                                                    {project.project_name}
                                                </h3>
                                                <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
                                                    {project.status}
                                                </span>
                                            </div>
                                        </div>
                                        <HealthIcon className={`w-5 h-5 ${healthColor}`} />
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-500">Budget Spent</span>
                                                <span className={`font-medium ${healthColor}`}>
                                                    {(ratio * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${ratio > 0.9 ? 'bg-red-500' : (ratio > 0.7 ? 'bg-yellow-500' : 'bg-green-500')}`}
                                                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wider">Spent</p>
                                                <p className="font-mono text-lg font-medium">${spent.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 uppercase tracking-wider">Budget</p>
                                                <p className="font-mono text-lg font-medium text-gray-500">${budget.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {(!projects || projects.length === 0) && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-dashed rounded-xl">
                            No active projects found. Start by creating one.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
