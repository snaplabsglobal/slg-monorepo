'use client'

interface TaxSummaryProps {
  gst: number
  pst: number
  confidence?: number
  loading?: boolean
}

export function TaxSummary({ gst, pst, confidence = 0, loading }: TaxSummaryProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-16 bg-gray-100 rounded mb-3" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white text-xl">🍁</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">加拿大税务汇总</h2>
            <p className="text-xs text-gray-500">British Columbia (BC) - CRA Compliant</p>
          </div>
        </div>
        {confidence > 0 && (
          <div className="text-right">
            <div className="text-xs text-gray-500">AI 识别准确率</div>
            <div className="text-xl font-bold text-green-600">{Math.round(confidence * 100)}%</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-900">预计可抵扣 GST</p>
              <p className="text-xs text-green-700 mt-0.5">Input Tax Credit (ITC)</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {gst > 0 ? `$${gst.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">BC PST (已支付)</p>
              <p className="text-xs text-gray-600 mt-0.5">Provincial Sales Tax - 不可抵扣</p>
            </div>
            <p className="text-2xl font-bold text-gray-700">
              {pst > 0 ? `$${pst.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 系统已自动区分 GST 和 PST，符合 CRA 和 BC 省标准。
        </p>
      </div>
    </div>
  )
}
