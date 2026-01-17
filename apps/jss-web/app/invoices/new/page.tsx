'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { getTerm } from '@/utils/terms';

export default function NewInvoicePage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);

    // Form State
    const [projectId, setProjectId] = useState<string>('SERVICE_BUCKET'); // Default to Service Mode
    const [clientName, setClientName] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const loadProjects = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
                if (data) setProjects(data);
            }
        };
        loadProjects();
    }, []);

    const handleSubmit = async () => {
        if (!clientName || !amount) {
            alert("Please fill in Client and Amount");
            return;
        }
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Resolve Project ID
        let finalProjectId = projectId;
        let orgId = null;

        // Get Org ID (helper)
        const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).single();
        orgId = members?.organization_id;

        if (projectId === 'SERVICE_BUCKET') {
            // Find or Create "Small Jobs / Service"
            const { data: existingBucket } = await supabase
                .from('projects')
                .select('id')
                .eq('is_service_bucket', true)
                .eq('organization_id', orgId)
                .limit(1)
                .single();

            if (existingBucket) {
                finalProjectId = existingBucket.id;
            } else {
                // Create Bucket
                const { data: newBucket, error: createError } = await supabase
                    .from('projects')
                    .insert({
                        name: 'Small Jobs / Service',
                        organization_id: orgId,
                        status: 'Active',
                        is_service_bucket: true,
                        address: 'Generic Location'
                    })
                    .select()
                    .single();

                if (createError) {
                    alert("Error creating service bucket: " + createError.message);
                    setLoading(false);
                    return;
                }
                finalProjectId = newBucket.id;
            }
        }

        // 2. Create Transaction (Invoice)
        const { error } = await supabase.from('transactions').insert({
            project_id: finalProjectId,
            org_id: orgId,
            user_id: user.id,
            transaction_date: date,
            vendor_name: clientName, // For income, vendor is client? Or adding client_id column? Using vendor_name as counterparty for now.
            total_amount: parseFloat(amount),
            direction: 'income',
            description: description || 'Service Invoice',
            status: 'pending',
            category_user: 'Sales'
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            router.push('/admin/timecards'); // Or invoices list? Redirecting to Home for now or generic list
            // Ideally redirect to /transactions or /invoices
            router.refresh();
            router.push('/');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6">

                <div className="flex items-center gap-4 mb-6">
                    <Link href="/" className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">New Invoice</h1>
                </div>

                <div className="space-y-4">

                    {/* Project Selector (Service Mode Default) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to {getTerm('PROJECT')}</label>
                        <select
                            value={projectId}
                            onChange={e => setProjectId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="SERVICE_BUCKET">✨ Small Jobs / Service (No Specific {getTerm('PROJECT')})</option>
                            <option disabled>──────────</option>
                            {projects.map(p => (
                                <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                            ))}
                        </select>
                        {projectId === 'SERVICE_BUCKET' && (
                            <p className="text-xs text-blue-600 mt-1 ml-1">
                                * This will go into a "Small Jobs" bucket. You can move it to a specific {getTerm('PROJECT').toLowerCase()} later.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Mrs. Smith"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 h-24"
                            placeholder="What was this for?"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                        Create Invoice
                    </button>

                </div>
            </div>
        </div>
    );
}
