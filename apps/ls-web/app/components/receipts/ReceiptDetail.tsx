'use client';

import { useState } from 'react';
import {
  ArrowLeftIcon,
  EditIcon,
  Trash2Icon,
  DownloadIcon,
  SaveIcon,
  XIcon,
  CalendarIcon,
  DollarSignIcon,
  TagIcon,
  FileTextIcon,
} from './icons';

// Transaction type (matching current database structure)
interface Transaction {
  id: string;
  vendor_name: string | null;
  transaction_date: string;
  total_amount: number;
  currency: string;
  category_user: string | null;
  attachment_url: string | null;
  ai_confidence: number | null;
  status: string;
  raw_data: {
    amounts_cents?: {
      subtotal: number;
      gst: number;
      pst: number;
      total: number;
    };
    accounting?: {
      gifi_code: string | null;
      is_meals_50_deductible: boolean;
      is_shareholder_loan_potential: boolean;
    };
    confidence?: {
      vendor_name: number;
      date: number;
      amounts: number;
      tax_split: number;
      overall: number;
    };
    raw_text?: string;
  } | null;
  tax_details: {
    gst_cents?: number;
    pst_cents?: number;
  } | null;
}

interface ReceiptDetailProps {
  transaction: Transaction;
  onBack?: () => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  onDelete?: (id: string) => void;
}

export function ReceiptDetail({ transaction, onBack, onUpdate, onDelete }: ReceiptDetailProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: transaction.vendor_name || '',
    transaction_date: transaction.transaction_date,
    total_amount: transaction.total_amount,
    category_user: transaction.category_user || '',
  });

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(transaction.id, formData);
      setEditing(false);
    }
  };

  const categories = [
    'Food & Dining',
    'Transportation',
    'Office Supplies',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Travel',
    'Shopping',
    'Professional Services',
    'Other',
  ];

  const confidence = transaction.ai_confidence || transaction.raw_data?.confidence?.overall || 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="font-medium">Back to Transactions</span>
        </button>

        <div className="flex items-center gap-3">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                <EditIcon className="w-4 h-4" />
                Edit
              </button>
              {transaction.attachment_url && (
                <button
                  onClick={() => window.open(transaction.attachment_url!, '_blank')}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-xl transition-all"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download
                </button>
              )}
              <button
                onClick={() => onDelete?.(transaction.id)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-red-300 hover:border-red-400 text-red-600 rounded-xl transition-all"
              >
                <Trash2Icon className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md"
              >
                <SaveIcon className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl transition-all"
              >
                <XIcon className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Receipt Image */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {transaction.attachment_url ? (
              <img
                src={transaction.attachment_url}
                alt="Receipt"
                className="w-full"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                <div className="text-gray-400">No image available</div>
              </div>
            )}
          </div>

          {/* Confidence Score */}
          {confidence > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI Confidence</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Transaction Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction Details</h2>

            <div className="space-y-6">
              {/* Vendor Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FileTextIcon className="w-4 h-4" />
                  Vendor Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">
                    {transaction.vendor_name || 'Unknown Vendor'}
                  </p>
                )}
              </div>

              {/* Date and Amount - Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <CalendarIcon className="w-4 h-4" />
                    Date
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <DollarSignIcon className="w-4 h-4" />
                    Amount
                  </label>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">
                      ${transaction.total_amount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Tax Breakdown */}
              {transaction.tax_details && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Subtotal</p>
                    <p className="text-sm font-bold text-slate-900">
                      ${((transaction.raw_data?.amounts_cents?.subtotal || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-600 mb-1">GST (5%)</p>
                    <p className="text-sm font-bold text-emerald-700">
                      ${((transaction.tax_details.gst_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-1">PST (7%)</p>
                    <p className="text-sm font-bold text-blue-700">
                      ${((transaction.tax_details.pst_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <TagIcon className="w-4 h-4" />
                  Category
                </label>
                {editing ? (
                  <select
                    value={formData.category_user}
                    onChange={(e) => setFormData({ ...formData, category_user: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold border border-blue-200">
                    {transaction.category_user || 'Uncategorized'}
                  </span>
                )}
              </div>

              {/* GIFI Code */}
              {transaction.raw_data?.accounting?.gifi_code && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    GIFI Code
                  </label>
                  <p className="text-lg font-mono font-bold text-blue-700">
                    {transaction.raw_data.accounting.gifi_code}
                  </p>
                </div>
              )}

              {/* Special Flags */}
              <div className="space-y-2">
                {transaction.raw_data?.accounting?.is_meals_50_deductible && (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-sm font-medium text-purple-700">
                      🍽️ Meals & Entertainment - 50% Deductible
                    </span>
                  </div>
                )}
                {transaction.raw_data?.accounting?.is_shareholder_loan_potential && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-700">
                      ⚠️ Potential Personal Expense (Shareholder Loan)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Raw OCR Text */}
          {transaction.raw_data?.raw_text && (
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Raw OCR Text</h3>
              <div className="p-4 bg-white rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                  {transaction.raw_data.raw_text}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
