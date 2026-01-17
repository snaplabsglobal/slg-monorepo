'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sparkles, Calendar, MapPin, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';
import PromoteModal from './promote-modal';

export default function LeadsPage() {
    const supabase = createClient();
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [isPromoteOpen, setIsPromoteOpen] = useState(false);

    const fetchLeads = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Get Org
            const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).single();
            if (members) {
                const { data } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('organization_id', members.organization_id)
                    .neq('status', 'converted')
                    .order('appointment_time', { ascending: true });

                if (data) setLeads(data);
            }
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const openPromote = (lead: any) => {
        setSelectedLead(lead);
        setIsPromoteOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leads Calendar</h1>
                    <p className="text-gray-500">Upcoming appointments.</p>
                </div>
                {/* Simplified Add Lead for demo - typically full form */}
                <button className="bg-black text-white p-3 rounded-full" onClick={() => alert("Add Lead Form placeholder")}>
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {leads.map(lead => {
                    const date = new Date(lead.appointment_time);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div key={lead.id} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${isToday ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{lead.client_name}</h3>
                                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
                                            <MapPin className="w-3 h-3" />
                                            {lead.address || 'No Address'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isToday ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {isToday ? 'TODAY' : date.toLocaleDateString()}
                                    </span>
                                    <p className="text-sm font-mono mt-1 font-medium">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openPromote(lead)}
                                    className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800"
                                >
                                    <Sparkles className="w-4 h-4 text-yellow-400" /> Promote to Project
                                </button>
                            </div>
                        </div>
                    )
                })}

                {leads.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No upcoming leads.
                    </div>
                )}
            </div>

            {selectedLead && (
                <PromoteModal
                    isOpen={isPromoteOpen}
                    onClose={() => setIsPromoteOpen(false)}
                    lead={selectedLead}
                    onSuccess={() => { fetchLeads(); setIsPromoteOpen(false); }}
                />
            )}
        </div>
    );
}
