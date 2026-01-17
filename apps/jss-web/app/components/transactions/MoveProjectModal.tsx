'use client';
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowRight } from 'lucide-react';
import { getTerm } from '@/utils/terms';

interface MoveProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: string;
    currentProjectName?: string;
    onSuccess?: () => void;
}

export default function MoveProjectModal({ isOpen, onClose, transactionId, currentProjectName, onSuccess }: MoveProjectModalProps) {
    const supabase = createClient();
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const load = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
                    if (data) setProjects(data);
                }
            };
            load();
        }
    }, [isOpen]);

    const handleMove = async () => {
        if (!selectedProjectId) return;
        setLoading(true);

        const { error } = await supabase
            .from('transactions')
            .update({ project_id: selectedProjectId })
            .eq('id', transactionId);

        if (error) {
            alert("Failed to move: " + error.message);
        } else {
            if (onSuccess) onSuccess();
            onClose();
        }
        setLoading(false);
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
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                                <div>
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                        <ArrowRight className="h-6 w-6 text-blue-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            Move to different {getTerm('PROJECT')}
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Currently assigned to: <strong>{currentProjectName || 'Unknown'}</strong>.
                                                Where should this go?
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <select
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 p-2"
                                    >
                                        <option value="">Select Target {getTerm('PROJECT')}...</option>
                                        {projects.map(p => (
                                            <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:col-start-2 disabled:opacity-50"
                                        onClick={handleMove}
                                        disabled={loading || !selectedProjectId}
                                    >
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Confirm Move'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                        onClick={onClose}
                                    >
                                        Cancel
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
