// ========================================
// LedgerSnap - Frontend Components Library (Part 2)
// ========================================
// Receipt Details, Reports, and Dashboard Layout
// ========================================

// ========================================
// 4. Receipt Detail View
// ========================================
// File: components/receipts/receipt-detail.tsx

'use client';

import { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Download, Save, X, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { Receipt } from '@/types/receipt';

interface ReceiptDetailProps {
  receipt: Receipt;
  onBack?: () => void;
  onUpdate?: (id: string, updates: Partial<Receipt>) => void;
  onDelete?: (id: string) => void;
}

export function ReceiptDetail({ receipt, onBack, onUpdate, onDelete }: ReceiptDetailProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    merchant_name: receipt.merchant_name || '',
    receipt_date: receipt.receipt_date,
    total_amount: receipt.total_amount,
    category: receipt.category,
    notes: receipt.notes || '',
    is_reimbursable: receipt.is_reimbursable,
    is_tax_deductible: receipt.is_tax_deductible,
  });

  const handleSave = async () => {
    if (onUpdate) {
      await onUpdate(receipt.id, formData);
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Receipts</span>
        </button>

        <div className="flex items-center gap-3">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => window.open(receipt.image_url, '_blank')}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => onDelete?.(receipt.id)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-red-300 hover:border-red-400 text-red-600 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
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
            <img
              src={receipt.image_url}
              alt="Receipt"
              className="w-full"
            />
          </div>

          {/* Confidence Score */}
          {receipt.confidence_score && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI Confidence</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {(receipt.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${receipt.confidence_score * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Receipt Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Receipt Details</h2>

            <div className="space-y-6">
              {/* Merchant Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4" />
                  Merchant Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.merchant_name}
                    onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                ) : (
                  <p className="text-lg font-medium text-gray-900">
                    {receipt.merchant_name || 'Unknown Merchant'}
                  </p>
                )}
              </div>

              {/* Date and Amount - Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.receipt_date}
                      onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(receipt.receipt_date).toLocaleDateString('en-US', {
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
                    <DollarSign className="w-4 h-4" />
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
                      ${receipt.total_amount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="w-4 h-4" />
                  Category
                </label>
                {editing ? (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold border border-blue-200">
                    {receipt.category}
                  </span>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Notes
                </label>
                {editing ? (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none resize-none"
                    placeholder="Add notes about this receipt..."
                  />
                ) : (
                  <p className="text-gray-700">
                    {receipt.notes || 'No notes'}
                  </p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing ? formData.is_tax_deductible : receipt.is_tax_deductible}
                    onChange={(e) => editing && setFormData({ ...formData, is_tax_deductible: e.target.checked })}
                    disabled={!editing}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Tax Deductible
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing ? formData.is_reimbursable : receipt.is_reimbursable}
                    onChange={(e) => editing && setFormData({ ...formData, is_reimbursable: e.target.checked })}
                    disabled={!editing}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Reimbursable
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-medium text-gray-900">
                  {new Date(receipt.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {new Date(receipt.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Size</span>
                <span className="font-medium text-gray-900">
                  {receipt.image_size_bytes 
                    ? `${(receipt.image_size_bytes / 1024).toFixed(1)} KB`
                    : 'Unknown'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 5. Monthly Report Component
// ========================================
// File: components/reports/monthly-report.tsx

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
      const response = await fetch(`/api/reports/summary?month=${selectedMonth}`);
      const data = await response.json();
      setReportData(data);
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
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            {formatMonth(selectedMonth)}
          </h1>
          
          <button
            onClick={() => changeMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Spent */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <TrendingUp className="w-6 h-6 text-white/80" />
          </div>
          <h3 className="text-sm font-medium text-white/80 mb-2">Total Spent</h3>
          <p className="text-4xl font-bold mb-2">
            ${reportData.totalSpent.toFixed(2)}
          </p>
          <p className="text-sm text-white/80">
            {reportData.receiptCount} receipts this month
          </p>
        </div>

        {/* Receipt Count */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-white/80 mb-2">Receipts</h3>
          <p className="text-4xl font-bold mb-2">
            {reportData.receiptCount}
          </p>
          <p className="text-sm text-white/80">
            Avg: ${(reportData.totalSpent / reportData.receiptCount || 0).toFixed(2)} per receipt
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.categoryBreakdown}
                dataKey="total_amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.percentage.toFixed(1)}%`}
              >
                {reportData.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Category Details</h2>
          <div className="space-y-4">
            {reportData.categoryBreakdown.map((cat, index) => (
              <div key={cat.category} className="flex items-center gap-4">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{cat.category}</p>
                  <p className="text-sm text-gray-500">{cat.count} receipts</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${cat.total_amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{cat.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 6. Dashboard Layout
// ========================================
// File: components/layout/dashboard-layout.tsx

'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  Settings, 
  Upload,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Receipts', href: '/receipts', icon: Receipt },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">LedgerSnap</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Button */}
          <div className="p-4">
            <Link
              href="/receipts/upload"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Upload className="w-5 h-5" />
              Upload Receipt
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-semibold' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition-all">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">John Doe</p>
                <p className="text-sm text-gray-500">john@example.com</p>
              </div>
            </div>
            <button className="flex items-center gap-3 w-full px-4 py-3 mt-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-gray-900">LedgerSnap</span>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
