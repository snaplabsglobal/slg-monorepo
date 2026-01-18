'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ThumbsUp, Coffee, Heart, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function CommunityPage() {
    const supabase = createClient();
    const [features, setFeatures] = useState<any[]>([]);
    const [myVotes, setMyVotes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: feats } = await supabase.from('feature_requests').select('*').order('vote_count', { ascending: false });
        // Check my votes
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: votes } = await supabase.from('feature_votes').select('feature_id').eq('user_id', user.id);
            setMyVotes(votes?.map(v => v.feature_id) || []);
        }
        setFeatures(feats || []);
        setLoading(false);
    };

    const toggleVote = async (featureId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("Please sign in to vote");

        const isVoted = myVotes.includes(featureId);

        // Optimistic UI
        setFeatures(prev => prev.map(f =>
            f.id === featureId ? { ...f, vote_count: f.vote_count + (isVoted ? -1 : 1) } : f
        ));
        setMyVotes(prev => isVoted ? prev.filter(id => id !== featureId) : [...prev, featureId]);

        if (isVoted) {
            await supabase.from('feature_votes').delete().match({ feature_id: featureId, user_id: user.id });
        } else {
            await supabase.from('feature_votes').insert({ feature_id: featureId, user_id: user.id });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Community...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="text-red-500 fill-red-500" />
                Community Loop
            </h1>

            {/* Tipping Section */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Coffee className="w-6 h-6" />
                        Buy us a coffee
                    </h2>
                    <p className="opacity-90 max-w-md">
                        LedgerSnap is built by a small team. If we saved you time today, consider supporting our caffeine addiction!
                    </p>
                </div>
                <button
                    onClick={() => window.open('https://buy.stripe.com/test_placeholder', '_blank')}
                    className="mt-6 md:mt-0 bg-white text-purple-600 px-6 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-all active:scale-95"
                >
                    Target $5 Tip
                </button>
            </div>

            {/* Voting Section */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Feature Roadmap
                    </h2>
                    <span className="text-sm text-gray-500">Vote for what we build next</span>
                </div>

                <div className="space-y-4">
                    {features.map(feature => {
                        const isVoted = myVotes.includes(feature.id);
                        return (
                            <div key={feature.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                                <div>
                                    <h3 className="font-bold text-gray-900">{feature.title}</h3>
                                    <p className="text-sm text-gray-500">{feature.description}</p>
                                    <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-bold ${feature.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            feature.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {feature.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleVote(feature.id)}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all w-16 ${isVoted
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <ThumbsUp className={`w-5 h-5 ${isVoted ? 'fill-white' : ''}`} />
                                    <span className="font-bold text-sm">{feature.vote_count}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
