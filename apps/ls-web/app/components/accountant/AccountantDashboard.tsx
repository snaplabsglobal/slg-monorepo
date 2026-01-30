'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FileTextIcon,
  CalendarIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  EditIcon,
  CheckCheckIcon,
  XCircleIcon,
  InfoIcon,
} from './icons';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { BatchOperationsBar } from './BatchOperationsBar';

// ========================================
// Types
// ========================================

interface Transaction {
  id: string;
  vendor_name: string;
  transaction_date: string;
  total_amount: number;
  currency: string;
  category_user: string;
  ai_confidence: number;
  needs_review: boolean;
  status: 'pending' | 'approved' | 'rejected';
  attachment_url: string | null;
  raw_data: {
    amounts_cents?: {
      subtotal: number;
      gst: number;
      pst: number;
      total: number;
    };
    accounting?: {
      gifi_code: string | null;
      vendor_alias: string | null;
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
  } | null;
  tax_details: {
    gst_cents?: number;
    pst_cents?: number;
    total_tax_cents?: number;
    tax_split_confidence?: number;
  } | null;
}

interface DashboardStats {
  totalTransactions: number;
  needsReview: number;
  approved: number;
  totalGST: number;
  totalPST: number;
  monthlyTotal: number;
  avgConfidence: number;
}

// ========================================
// Main Dashboard Component
// ========================================

export function AccountantDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'review' | 'approved' | 'rejected'>('review');
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth, filter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await fetch(`/api/accountant/stats?month=${selectedMonth}`);
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch transactions
      const params = new URLSearchParams({
        month: selectedMonth,
        filter: filter,
      });
      
      const transactionsResponse = await fetch(`/api/accountant/transactions?${params}`);
      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }
      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData.transactions || []);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set empty data on error to prevent UI crash
      setStats({
        totalTransactions: 0,
        needsReview: 0,
        approved: 0,
        totalGST: 0,
        totalPST: 0,
        monthlyTotal: 0,
        avgConfidence: 0,
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/accountant/transactions/${id}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to approve transaction:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/accountant/transactions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by accountant' }),
      });
      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to reject transaction:', error);
    }
  };

  const handleViewDetails = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setSelectedTransaction(transaction);
      setModalOpen(true);
    }
  };

  const handleBatchApprove = async () => {
    try {
      const response = await fetch('/api/accountant/transactions/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_ids: Array.from(selectedIds) }),
      });
      if (response.ok) {
        setSelectedIds(new Set());
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to batch approve:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/accountant/export?month=${selectedMonth}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledgersnap-${selectedMonth}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Accountant Dashboard
              </h1>
              <p className="text-sm text-slate-600">
                BC Construction - GST/PST Review & ITC Management
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium"
              >
                {getLast12Months().map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              {/* Export Button */}
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                <DownloadIcon className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions}
            subtitle={`${stats.needsReview} need review`}
            icon={FileTextIcon}
            color="blue"
            trend={stats.totalTransactions > 0 ? 'up' : 'neutral'}
          />

          <StatCard
            title="GST Recoverable"
            value={formatCurrency(stats.totalGST / 100)}
            subtitle="For ITC claim"
            icon={DollarSignIcon}
            color="emerald"
            trend="up"
          />

          <StatCard
            title="Avg Confidence"
            value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
            subtitle={`${stats.approved} approved`}
            icon={CheckCircle2Icon}
            color="violet"
            trend={stats.avgConfidence >= 0.9 ? 'up' : 'down'}
          />

          <StatCard
            title="Monthly Total"
            value={formatCurrency(stats.monthlyTotal)}
            subtitle={`GST: ${formatCurrency(stats.totalGST / 100)} | PST: ${formatCurrency(stats.totalPST / 100)}`}
            icon={CalendarIcon}
            color="amber"
            trend="neutral"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <FilterTab
              label="Needs Review"
              count={stats.needsReview}
              active={filter === 'review'}
              onClick={() => setFilter('review')}
              color="amber"
            />
            <FilterTab
              label="All Transactions"
              count={stats.totalTransactions}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              color="slate"
            />
            <FilterTab
              label="Approved"
              count={stats.approved}
              active={filter === 'approved'}
              onClick={() => setFilter('approved')}
              color="emerald"
            />
            <FilterTab
              label="Rejected"
              count={stats.totalTransactions - stats.approved - stats.needsReview}
              active={filter === 'rejected'}
              onClick={() => setFilter('rejected')}
              color="red"
            />
          </div>

          {/* Transaction List */}
          <div className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <FileTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-600">No transactions found</p>
                <p className="text-sm text-slate-500 mt-1">
                  {filter === 'review' 
                    ? 'All transactions have been reviewed! 🎉'
                    : 'Try adjusting your filters or date range.'
                  }
                </p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  selected={selectedIds.has(transaction.id)}
                  onSelect={(id) => {
                    const newSet = new Set(selectedIds);
                    if (newSet.has(id)) {
                      newSet.delete(id);
                    } else {
                      newSet.add(id);
                    }
                    setSelectedIds(newSet);
                  }}
                  onApprove={() => handleApprove(transaction.id)}
                  onReject={() => handleReject(transaction.id)}
                  onViewDetails={() => handleViewDetails(transaction.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedTransaction(null);
          }}
          onSave={async (updates) => {
            // TODO: Implement save functionality
            console.log('Save updates:', updates);
          }}
          onApprove={() => {
            handleApprove(selectedTransaction.id);
            setModalOpen(false);
          }}
          onReject={() => {
            handleReject(selectedTransaction.id);
            setModalOpen(false);
          }}
        />
      )}

      {/* Batch Operations Bar */}
      <BatchOperationsBar
        selectedCount={selectedIds.size}
        onApproveAll={handleBatchApprove}
        onRejectAll={() => {
          // TODO: Implement batch reject
          console.log('Batch reject:', Array.from(selectedIds));
        }}
        onExport={handleExport}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}

