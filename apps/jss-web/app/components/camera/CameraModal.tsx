'use client';
import { Fragment, useRef, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Camera, Zap, RefreshCw, ChevronDown, Building, Briefcase, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedProjectId?: string | null;
}

export default function CameraModal({ isOpen, onClose, preselectedProjectId }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pathname = usePathname();
    const supabase = createClient();

    const [projectId, setProjectId] = useState<string>(''); // 'GENERAL' or UUID
    const [projects, setProjects] = useState<any[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
    const [captureState, setCaptureState] = useState<'idle' | 'capturing' | 'done'>('idle');

    // AI Nudge State
    const [showNudge, setShowNudge] = useState(false);
    const [nudgeType, setNudgeType] = useState<'GAS_TO_GENERAL' | null>(null);

    // Lightning Create State
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creatingProject, setCreatingProject] = useState(false);

    // 1. Context Awareness & Projects
    useEffect(() => {
        if (!isOpen) {
            setCameraActive(false);
            setCaptureState('idle');
            setShowNudge(false);
            setShowCreateInput(false);
            return;
        }

        setCameraActive(true);

        // Fetch projects
        const loadProjects = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get Active Projects
                const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
                const allProjects = data || [];
                if (allProjects.length > 0) {
                    setProjects(allProjects);
                }

                // Set Default
                // Priority: Prop > Path > General
                if (preselectedProjectId) {
                    setProjectId(preselectedProjectId);
                } else if (pathname.startsWith('/projects/')) {
                    const pathId = pathname.split('/')[2];
                    if (pathId) setProjectId(pathId);
                    else setProjectId('GENERAL');
                } else {
                    setProjectId('GENERAL');
                }
            }
        };
        loadProjects();

    }, [isOpen, pathname, preselectedProjectId]);

    const handleCapture = async () => {
        if (!projectId) return;

        setCaptureState('capturing');

        // SIMULATION: AI Nudge Logic
        if (projectId !== 'GENERAL' && Math.random() > 0.7) {
            setTimeout(() => {
                setNudgeType('GAS_TO_GENERAL');
                setShowNudge(true);
                setCaptureState('idle'); // Pause for user input
            }, 500);
            return;
        }

        // Capture Simulation (Fire and Forget)
        setTimeout(() => {
            setCaptureState('done');
            console.log(`[Captured] Project: ${projectId}`);
            setTimeout(() => {
                setCaptureState('idle');
            }, 800);
        }, 400);
    };

    const handleNudgeAction = (accept: boolean) => {
        setShowNudge(false);
        if (accept && nudgeType === 'GAS_TO_GENERAL') {
            setProjectId('GENERAL');
            setCaptureState('done');
            console.log("[Nudge Accepted] Switched to GENERAL");
            setTimeout(() => setCaptureState('idle'), 800);
        } else {
            setCaptureState('done');
            setTimeout(() => setCaptureState('idle'), 800);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        setCreatingProject(true);

        const { data: { user } } = await supabase.auth.getUser();
        // Get org id (hacky for mvp)
        const { data: members } = await supabase.from('organization_members').select('organization_id').eq('user_id', user?.id).limit(1).single();
        const orgId = members?.organization_id;

        if (!orgId) {
            alert("Could not determine organization.");
            setCreatingProject(false);
            return;
        }

        const { data, error } = await supabase.from('projects').insert({
            name: newProjectName,
            organization_id: orgId,
            status: 'Active',
            is_incomplete: true // Technical debt flag
        }).select().single();

        if (data) {
            // Success
            setProjects(prev => [{ project_id: data.id, project_name: data.name }, ...prev]);
            setProjectId(data.id);
            setNewProjectName('');
            setShowCreateInput(false);
        } else {
            alert('Failed to create project.');
        }
        setCreatingProject(false);
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
                    <div className="flex min-h-full items-end justify-center text-center sm:items-center p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="transform transition ease-in-out duration-300"
                            enterFrom="translate-y-full"
                            enterTo="translate-y-0"
                            leave="transform transition ease-in-out duration-200"
                            leaveFrom="translate-y-0"
                            leaveTo="translate-y-full"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden bg-black text-left shadow-xl transition-all w-full h-[100dvh] flex flex-col">

                                {/* Top Controls */}
                                <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent pt-12">

                                    {/* TOP LEFT SELECTOR + LIGHTNING CREATE */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <select
                                                value={projectId}
                                                onChange={(e) => setProjectId(e.target.value)}
                                                className="appearance-none bg-black/50 text-white border border-white/20 rounded-full px-4 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-md max-w-[200px]"
                                            >
                                                <option value="GENERAL">🏢 Office / General</option>
                                                <option disabled>──────────</option>
                                                {projects.map(p => (
                                                    <option key={p.project_id} value={p.project_id}>🏗️ {p.project_name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-white/50 pointer-events-none" />
                                        </div>

                                        <button
                                            onClick={() => setShowCreateInput(prev => !prev)}
                                            className={`p-2 rounded-full backdrop-blur transition-colors ${showCreateInput ? 'bg-white text-black' : 'bg-black/30 text-white'}`}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex gap-4">
                                        <button onClick={() => setFlashMode(prev => prev === 'auto' ? 'on' : prev === 'on' ? 'off' : 'auto')} className="text-white p-2 bg-black/30 rounded-full backdrop-blur">
                                            <Zap className={`w-5 h-5 ${flashMode === 'off' ? 'text-gray-400' : 'text-yellow-400'}`} />
                                        </button>
                                        <button onClick={onClose} className="text-white p-2 bg-black/30 rounded-full backdrop-blur">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* LIGHTNING CREATE INPUT OVERLAY */}
                                {showCreateInput && (
                                    <div className="absolute top-28 left-4 right-4 z-30 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 animate-fade-in-down">
                                        <h3 className="text-white text-sm font-bold mb-2">⚡ Lightning Create</h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                value={newProjectName}
                                                onChange={e => setNewProjectName(e.target.value)}
                                                placeholder="New Project Name..."
                                                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={handleCreateProject}
                                                disabled={creatingProject || !newProjectName.trim()}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                                            >
                                                {creatingProject ? <Loader2 className="animate-spin w-4 h-4" /> : 'Go'}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">* Address can be added later from Home.</p>
                                    </div>
                                )}

                                {/* Main Viewfinder */}
                                <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
                                    {/* Mock Camera Feed */}
                                    {cameraActive && (
                                        <div className="w-full h-full bg-gray-800 relative bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-80">

                                            {/* AI Nudge Popup */}
                                            {showNudge && (
                                                <div className="absolute bottom-10 left-4 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/20 animate-bounce-in z-30">
                                                    <div className="flex gap-3">
                                                        <div className="bg-yellow-100 p-2 rounded-full h-fit text-yellow-600">
                                                            <Building className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-gray-900 text-sm">Looks like Gas / Fuel?</p>
                                                            <p className="text-xs text-gray-600 mt-1">Change to <strong>Office / General</strong> for Company Expense?</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                                        <button onClick={() => handleNudgeAction(false)} className="py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg">No, keep here</button>
                                                        <button onClick={() => handleNudgeAction(true)} className="py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">Yes, move it</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Success Flash */}
                                            {captureState === 'done' && (
                                                <div className="absolute inset-0 bg-white animate-flash pointer-events-none"></div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Shutter Button Area */}
                                <div className="bg-black/90 p-6 pb-12 sm:pb-6 flex justify-center items-center relative z-10">
                                    <button
                                        onClick={handleCapture}
                                        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 ${captureState === 'capturing' ? 'scale-90 border-gray-400 bg-gray-500' : 'border-white bg-white/20 hover:bg-white/30 active:scale-95'}`}
                                    >
                                        <div className={`w-16 h-16 bg-white rounded-full transition-all ${captureState === 'capturing' ? 'scale-75' : ''}`} />
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
