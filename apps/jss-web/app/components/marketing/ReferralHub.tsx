"use client";

import { useState } from "react";
import { Copy, Check, Share2, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function ReferralHub() {
    // In real app, fetch from Supabase: public.contractor_portfolios
    const [portfolio] = useState({
        slug: "patrick-reno",
        referral_code: "PATRICK2026",
        name: "Patrick's Renovations"
    });

    const [message, setMessage] = useState(
        `Hey! I'm ${portfolio.name}. Check out my latest project portfolio here: https://ledgersnap.com/p/${portfolio.slug}. If you need any renovations, let me know!`
    );

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-md mx-auto border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Share2 className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold">Referral Hub</h2>
                </div>
                <p className="text-indigo-100 text-sm">
                    Share your work, grow your business.
                </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">

                {/* Visual Link Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Your Portfolio Link</p>
                        <p className="text-sm font-semibold text-indigo-600 truncate max-w-[200px]">
                            ledgersnap.com/p/{portfolio.slug}
                        </p>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full border text-xs font-mono text-gray-500">
                        {portfolio.referral_code}
                    </div>
                </div>

                {/* Message Editor */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        Customize Message
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-4 bg-purple-50 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 border-none resize-none h-32"
                    />
                </div>

                {/* Action Button */}
                <button
                    onClick={handleCopy}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                >
                    {copied ? (
                        <>
                            <Check className="w-5 h-5 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-5 h-5" />
                            Copy Link & Message
                        </>
                    )}
                </button>

            </div>
        </div>
    );
}
