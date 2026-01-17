'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Clock, MapPin, CheckCircle, Loader2 } from 'lucide-react';

export default function NewTimecardPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [hours, setHours] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [gpsCoords, setGpsCoords] = useState<{ lat: number, lng: number } | null>(null);

    // 1. Fetch Active Projects on Mount
    useEffect(() => {
        const fetchProjects = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Try Quick Select First
                const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
                if (data && data.length > 0) {
                    setProjects(data);
                    // Auto-select top project
                    setSelectedProjectId(data[0].project_id);
                } else {
                    // Fallback: Fetch all active
                    const { data: all } = await supabase.from('projects').select('id, name, address').eq('status', 'Active').limit(10);
                    if (all) {
                        setProjects(all.map(p => ({ project_id: p.id, project_name: p.name, project_address: p.address })));
                        if (all.length > 0) setSelectedProjectId(all[0].id);
                    }
                }
            }
        };
        fetchProjects();

        // 2. Silent GPS Capture (Optional)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Silent GPS skipped:", err.message),
                { timeout: 5000 }
            );
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            employee_id: user.id,
            project_id: selectedProjectId,
            total_hours: parseFloat(hours),
            description: description,
            status: 'pending',
            // Optional Backend GPS Log
            gps_metadata: gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng, captured_at: new Date().toISOString() } : null
        };

        const { error } = await supabase.from('timecards').insert(payload);

        if (error) {
            alert('Error submitting timecard: ' + error.message);
            setLoading(false);
        } else {
            router.push('/projects/' + selectedProjectId); // Go to Project Page to see impact
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-6 shadow rounded-lg">
                    <div className="flex items-center justify-center mb-6 text-blue-600">
                        <Clock className="w-12 h-12" />
                    </div>
                    <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">Quick Timecard</h2>

                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {/* Project Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Project</label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                {projects.map(p => (
                                    <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {projects.find(p => p.project_id === selectedProjectId)?.project_address || 'Site Location'}
                            </p>
                        </div>

                        {/* Hours */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hours Worked</label>
                            <input
                                type="number"
                                step="0.5"
                                required
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 bg-gray-50"
                                placeholder="e.g. 8.0"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">What did you do?</label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 bg-gray-50"
                                placeholder="Framing, Drywall, Cleanup..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Submit Timecard'}
                        </button>

                    </form>
                </div>

                <div className="mt-6 text-center text-xs text-gray-400">
                    GPS Location is optional and used for verification only.
                </div>
            </div>
        </div>
    );
}
