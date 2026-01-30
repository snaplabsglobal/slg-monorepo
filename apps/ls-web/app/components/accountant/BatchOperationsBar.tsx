'use client';

import {
  XIcon,
  DownloadIcon,
  CheckCheckIcon,
  XCircleIcon,
} from './icons';

// ========================================
// Batch Operations Bar
// ========================================

interface BatchOperationsBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function BatchOperationsBar({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onExport,
  onClear,
}: BatchOperationsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
            {selectedCount}
          </div>
          <span className="font-semibold">
            {selectedCount} transaction{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="h-8 w-px bg-slate-700" />

        <div className="flex items-center gap-3">
          <button
            onClick={onApproveAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-all"
          >
            <CheckCheckIcon className="w-4 h-4" />
            Approve All
          </button>

          <button
            onClick={onRejectAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all"
          >
            <XCircleIcon className="w-4 h-4" />
            Reject All
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
          >
            <DownloadIcon className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={onClear}
            className="p-2 hover:bg-slate-800 rounded-lg transition-all"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
