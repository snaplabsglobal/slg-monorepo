'use client';
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Camera, RefreshCw, MapPin } from 'lucide-react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function CameraModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const params = useParams();
    const [projectId, setProjectId] = useState<string | null>(null);
    const [activeProjects, setActiveProjects] = useState<any[]>([]);
    const [projectName, setProjectName] = useState<string>('Select Project');
    const supabase = createClient();

    // 1. Context Awareness: Auto-detect Project from URL
    useEffect(() => {
        if (params?.id) {
            setProjectId(params.id as string);
            // Fetch name
            const fetchName = async () => {
                const { data } = await supabase.from('projects').select('name').eq('id', params.id).single();
                if (data) setProjectName(data.name);
            };
            fetchName();
        } else {
            // Reset if not in project context (Global)
            setProjectId(null);
            setProjectName('No Project Selected');
        }
    }, [params, isOpen]);

    // 2. Fetch Active Projects for "Quick Switcher"
    useEffect(() => {
        if (isOpen) {
            const fetchActive = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
                    if (data) setActiveProjects(data);
                }
            };
            fetchActive();
        }
    }, [isOpen]);

    const handleCapture = () => {
        alert(`Snapped for Project: ${projectName} (${projectId || 'Unassigned'}). Uploading to R2...`);
        onClose();
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-95 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-t-2xl sm:rounded-2xl bg-black text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg w-full h-[85vh] sm:h-[600px] flex flex-col">

                                {/* Header / Close */}
                                <div className="absolute top-4 right-4 z-20">
                                    <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Viewfinder Simulation */}
                                <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
                                    <p className="text-gray-500">Camera Viewfinder</p>

                                    {/* The "Project Projector" Overlay */}
                                    <div className="absolute bottom-8 left-0 right-0 px-6">
                                        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 text-white">
                                                    <MapPin className="w-4 h-4 text-blue-400" />
                                                    <span className="font-medium text-sm">Target: {projectName}</span>
                                                </div>
                                                <button className="text-xs text-gray-400 flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3" /> Change
                                                </button>
                                            </div>

                                            {/* Quick Switcher (Horizontal Scroll) */}
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                <button
                                                    onClick={() => { setProjectId(null); setProjectName('Unassigned (AI Detect)'); }}
                                                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-colors ${!projectId ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                                >
                                                    Auto / Unassigned
                                                </button>
                                                {activeProjects.map(p => (
                                                    <button
                                                        key={p.project_id}
                                                        onClick={() => { setProjectId(p.project_id); setProjectName(p.project_name); }}
                                                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition-colors ${projectId === p.project_id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                                    >
                                                        {p.project_name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Shutter Button Area */}
                                <div className="bg-black p-6 flex justify-center pb-12 sm:pb-6">
                                    <button
                                        onClick={handleCapture}
                                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition-transform"
                                    >
                                        <div className="w-16 h-16 bg-white rounded-full" />
                                    </button>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
