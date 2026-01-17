'use client';
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTerm } from '@/utils/terms';

interface PromoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: any;
    onSuccess: () => void;
}

export default function PromoteModal({ isOpen, onClose, lead, onSuccess }: PromoteModalProps) {
    const supabase = createClient();
    const router = useRouter();
    const [projectName, setProjectName] = useState(`${lead.client_name} Reno`);
    const [loading, setLoading] = useState(false);

    const handlePromote = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data, error } = await supabase.rpc('convert_lead_to_project', {
                p_lead_id: lead.id,
                p_project_name: projectName,
                p_user_id: user.id
            });

            if (error) {
                alert("Promote failed: " + error.message);
            } else {
                onSuccess();
                // Optionally redirect to new project
                if (data && data.project_id) {
                    router.push(`/projects/${data.project_id}`);
                }
            }
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
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 border-4 border-yellow-100">
                                        <Sparkles className="h-8 w-8 text-yellow-500" aria-hidden="true" />
                                    </div>
                                    <div className="mt-4 text-center">
                                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                            Win This {getTerm('PROJECT')}?
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Promoting <strong>{lead.client_name}</strong> will create a new ACTIVE {getTerm('PROJECT').toLowerCase()} and move this lead to history.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Official {getTerm('PROJECT')} Name</label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={e => setProjectName(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 p-4 bg-gray-50 font-bold"
                                    />
                                </div>

                                <div className="mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-xl bg-black px-3 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800 sm:col-start-2 disabled:opacity-50"
                                        onClick={handlePromote}
                                        disabled={loading || !projectName}
                                    >
                                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Let\'s Start Work!'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-3 py-3 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                        onClick={onClose}
                                    >
                                        Not Yet
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
