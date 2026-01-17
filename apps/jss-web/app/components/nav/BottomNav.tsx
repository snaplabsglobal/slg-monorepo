'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FolderKanban, Plus, User } from 'lucide-react';
import CameraModal from '../camera/CameraModal';

export default function BottomNav() {
    const pathname = usePathname();
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const isActive = (path: string) => pathname === path || (path !== '/' && pathname?.startsWith(path));

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
                <div className="flex justify-between items-center max-w-md mx-auto h-16">

                    <Link href="/" className={`flex flex-col items-center gap-1 ${isActive('/') && pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>

                    {/* Central Camera FAB */}
                    <div className="relative -top-5">
                        <button
                            onClick={() => setIsCameraOpen(true)}
                            className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
                        >
                            <Plus className="w-8 h-8" />
                        </button>
                    </div>

                    <Link href="/projects" className={`flex flex-col items-center gap-1 ${isActive('/projects') ? 'text-blue-600' : 'text-gray-400'}`}>
                        <FolderKanban className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Projects</span>
                    </Link>

                </div>
            </div>

            {/* Global Camera Modal */}
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} />
        </>
    );
}
