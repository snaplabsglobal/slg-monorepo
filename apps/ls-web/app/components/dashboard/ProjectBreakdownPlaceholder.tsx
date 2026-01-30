'use client'

export function ProjectBreakdownPlaceholder() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">项目支出分布</h2>
        <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full font-medium">
          Coming Soon
        </span>
      </div>

      <div className="flex items-center justify-center h-48 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-4xl mb-2">🏗️</div>
          <p className="text-gray-600 font-medium">按项目追踪支出</p>
          <p className="text-sm text-gray-500 mt-1">
            材料、人工、分包一清二楚
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800">
          💡 <strong>即将推出：</strong> 为每张收据分配项目，系统将自动统计每个项目的总支出和成本占比。
        </p>
      </div>
    </div>
  )
}
