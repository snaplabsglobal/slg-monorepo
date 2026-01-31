// components/transactions/TransactionsTable.tsx
// TABLE_VIEW_FIX: Real HTML table (Excel/SQL style) for Receipts list view

'use client'

import type { Transaction } from './TransactionList'
import { formatDateOnly } from '@/app/lib/utils/format'
import { formatCurrency } from '@/app/lib/utils/format'
import { getReceiptStatus, getReceiptStatusUI, getTransactionTaxAndConfidence } from '@slo/shared-utils'
import { toReceiptLike } from '@/app/lib/receipts/mapReceiptLike'

export interface TransactionsTableProps {
  transactions: Transaction[]
  onRowClick?: (transaction: Transaction) => void
}

export function TransactionsTable({ transactions, onRowClick }: TransactionsTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full border-collapse min-w-[800px]">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              GST (5%)
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              PST (7%)
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Total
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((transaction, index) => {
            const { gst: gstVal, pst: pstVal } = getTransactionTaxAndConfidence(transaction as any)
            const status = getReceiptStatus(toReceiptLike(transaction as any))
            const ui = getReceiptStatusUI(status)
            const statusLabel = status === 'READY' ? `✓ ${ui.label}` : ui.label

            return (
              <tr
                key={transaction.id}
                className={`
                  hover:bg-gray-50 cursor-pointer transition-colors
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                `}
                onClick={() => onRowClick?.(transaction)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.vendor_name || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDateOnly(transaction.transaction_date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                  {gstVal != null ? formatCurrency(gstVal, transaction.currency) : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                  {pstVal != null ? formatCurrency(pstVal, transaction.currency) : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(Math.abs(transaction.total_amount ?? 0), transaction.currency)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="px-2 py-1 inline-flex text-xs font-semibold rounded-full"
                    style={{ color: ui.color, backgroundColor: `${ui.color}20` }}
                  >
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {(transaction as any).category_user || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRowClick?.(transaction)
                    }}
                  >
                    查看
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          没有找到匹配的收据
        </div>
      )}
    </div>
  )
}
