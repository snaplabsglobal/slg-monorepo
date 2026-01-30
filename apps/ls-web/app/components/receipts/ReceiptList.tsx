'use client';

import { useState, useEffect } from 'react';
import {
  SearchIcon,
  FilterIcon,
  SlidersHorizontalIcon,
  XIcon,
} from './icons';
import { ReceiptCard } from './ReceiptCard';

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

interface ReceiptListProps {
  onTransactionClick?: (transaction: Transaction) => void;
  onTransactionDelete?: (id: string) => void;
  onTransactionEdit?: (id: string) => void;
}

export function ReceiptList({ onTransactionClick, onTransactionDelete, onTransactionEdit }: ReceiptListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    fetchTransactions();
  }, [selectedCategory, dateRange]);

  const fetchTransactions = async () => {
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

      // Use transactions API
      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
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

  const filteredTransactions = transactions.filter(transaction => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      transaction.vendor_name?.toLowerCase().includes(searchLower) ||
      transaction.category_user?.toLowerCase().includes(searchLower)
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
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
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
            <SlidersHorizontalIcon className="w-5 h-5" />
            Filters
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <XIcon className="w-5 h-5" />
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
          {loading ? 'Loading...' : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Transaction Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-96 animate-pulse" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FilterIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-600 mb-6">
            {hasActiveFilters 
              ? 'Try adjusting your filters' 
              : 'Upload your first receipt to get started'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTransactions.map((transaction) => (
            <ReceiptCard
              key={transaction.id}
              transaction={transaction}
              onClick={() => onTransactionClick?.(transaction)}
              onDelete={onTransactionDelete}
              onEdit={onTransactionEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
