// ========================================
// LedgerSnap - Frontend Components Library
// ========================================
// Production-ready React components with Tailwind CSS
// Design: Professional B2B SaaS with warm, trustworthy aesthetics
// ========================================

// ========================================
// 1. Upload Receipt Component
// ========================================
// File: components/receipts/upload-receipt.tsx

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle2, AlertCircle, X, Image as ImageIcon } from 'lucide-react';

interface UploadReceiptProps {
  onUploadSuccess?: (receiptId: string) => void;
  onCancel?: () => void;
}

export function UploadReceipt({ onUploadSuccess, onCancel }: UploadReceiptProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
      
      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(data.receipt.id);
      }

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/receipts/${data.receipt.id}`);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-emerald-900 mb-4">
                Receipt Analyzed Successfully!
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Merchant
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result.analysis.merchant_name || 'Unknown'}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Amount
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${result.analysis.total_amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Date
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result.analysis.receipt_date || 'Not detected'}
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Category
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result.analysis.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">
                  Redirecting to receipt details...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {!preview ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-3 border-dashed rounded-2xl p-12 
            transition-all duration-300 ease-out
            ${dragActive 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:shadow-lg'
            }
          `}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center mb-6
              transition-all duration-300
              ${dragActive 
                ? 'bg-blue-500 scale-110' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
              }
            `}>
              <Upload className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {dragActive ? 'Drop it here!' : 'Upload Receipt'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm">
              Drag and drop your receipt image, or click to browse
            </p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                PNG, JPG, WebP
              </span>
              <span>•</span>
              <span>Max 10MB</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative group">
            <img
              src={preview}
              alt="Receipt preview"
              className="w-full rounded-2xl shadow-2xl border-4 border-white"
            />
            
            {!uploading && (
              <button
                onClick={handleRemove}
                className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            
            {analyzing && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 shadow-2xl">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900">
                    Analyzing receipt...
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    This usually takes 5-10 seconds
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Upload Failed</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload & Analyze
                </>
              )}
            </button>
            
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={uploading}
                className="px-6 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// 2. Receipt Card Component
// ========================================
// File: components/receipts/receipt-card.tsx

'use client';

import { useState } from 'react';
import { MoreVertical, Trash2, Edit, Eye, Download } from 'lucide-react';
import { Receipt } from '@/types/receipt';

interface ReceiptCardProps {
  receipt: Receipt;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ReceiptCard({ receipt, onClick, onDelete, onEdit }: ReceiptCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getCategoryColor = (category: string) => {
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

  return (
    <div 
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Receipt Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img
          src={receipt.image_url}
          alt={`Receipt from ${receipt.merchant_name}`}
          className={`w-full h-full object-cover transition-all duration-500 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
          } group-hover:scale-105`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Confidence Badge */}
        {receipt.confidence_score && receipt.confidence_score >= 0.8 && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            ✓ Verified
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
            <MoreVertical className="w-5 h-5 text-gray-700" />
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
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(receipt.id);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(receipt.image_url, '_blank');
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <hr className="my-2" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(receipt.id);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Info */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate mb-1">
              {receipt.merchant_name || 'Unknown Merchant'}
            </h3>
            <p className="text-sm text-gray-500">
              {new Date(receipt.receipt_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${receipt.total_amount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 uppercase">
              {receipt.currency}
            </p>
          </div>
        </div>

        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <span className={`
            inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border
            ${getCategoryColor(receipt.category)}
          `}>
            {receipt.category}
          </span>
          
          {receipt.is_tax_deductible && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              Tax Deductible
            </span>
          )}
        </div>

        {/* Notes Preview */}
        {receipt.notes && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {receipt.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ========================================
// 3. Receipt List with Filters
// ========================================
// File: components/receipts/receipt-list.tsx

'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react';
import { ReceiptCard } from './receipt-card';
import { Receipt } from '@/types/receipt';

interface ReceiptListProps {
  onReceiptClick?: (receipt: Receipt) => void;
  onReceiptDelete?: (id: string) => void;
  onReceiptEdit?: (id: string) => void;
}

export function ReceiptList({ onReceiptClick, onReceiptDelete, onReceiptEdit }: ReceiptListProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

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

  useEffect(() => {
    fetchReceipts();
  }, [selectedCategory, dateRange]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      
      if (dateRange !== 'all') {
        const startDate = getDateRangeStart(dateRange);
        params.append('start_date', startDate);
      }

      const response = await fetch(`/api/receipts?${params}`);
      const data = await response.json();
      setReceipts(data.receipts || []);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeStart = (range: string): string => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
      default:
        return '';
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      receipt.merchant_name?.toLowerCase().includes(searchLower) ||
      receipt.notes?.toLowerCase().includes(searchLower)
    );
  });

  const clearFilters = () => {
    setSelectedCategory(null);
    setDateRange('all');
    setSearch('');
  };

  const hasActiveFilters = selectedCategory || dateRange !== 'all' || search;

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
              ${showFilters 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
              Clear
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
            {/* Category Filter */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category ? null : category
                    )}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedCategory === category
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Date Range</h3>
              <div className="flex gap-2">
                {(['all', 'week', 'month', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${dateRange === range
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {range === 'all' ? 'All Time' : `Past ${range}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${filteredReceipts.length} receipt${filteredReceipts.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Receipt Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-96 animate-pulse" />
          ))}
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No receipts found</h3>
          <p className="text-gray-600 mb-6">
            {hasActiveFilters 
              ? 'Try adjusting your filters' 
              : 'Upload your first receipt to get started'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReceipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onClick={() => onReceiptClick?.(receipt)}
              onDelete={onReceiptDelete}
              onEdit={onReceiptEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// Type Definition
// ========================================
// File: types/receipt.ts

export interface Receipt {
  id: string;
  user_id: string;
  merchant_name: string | null;
  receipt_date: string;
  total_amount: number;
  currency: string;
  category: string;
  subcategory: string | null;
  tags: string[] | null;
  ocr_raw_text: string | null;
  gemini_response: any;
  confidence_score: number | null;
  image_url: string;
  image_size_bytes: number | null;
  image_mime_type: string | null;
  notes: string | null;
  is_reimbursable: boolean;
  is_tax_deductible: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
