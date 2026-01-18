'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FileSpreadsheet, Download, Calendar, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function ReportsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Filters
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    useEffect(() => {
        loadOrg();
    }, []);

    const loadOrg = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (profile) setOrgId(profile.organization_id);
    };

    const handleExport = async () => {
        if (!orgId) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('reports-engine', {
                body: { org_id: orgId, start_date: startDate, end_date: endDate, format: 'excel' }
            });

            // Supabase functions return parsed JSON by default usually, but we need raw blob if we sent raw.
            // Actually, client.invoke usually tries to parse JSON. 
            // If the function returns a binary blob with correct header, invoke might try to parse it as JSON and fail or return it.
            // Let's use fetch directly for binary download to be safe or check SDK docs.
            // SDK `invoke` returns `data` as Blob if responseType is blob? No, standard invoke parses JSON.

            // let's try direct fetch via session
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reports-engine`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ org_id: orgId, start_date: startDate, end_date: endDate, format: 'excel' })
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `LedgerSnap_Export_${startDate}_to_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (e: any) {
            alert('Export Error: ' + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Financial Reports</h1>

            <div className="bg-white rounded-xl shadow-lg border p-8 flex flex-col gap-6">

                <div className="flex items-center gap-4 text-green-700 bg-green-50 p-4 rounded-lg">
                    <FileSpreadsheet className="w-8 h-8" />
                    <div>
                        <h3 className="font-bold text-lg">CRA Audit-Ready Export</h3>
                        <p className="text-sm">Generates a detailed ledger with embedded secure links to original receipts.</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full p-3 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full p-3 border rounded-lg"
                        />
                    </div>
                </div>

                {/* Quick Select */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                            setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                        }}
                        className="px-3 py-1 bg-gray-100 rounded text-xs font-bold hover:bg-gray-200"
                    >
                        This Month
                    </button>
                    <button
                        onClick={() => {
                            const lastMonth = subMonths(new Date(), 1);
                            setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                            setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
                        }}
                        className="px-3 py-1 bg-gray-100 rounded text-xs font-bold hover:bg-gray-200"
                    >
                        Last Month
                    </button>
                </div>

                <div className="border-t pt-6 mt-4">
                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 text-lg hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xl hover:shadow-2xl"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Download />}
                        Generate Excel Report
                    </button>
                </div>

            </div>
        </div>
    );
}
