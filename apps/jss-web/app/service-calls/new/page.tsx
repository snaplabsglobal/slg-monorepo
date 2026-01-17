'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import { getTerm } from '@/utils/terms';

export default function NewServiceCallPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Form
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async () => {
        if (!address) return;
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get Org
        const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).single();
        if (!members) { alert('No Org'); setLoading(false); return; }

        // Auto-Generate Name
        // Rule: SC-[MMDD]-[City/Snippet]
        const date = new Date();
        const mmdd = `${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

        // Extract city or street from address (simple heuristic)
        // e.g. "123 Main St, Burnaby, BC" -> "Burnaby" or "Main"
        // Let's take the first word of the last part if comma separated, or second word ..
        // Simple: Take standard identifier or user input part
        let locationSnippet = address.split(',')[0].split(' ')[1] || address.split(' ')[0] || 'Site';
        // Better: try to find City. If user types "123 King St, Toronto", we want Toronto? Or King?
        // Let's just use the first 10 chars of address for now to be safe and unique enough
        // Spec said: "e.g. SC-0116-Burnaby". Assuming Input is "456 Oak St, Burnaby".
        // Let's try to grab the city if available (after last comma?)
        const parts = address.split(',');
        if (parts.length > 1) {
            locationSnippet = parts[Math.max(0, parts.length - 2)].trim().split(' ')[0]; // Second to last usually city in "Addr, City, Prov"
        } else {
            locationSnippet = address.split(' ')[1] || 'Location';
        }

        const autoName = `SC-${mmdd}-${locationSnippet}`;

        const { data, error } = await supabase.from('projects').insert({
            name: autoName,
            address: address,
            is_service_call: true,
            organization_id: members.organization_id,
            status: 'Active',
            description: description
        }).select().single();

        if (error) {
            alert('Error: ' + error.message);
        } else {
            router.push(`/projects/${data.id}`); // Go to project dash to snap photos immediately
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/service-calls" className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">New {getTerm('SERVICE_CALL')}</h1>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900">Auto-Pilot Mode</p>
                            <p className="text-xs text-blue-700">Name will be generated automatically based on date and address.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. 456 Oak St, Burnaby"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue / Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 h-24"
                            placeholder="Leaking faucet, broken handling..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !address}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Dispatch & Snap'}
                    </button>
                </div>
            </div>
        </div>
    );
}
