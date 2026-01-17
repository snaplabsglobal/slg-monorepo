'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, Clock, MapPin, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

type TimeSession = {
    id: string; // temp id
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    projectId: string;
    notes: string;
};

export default function DailyTimesheetPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);

    // State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessions, setSessions] = useState<TimeSession[]>([]);
    const [lunchProvided, setLunchProvided] = useState(true);

    // Load Projects
    useEffect(() => {
        const fetchProjects = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
                if (data && data.length > 0) {
                    setProjects(data);
                    // Init first session with top project
                    setSessions([{
                        id: crypto.randomUUID(),
                        startTime: '08:00',
                        endTime: '12:00',
                        projectId: data[0].project_id,
                        notes: ''
                    }]);
                } else {
                    // Fallback fetch
                    const { data: all } = await supabase.from('projects').select('id, name').limit(10);
                    if (all) setProjects(all.map(p => ({ project_id: p.id, project_name: p.name })));
                }
            }
        };
        fetchProjects();
    }, []);

    const addSession = () => {
        const lastSession = sessions[sessions.length - 1];
        const newStart = lastSession ? lastSession.endTime : '08:00';
        // Default to 4 hours later or 17:00 max
        let endHour = parseInt(newStart.split(':')[0]) + 4;
        if (endHour > 17) endHour = 17;
        const newEnd = `${endHour.toString().padStart(2, '0')}:00`;

        setSessions([...sessions, {
            id: crypto.randomUUID(),
            startTime: newStart,
            endTime: newEnd,
            projectId: lastSession ? lastSession.projectId : projects[0]?.project_id,
            notes: ''
        }]);
    };

    const removeSession = (id: string) => {
        setSessions(sessions.filter(s => s.id !== id));
    };

    const updateSession = (id: string, field: keyof TimeSession, value: string) => {
        setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const calculateTotalHours = () => {
        let total = 0;
        sessions.forEach(s => {
            const start = parseInt(s.startTime.split(':')[0]) + parseInt(s.startTime.split(':')[1]) / 60;
            const end = parseInt(s.endTime.split(':')[0]) + parseInt(s.endTime.split(':')[1]) / 60;
            total += (end - start);
        });
        return total.toFixed(1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = sessions.map(s => {
            // Construct Timestamptz
            const startTs = new Date(`${date}T${s.startTime}:00`).toISOString();
            const endTs = new Date(`${date}T${s.endTime}:00`).toISOString();
            const duration = (new Date(endTs).getTime() - new Date(startTs).getTime()) / (1000 * 60 * 60);

            return {
                employee_id: user.id,
                project_id: s.projectId,
                start_time: startTs,
                end_time: endTs,
                total_hours: duration,
                description: s.notes,
                is_lunch_provided: lunchProvided,
                entry_type: 'WORK',
                status: 'pending'
            };
        });

        const { error } = await supabase.from('timecards').insert(payload);
        if (error) {
            alert('Error: ' + error.message);
        } else {
            router.push('/admin/timecards'); // Or simple success screen
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-gray-900">Daily Timesheet</h1>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="bg-gray-100 border-none rounded-lg p-2 text-sm font-medium"
                    />
                </div>

                {/* Efficiency Toggle */}
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🍱</span>
                        <div>
                            <p className="text-sm font-bold text-blue-900">Efficiency Mode</p>
                            <p className="text-xs text-blue-600">Lunch Provided (+$15 Meal Allowance)</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={lunchProvided} onChange={e => setLunchProvided(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {/* Sessions */}
            <div className="p-4 space-y-4">
                {sessions.map((session, index) => (
                    <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative">
                        <div className="absolute top-4 left-0 w-1 h-12 bg-blue-500 rounded-r-lg"></div>

                        {/* Time Row */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 font-medium uppercase">Start</label>
                                <input
                                    type="time"
                                    value={session.startTime}
                                    onChange={e => updateSession(session.id, 'startTime', e.target.value)}
                                    className="block w-full text-lg font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0"
                                />
                            </div>
                            <div className="text-gray-300">→</div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 font-medium uppercase">End</label>
                                <input
                                    type="time"
                                    value={session.endTime}
                                    onChange={e => updateSession(session.id, 'endTime', e.target.value)}
                                    className="block w-full text-lg font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0"
                                />
                            </div>
                        </div>

                        {/* Project & Notes */}
                        <div className="space-y-3">
                            <select
                                value={session.projectId}
                                onChange={e => updateSession(session.id, 'projectId', e.target.value)}
                                className="block w-full bg-gray-50 border-transparent rounded-lg text-sm font-medium focus:border-blue-500 focus:bg-white ring-1 ring-gray-100"
                            >
                                {projects.map(p => (
                                    <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={session.notes}
                                onChange={e => updateSession(session.id, 'notes', e.target.value)}
                                placeholder="What did you do?"
                                className="block w-full bg-transparent border-b border-gray-100 text-sm py-2 hover:border-gray-300 focus:border-blue-500 focus:ring-0 transition-colors"
                            />
                        </div>

                        {/* Remove Action */}
                        {sessions.length > 1 && (
                            <button
                                onClick={() => removeSession(session.id)}
                                className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}

                <button
                    onClick={addSession}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-medium hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Add Site / Session
                </button>
            </div>

            {/* Footer actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-safe z-20">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Total Hours</p>
                        <p className="text-2xl font-black text-gray-900">{calculateTotalHours()}</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-black/20 active:scale-95 transition-transform flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                        Submit Day
                    </button>
                </div>
            </div>
        </div>
    );
}
