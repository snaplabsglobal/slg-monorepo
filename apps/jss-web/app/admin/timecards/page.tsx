'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle, Clock, User as UserIcon, Loader2 } from 'lucide-react';

export default function AdminTimecardsPage() {
    const supabase = createClient();
    const [timecards, setTimecards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        setLoading(true);
        // Fetch pending timecards with User and Project details
        // Note: Supabase complex joins can be tricky in client. 
        // Ideally we use a View, but for MVP let's fetch raw and enrich or use simple join if relations set.

        const { data, error } = await supabase
            .from('timecards')
            .select(`
            id, total_hours, description, created_at,
            projects (name),
            employee_id
        `) // Note: Linking to auth.users usually requires a view or public profile table. 
            // For MVP, valid IDs are enough, or we assume 'organization_members' has profile data.
            // Let's simplified display: "Employee ID: ..."
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (data) setTimecards(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id: string) => {
        const { error } = await supabase
            .from('timecards')
            .update({ status: 'approved' })
            .eq('id', id);

        if (!error) {
            // Optimistic update
            setTimecards(prev => prev.filter(t => t.id !== id));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10 pb-24">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Payroll Approval</h1>

                {loading ? (
                    <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : (
                    <div className="space-y-4">
                        {timecards.length === 0 && (
                            <div className="p-10 text-center bg-white rounded-xl text-gray-500">
                                All caught up! No pending timecards.
                            </div>
                        )}

                        {timecards.map((t) => (
                            <div key={t.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {t.projects?.name || 'Unknown Project'}
                                            </h3>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1 font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded">
                                                <Clock className="w-4 h-4 text-gray-400" /> {t.total_hours} hrs
                                            </span>
                                            <span className="italic text-gray-500">"{t.description || 'No notes'}"</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleApprove(t.id)}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm active:scale-95"
                                >
                                    <CheckCircle className="w-5 h-5" /> Approve
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
