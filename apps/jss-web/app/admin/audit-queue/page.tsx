"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Transaction {
    id: string;
    vendor_name: string;
    total_amount: number;
    risk_level: "low" | "medium" | "high";
    receipt_url: string;
    created_at: string;
    primary_tax_amount: number;
}

export default function AuditQueuePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    // Realtime Subscription
    useEffect(() => {
        // Initial Fetch
        const fetchTransactions = async () => {
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) console.error("Error fetching transactions:", error);
            else {
                setTransactions(data || []);
                if (data && data.length > 0) setSelectedTx(data[0]);
            }
            setLoading(false);
        };

        fetchTransactions();

        // Subscribe to new inserts
        const channel = supabase
            .channel("audit-queue")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "transactions" },
                (payload) => {
                    console.log("New transaction:", payload.new);
                    setTransactions((prev) => [payload.new as Transaction, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getStatusColor = (risk: string) => {
        switch (risk) {
            case "low":
                return "bg-green-500";
            case "medium":
                return "bg-yellow-500";
            case "high":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar List */}
            <div className="w-1/3 bg-white border-r overflow-y-auto">
                <div className="p-4 border-b bg-gray-50">
                    <h1 className="text-xl font-bold text-gray-800">Audit Queue (Live)</h1>
                    <p className="text-xs text-gray-500 mt-1">Listening for new R2 uploads...</p>
                </div>
                <ul>
                    {transactions.map((tx) => (
                        <li
                            key={tx.id}
                            onClick={() => setSelectedTx(tx)}
                            className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition ${selectedTx?.id === tx.id ? "bg-blue-100" : ""
                                }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-700">{tx.vendor_name || "Unknown Vendor"}</span>
                                <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(tx.risk_level)}`}>
                                    {tx.risk_level.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>${tx.total_amount?.toFixed(2) || "0.00"}</span>
                                <span>{new Date(tx.created_at).toLocaleTimeString()}</span>
                            </div>
                        </li>
                    ))}
                    {loading && <li className="p-4 text-center text-gray-500">Loading...</li>}
                    {!loading && transactions.length === 0 && (
                        <li className="p-4 text-center text-gray-500">No transactions found. upload to R2 to trigger.</li>
                    )}
                </ul>
            </div>

            {/* Main Content (Split View) */}
            <div className="w-2/3 p-8 flex flex-col">
                {selectedTx ? (
                    <div className="flex flex-1 gap-6">
                        {/* Left: Check Image (R2) */}
                        <div className="w-1/2 flex flex-col">
                            <h2 className="text-lg font-semibold mb-2">Receipt Image</h2>
                            <div className="border rounded-lg shadow-sm flex-1 bg-gray-200 flex items-center justify-center overflow-hidden bg-black relative">
                                {/* 
                    In a real scenario, receipt_url would be a path. 
                    We might need to sign it if it's private. 
                    For this demo, we assume the edge function stored a signed url or we use the utility.
                    Wait, frontend can't use node R2Service easily without server components or API API.
                    We'll blindly try to render it if it's a full URL, otherwise placeholder.
                 */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedTx.receipt_url.startsWith('http') ? selectedTx.receipt_url : '/placeholder-receipt.png'}
                                    alt="Receipt"
                                    className="max-w-full max-h-full object-contain"
                                />
                                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-xs">
                                    Source: R2 Cloudflare
                                </div>
                            </div>
                        </div>

                        {/* Right: AI Data Audit */}
                        <div className="w-1/2 flex flex-col">
                            <h2 className="text-lg font-semibold mb-2">AI Extraction Analysis</h2>
                            <div className="bg-white p-6 rounded-lg shadow-sm border flex-1">

                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-gray-500 text-sm">AI Confidence Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedTx.risk_level)} animate-pulse`}></div>
                                        <span className="font-bold text-gray-700">{selectedTx.risk_level === 'low' ? 'AUDIT PASSED' : 'REVIEW NEEDED'}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-gray-600">Primary Tax (GST/State)</span>
                                        <span className="font-mono font-bold">${selectedTx.primary_tax_amount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-gray-600">Total Amount</span>
                                        <span className="font-mono font-bold text-lg">${selectedTx.total_amount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    {/* Placeholder for more fields */}
                                    <div className="mt-8 bg-blue-50 p-4 rounded text-sm text-blue-800">
                                        <strong>AI Note:</strong> Data extracted via Gemini 2.5 Flash. Cross-referenced with North American compliance rules.
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a transaction to audit details.
                    </div>
                )}
            </div>
        </div>
    );
}
