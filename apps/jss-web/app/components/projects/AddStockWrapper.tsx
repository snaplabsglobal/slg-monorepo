'use client';
import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import AddFromStockModal from './AddFromStockModal';

export default function AddStockWrapper({ projectId }: { projectId: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add Stock
            </button>

            <AddFromStockModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                projectId={projectId}
                onSuccess={() => window.location.reload()} // Simple refresh to update financials
            />
        </>
    );
}
