'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Wrench, MapPin, ArrowRight, Plus } from 'lucide-react';
import { getTerm } from '@/utils/terms';

export default function ServiceCallsPage() {
    const supabase = createClient();
    const [calls, setCalls] = useState<any[]>([]);

    useEffect(() => {
        const fetchCalls = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get Org
                const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).single();
                if (members) {
                    const { data } = await supabase
                        .from('projects')
                        .select('*')
                        .eq('organization_id', members.organization_id)
                        .eq('is_service_call', true)
                        .order('created_at', { ascending: false });

                    if (data) setCalls(data);
                }
            }
        };
        fetchCalls();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{getTerm('SERVICE_CALL')}s</h1>
                    <p className="text-gray-500">Quick dispatch & small jobs.</p>
                </div>
                <Link href="/service-calls/new" className="bg-black text-white p-3 rounded-full">
                    <Plus className="w-5 h-5" />
                </Link>
            </div>

            <div className="p-6 space-y-4">
                {calls.map(call => (
                    <Link key={call.id} href={`/projects/${call.id}`} className="block bg-white p-5 rounded-2xl shadow-sm hover:border-blue-500 border border-transparent transition-all">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{call.name}</h3>
                                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {call.address}
                                    </div>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300" />
                        </div>
                    </Link>
                ))}

                {calls.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No active service calls.
                    </div>
                )}
            </div>
        </div>
    );
}
