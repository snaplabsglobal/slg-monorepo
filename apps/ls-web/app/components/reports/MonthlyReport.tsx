'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  DollarSignIcon,
  ReceiptIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './icons';

interface CategoryData {
  category: string;
  count: number;
  total_amount: number;
  percentage: number;
}

interface MonthlyReportData {
  month: string;
  totalSpent: number;
  receiptCount: number;
  categoryBreakdown: CategoryData[];
}

export function MonthlyReport() {
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const COLORS = [
    '#EF4444', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899',
    '#10B981', '#06B6D4', '#6366F1', '#14B8A6', '#6B7280'
  ];

  useEffect(() => {
    fetchReport();
  }, [selectedMonth]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      // Use accountant stats API for now
      const response = await fetch(`/api/accountant/stats?month=${selectedMonth}`);
      if (response.ok) {
        const stats = await response.json();
        // Fetch transactions for category breakdown
        const txResponse = await fetch(`/api/accountant/transactions?month=${selectedMonth}&filter=all`);
        const txData = await txResponse.json();
        
        // Calculate category breakdown
        const categoryMap = new Map<string, { count: number; total: number }>();
        txData.transactions?.forEach((tx: any) => {
          const cat = tx.category_user || 'Other';
          const existing = categoryMap.get(cat) || { count: 0, total: 0 };
          categoryMap.set(cat, {
            count: existing.count + 1,
            total: existing.total + (tx.total_amount || 0),
          });
        });

        const totalSpent = stats.monthlyTotal || 0;
        const categoryBreakdown: CategoryData[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          count: data.count,
          total_amount: data.total,
          percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
        })).sort((a, b) => b.total_amount - a.total_amount);

        setReportData({
          month: selectedMonth,
          totalSpent,
          receiptCount: stats.totalTransactions || 0,
          categoryBreakdown,
        });
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const exportCSV = () => {
    if (!reportData) return;

    const csv = [
      ['Category', 'Count', 'Amount', 'Percentage'],
      ...reportData.categoryBreakdown.map(cat => [
        cat.category,
        cat.count,
        cat.total_amount.toFixed(2),
        cat.percentage.toFixed(1) + '%'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledgersnap-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Failed to load report data</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            {formatMonth(selectedMonth)}
          </h1>
          
          <button
            onClick={() => changeMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md"
        >
          <DownloadIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Spent */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSignIcon className="w-6 h-6" />
            </div>
            <TrendingUpIcon className="w-6 h-6 text-white/80" />
          </div>
          <h3 className="text-sm font-medium text-white/80 mb-2">Total Spent</h3>
          <p className="text-4xl font-bold mb-2">
            ${reportData.totalSpent.toFixed(2)}
          </p>
          <p className="text-sm text-white/80">
            {reportData.receiptCount} transactions this month
          </p>
        </div>

        {/* Receipt Count */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ReceiptIcon className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-white/80 mb-2">Transactions</h3>
          <p className="text-4xl font-bold mb-2">
            {reportData.receiptCount}
          </p>
          <p className="text-sm text-white/80">
            Avg: ${(reportData.totalSpent / reportData.receiptCount || 0).toFixed(2)} per transaction
          </p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Spending by Category</h2>
        <div className="space-y-4">
          {reportData.categoryBreakdown.map((cat, index) => (
            <div key={cat.category} className="flex items-center gap-4">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{cat.category}</p>
                <p className="text-sm text-gray-500">{cat.count} transactions</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">${cat.total_amount.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{cat.percentage.toFixed(1)}%</p>
              </div>
              {/* Progress Bar */}
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${cat.percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
