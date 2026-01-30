'use client';

import { useState } from 'react';
import {
  MoreVerticalIcon,
  Trash2Icon,
  EditIcon,
  EyeIcon,
  DownloadIcon,
  CheckCircle2Icon,
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
    accounting?: {
      is_meals_50_deductible?: boolean;
      is_shareholder_loan_potential?: boolean;
    };
  } | null;
}

interface ReceiptCardProps {
  transaction: Transaction;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ReceiptCard({ transaction, onClick, onDelete, onEdit }: ReceiptCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-700 border-gray-200';
    
    const colors: Record<string, string> = {
      'Food & Dining': 'bg-red-100 text-red-700 border-red-200',
      'Transportation': 'bg-blue-100 text-blue-700 border-blue-200',
      'Office Supplies': 'bg-purple-100 text-purple-700 border-purple-200',
      'Utilities': 'bg-amber-100 text-amber-700 border-amber-200',
      'Entertainment': 'bg-pink-100 text-pink-700 border-pink-200',
      'Healthcare': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Travel': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'Shopping': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Professional Services': 'bg-teal-100 text-teal-700 border-teal-200',
      'Other': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[category] || colors['Other'];
  };

  const confidence = transaction.ai_confidence || 0;
  const isTaxDeductible = transaction.raw_data?.accounting?.is_meals_50_deductible || false;

  return (
    <div 
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Receipt Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {transaction.attachment_url ? (
          <img
            src={transaction.attachment_url}
            alt={`Receipt from ${transaction.vendor_name || 'Unknown'}`}
            className={`w-full h-full object-cover transition-all duration-500 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
            } group-hover:scale-105`}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 text-sm">No image</div>
          </div>
        )}
        
        {!imageLoaded && transaction.attachment_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Confidence Badge */}
        {confidence >= 0.8 && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            <CheckCircle2Icon className="w-3 h-3 inline mr-1" />
            Verified
          </div>
        )}

        {/* Menu Button */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all"
          >
            <MoreVerticalIcon className="w-5 h-5 text-gray-700" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <EyeIcon className="w-4 h-4" />
                View Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(transaction.id);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <EditIcon className="w-4 h-4" />
                Edit
              </button>
              {transaction.attachment_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(transaction.attachment_url!, '_blank');
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download
                </button>
              )}
              <hr className="my-2" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(transaction.id);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-red-600"
              >
                <Trash2Icon className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Info */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate mb-1">
              {transaction.vendor_name || 'Unknown Vendor'}
            </h3>
            <p className="text-sm text-gray-500">
              {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${transaction.total_amount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 uppercase">
              {transaction.currency || 'CAD'}
            </p>
          </div>
        </div>

        {/* Category Badge */}
        {transaction.category_user && (
          <div className="flex items-center gap-2">
            <span className={`
              inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border
              ${getCategoryColor(transaction.category_user)}
            `}>
              {transaction.category_user}
            </span>
            
            {isTaxDeductible && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                50% Deductible
              </span>
            )}
          </div>
        )}

        {/* Status Badge */}
        {transaction.status && (
          <div className="flex items-center gap-2">
            <span className={`
              inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
              ${transaction.status === 'approved' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : transaction.status === 'rejected'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
              }
            `}>
              {transaction.status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