// ========================================
// Stat Card Component
// ========================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'violet' | 'amber';
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBgClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trend !== 'neutral' && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend === 'up' ? (
              <TrendingUpIcon className="w-3 h-3" />
            ) : (
              <TrendingDownIcon className="w-3 h-3" />
            )}
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-slate-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-slate-900 mb-2">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

// ========================================
// Filter Tab Component
// ========================================

interface FilterTabProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: 'amber' | 'slate' | 'emerald' | 'red';
}

function FilterTab({ label, count, active, onClick, color }: FilterTabProps) {
  const activeClasses = {
    amber: 'border-amber-500 text-amber-700 bg-amber-50',
    slate: 'border-slate-500 text-slate-700 bg-slate-50',
    emerald: 'border-emerald-500 text-emerald-700 bg-emerald-50',
    red: 'border-red-500 text-red-700 bg-red-50',
  };

  const badgeClasses = {
    amber: active ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600',
    slate: active ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-600',
    emerald: active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600',
    red: active ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-6 py-4 text-sm font-semibold transition-all
        ${active 
          ? `${activeClasses[color]} border-b-3` 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }
      `}
    >
      <span>{label}</span>
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${badgeClasses[color]}`}>
        {count}
      </span>
    </button>
  );
}

// ========================================
// Transaction Row Component
// ========================================

interface TransactionRowProps {
  transaction: Transaction;
  selected: boolean;
  onSelect: (id: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onViewDetails: () => void;
}

function TransactionRow({ transaction, selected, onSelect, onApprove, onReject, onViewDetails }: TransactionRowProps) {
  const confidence = transaction.raw_data?.confidence?.overall || transaction.ai_confidence || 0;
  const gifiCode = transaction.raw_data?.accounting?.gifi_code;
  const isMeals = transaction.raw_data?.accounting?.is_meals_50_deductible;
  const isShareholderLoan = transaction.raw_data?.accounting?.is_shareholder_loan_potential;

  return (
    <div className={`p-6 hover:bg-slate-50 transition-all group ${selected ? 'bg-blue-50' : ''}`}>
      <div className="flex items-start gap-6">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(transaction.id)}
          className="mt-2 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
        />

        {/* Receipt Thumbnail */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200 group-hover:border-blue-300 transition-all shadow-sm">
            {transaction.attachment_url ? (
              <img
                src={transaction.attachment_url}
                alt="Receipt"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                <FileTextIcon className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Transaction Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {transaction.vendor_name || 'Unknown Vendor'}
                </h3>
                
                {/* Confidence Badge */}
                {confidence >= 0.9 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                    <CheckCircle2Icon className="w-3 h-3" />
                    Verified
                  </span>
                ) : confidence >= 0.5 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                    <AlertCircleIcon className="w-3 h-3" />
                    Review
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                    <XCircleIcon className="w-3 h-3" />
                    Failed
                  </span>
                )}

                {/* GIFI Code */}
                {gifiCode && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-mono font-semibold">
                    GIFI {gifiCode}
                  </span>
                )}

                {/* Meals 50% */}
                {isMeals && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                    50% Deductible
                  </span>
                )}

                {/* Shareholder Loan Warning */}
                {isShareholderLoan && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-semibold">
                    <InfoIcon className="w-3 h-3" />
                    Personal?
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <span>•</span>
                <span>{transaction.category_user || 'Uncategorized'}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right ml-4">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(transaction.total_amount)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {transaction.currency || 'CAD'}
              </p>
            </div>
          </div>

          {/* Tax Breakdown */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg mb-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Subtotal</p>
              <p className="text-sm font-bold text-slate-900">
                {formatCurrency((transaction.raw_data?.amounts_cents?.subtotal || 0) / 100)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600 mb-1">GST (5%)</p>
              <p className="text-sm font-bold text-emerald-700">
                {formatCurrency((transaction.tax_details?.gst_cents || 0) / 100)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 mb-1">PST (7%)</p>
              <p className="text-sm font-bold text-blue-700">
                {formatCurrency((transaction.tax_details?.pst_cents || 0) / 100)}
              </p>
            </div>
          </div>

          {/* Confidence Details */}
          <div className="flex items-center gap-6 text-xs text-slate-600 mb-4">
            <ConfidenceBar 
              label="Vendor" 
              value={transaction.raw_data?.confidence?.vendor_name || confidence} 
            />
            <ConfidenceBar 
              label="Date" 
              value={transaction.raw_data?.confidence?.date || confidence} 
            />
            <ConfidenceBar 
              label="Amounts" 
              value={transaction.raw_data?.confidence?.amounts || confidence} 
            />
            <ConfidenceBar 
              label="Tax Split" 
              value={transaction.raw_data?.confidence?.tax_split || confidence} 
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onApprove}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <CheckCheckIcon className="w-4 h-4" />
              Approve
            </button>
            
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <XCircleIcon className="w-4 h-4" />
              Reject
            </button>

            <button
              onClick={onViewDetails}
              className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-sm font-semibold transition-all"
            >
              <EyeIcon className="w-4 h-4" />
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Confidence Bar Component
// ========================================

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  const color = value >= 0.9 ? 'bg-emerald-500' : value >= 0.7 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-900">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ========================================
// Skeleton Loader
// ========================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 animate-pulse">
      <div className="max-w-[1600px] mx-auto">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-8" />
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="bg-white rounded-xl p-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg mb-4" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Helper Functions
// ========================================

function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function getLast12Months() {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  
  return months;
}
