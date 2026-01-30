// ========================================
// Accountant Dashboard - Part 2
// ========================================
// Transaction Details Modal & Batch Operations
// ========================================

'use client';

import { useState } from 'react';
import {
  X,
  Download,
  Edit,
  CheckCheck,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  Save,
  RefreshCw,
} from 'lucide-react';

// ========================================
// Transaction Details Modal
// ========================================

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Transaction>) => void;
  onApprove: () => void;
  onReject: () => void;
}

export function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  onSave,
  onApprove,
  onReject,
}: TransactionDetailsModalProps) {
  const [editing, setEditing] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  if (!isOpen || !transaction) return null;

  const handleSave = () => {
    onSave(formData);
    setEditing(false);
  };

  const confidence = transaction.raw_data?.confidence || {
    vendor_name: transaction.ai_confidence,
    date: transaction.ai_confidence,
    amounts: transaction.ai_confidence,
    tax_split: transaction.ai_confidence,
    overall: transaction.ai_confidence,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  Transaction Details
                </h2>
                <p className="text-sm text-slate-600">
                  ID: {transaction.id.slice(0, 8)}...
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-blue-300 hover:border-blue-400 text-blue-700 rounded-lg font-semibold transition-all"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* Left Column - Receipt Image */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Receipt Image</h3>
                  <div className="relative group">
                    <img
                      src={transaction.attachment_url}
                      alt="Receipt"
                      className="w-full rounded-xl border-2 border-slate-200 shadow-lg cursor-pointer hover:border-blue-400 transition-all"
                      onClick={() => setImageZoomed(true)}
                    />
                    <button
                      onClick={() => setImageZoomed(true)}
                      className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ZoomIn className="w-5 h-5 text-slate-700" />
                    </button>
                  </div>

                  {/* Download Original */}
                  <button className="flex items-center gap-2 w-full mt-4 px-4 py-3 border-2 border-slate-200 hover:border-slate-300 rounded-lg font-medium text-slate-700 transition-all">
                    <Download className="w-4 h-4" />
                    Download Original
                  </button>
                </div>

                {/* AI Confidence Scores */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">AI Confidence Scores</h3>
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                    <ConfidenceRow label="Vendor Name" value={confidence.vendor_name} />
                    <ConfidenceRow label="Date" value={confidence.date} />
                    <ConfidenceRow label="Amounts" value={confidence.amounts} />
                    <ConfidenceRow label="Tax Split" value={confidence.tax_split} />
                    <div className="pt-3 border-t border-slate-200">
                      <ConfidenceRow label="Overall" value={confidence.overall} isBold />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Transaction Details */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h3>
                  <div className="space-y-4">
                    <DetailField
                      label="Vendor Name"
                      value={transaction.vendor_name}
                      editing={editing}
                      onChange={(value) => setFormData({ ...formData, vendor_name: value })}
                      icon={<FileText className="w-4 h-4" />}
                    />

                    <DetailField
                      label="Transaction Date"
                      value={transaction.transaction_date}
                      editing={editing}
                      type="date"
                      onChange={(value) => setFormData({ ...formData, transaction_date: value })}
                      icon={<Calendar className="w-4 h-4" />}
                    />

                    <DetailField
                      label="Category"
                      value={transaction.category_user}
                      editing={editing}
                      onChange={(value) => setFormData({ ...formData, category_user: value })}
                      icon={<Tag className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* Financial Details */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Financial Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <AmountCard
                      label="Subtotal"
                      amount={(transaction.raw_data?.amounts_cents?.subtotal || 0) / 100}
                      color="slate"
                      editing={editing}
                    />
                    <AmountCard
                      label="GST (5%)"
                      amount={(transaction.tax_details?.gst_cents || 0) / 100}
                      color="emerald"
                      editing={editing}
                    />
                    <AmountCard
                      label="PST (7%)"
                      amount={(transaction.tax_details?.pst_cents || 0) / 100}
                      color="blue"
                      editing={editing}
                    />
                    <AmountCard
                      label="Total"
                      amount={transaction.total_amount}
                      color="violet"
                      editing={editing}
                      isBold
                    />
                  </div>
                </div>

                {/* Accounting Info */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Accounting Classification</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">GIFI Code</span>
                      <span className="text-sm font-mono font-bold text-blue-700">
                        {transaction.raw_data?.accounting?.gifi_code || 'Not assigned'}
                      </span>
                    </div>

                    {transaction.raw_data?.accounting?.is_meals_50_deductible && (
                      <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">
                          Meals & Entertainment - 50% Deductible
                        </span>
                      </div>
                    )}

                    {transaction.raw_data?.accounting?.is_shareholder_loan_potential && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">
                          Potential Personal Expense (Shareholder Loan)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw OCR Text */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Raw OCR Text</h3>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap">
                      {transaction.raw_data?.raw_text || 'No OCR text available'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                {transaction.needs_review && (
                  <span className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    Needs Review
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onReject}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Transaction
                </button>

                <button
                  onClick={onApprove}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <CheckCheck className="w-4 h-4" />
                  Approve Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {imageZoomed && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setImageZoomed(false)}
        >
          <img
            src={transaction.attachment_url}
            alt="Receipt zoomed"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setImageZoomed(false)}
            className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl hover:bg-white transition-all"
          >
            <X className="w-6 h-6 text-slate-900" />
          </button>
        </div>
      )}
    </>
  );
}

// ========================================
// Detail Field Component
// ========================================

interface DetailFieldProps {
  label: string;
  value: string;
  editing: boolean;
  type?: 'text' | 'date';
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
}

function DetailField({ label, value, editing, type = 'text', onChange, icon }: DetailFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
        {icon}
        {label}
      </label>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        />
      ) : (
        <p className="text-sm font-medium text-slate-900 px-4 py-2 bg-slate-50 rounded-lg">
          {value}
        </p>
      )}
    </div>
  );
}

// ========================================
// Amount Card Component
// ========================================

interface AmountCardProps {
  label: string;
  amount: number;
  color: 'slate' | 'emerald' | 'blue' | 'violet';
  editing: boolean;
  isBold?: boolean;
}

function AmountCard({ label, amount, color, editing, isBold }: AmountCardProps) {
  const colorClasses = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[color]}`}>
      <p className="text-xs font-semibold mb-2">{label}</p>
      {editing ? (
        <input
          type="number"
          step="0.01"
          value={amount}
          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono"
        />
      ) : (
        <p className={`${isBold ? 'text-xl' : 'text-lg'} font-bold`}>
          ${amount.toFixed(2)}
        </p>
      )}
    </div>
  );
}

// ========================================
// Confidence Row Component
// ========================================

function ConfidenceRow({ label, value, isBold }: { label: string; value: number; isBold?: boolean }) {
  const percentage = Math.round(value * 100);
  const color = value >= 0.9 ? 'bg-emerald-500' : value >= 0.7 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${isBold ? 'font-bold' : 'font-medium'} text-slate-700`}>
          {label}
        </span>
        <span className={`text-xs ${isBold ? 'font-bold' : 'font-semibold'} text-slate-900`}>
          {percentage}%
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

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
            <CheckCheck className="w-4 h-4" />
            Approve All
          </button>

          <button
            onClick={onRejectAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all"
          >
            <XCircle className="w-4 h-4" />
            Reject All
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={onClear}
            className="p-2 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Export
// ========================================

export default {
  TransactionDetailsModal,
  BatchOperationsBar,
};
