'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, TEMPERATURE_MAP } from '@/lib/utils'

interface PrintData {
  batch: {
    batchNo: string
    deliveryDate: string
    driver: { user: { name: string }; plateNo?: string }
  }
  waybills: Array<{
    waybillNo: string
    receiverName: string
    receiverPhone: string
    receiverAddress: string
    temperatureLayer: string
    packageCount: number
    weight: number
    remark?: string
  }>
  tempCount: Record<string, number>
  totalWeight: number
  totalPackages: number
}

interface PrintViewProps {
  batchId: number
  onClose: () => void
}

export default function PrintView({ batchId, onClose }: PrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<PrintData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/batches/${batchId}/print`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [batchId])

  const handlePrint = () => {
    window.print()
  }

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>
  if (!data) return <div className="p-8 text-center text-red-500">加载失败</div>

  const { batch, waybills, tempCount, totalWeight, totalPackages } = data

  return (
    <div>
      {/* 打印按钮（屏幕可见，打印时隐藏） */}
      <div className="flex gap-3 mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          🖨️ 打印派送单
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          关闭
        </button>
      </div>

      {/* 打印内容 */}
      <div ref={printRef} className="bg-white p-6 print:p-0 max-w-[210mm] mx-auto text-sm">
        {/* 标题 */}
        <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
          <h1 className="text-xl font-bold">中通冷链末端城配派送单</h1>
          <div className="flex justify-between mt-2 text-sm">
            <span>批次号：{batch.batchNo}</span>
            <span>日期：{formatDate(batch.deliveryDate)}</span>
          </div>
        </div>

        {/* 信息行 */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div><span className="text-gray-500 mr-1">司机：</span>{batch.driver.user.name}</div>
          <div><span className="text-gray-500 mr-1">车牌：</span>{batch.driver.plateNo || '-'}</div>
          <div><span className="text-gray-500 mr-1">总单数：</span>{waybills.length}单</div>
          <div><span className="text-gray-500 mr-1">总件数：</span>{totalPackages}件</div>
          <div><span className="text-gray-500 mr-1">总重量：</span>{totalWeight}kg</div>
          <div>
            {Object.entries(tempCount).map(([k, v]) => (
              <span key={k} className="mr-2">{k}:{v}单</span>
            ))}
          </div>
        </div>

        {/* 表格 */}
        <table className="w-full border-collapse border border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-1.5 w-10">序号</th>
              <th className="border border-gray-400 p-1.5 w-16">运单号</th>
              <th className="border border-gray-400 p-1.5 w-14">收件人</th>
              <th className="border border-gray-400 p-1.5 min-w-[120px]">地址</th>
              <th className="border border-gray-400 p-1.5 w-20">电话</th>
              <th className="border border-gray-400 p-1.5 w-10">件数</th>
              <th className="border border-gray-400 p-1.5 w-12">温层</th>
              <th className="border border-gray-400 p-1.5 w-20">签收栏</th>
            </tr>
          </thead>
          <tbody>
            {waybills.map((wb, i) => (
              <tr key={wb.waybillNo}>
                <td className="border border-gray-400 p-1.5 text-center">{i + 1}</td>
                <td className="border border-gray-400 p-1.5 text-xs">{wb.waybillNo.slice(-6)}</td>
                <td className="border border-gray-400 p-1.5">{wb.receiverName}</td>
                <td className="border border-gray-400 p-1.5 text-xs">{wb.receiverAddress}</td>
                <td className="border border-gray-400 p-1.5 text-xs">{wb.receiverPhone}</td>
                <td className="border border-gray-400 p-1.5 text-center">{wb.packageCount}</td>
                <td className="border border-gray-400 p-1.5 text-center">
                  <span className={`px-1 rounded text-xs ${TEMPERATURE_MAP[wb.temperatureLayer]?.bgColor || ''}`}>
                    {wb.temperatureLayer}
                  </span>
                </td>
                <td className="border border-gray-400 p-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 汇总 */}
        <div className="mt-4 flex gap-8 text-sm">
          <div>
            <span className="text-gray-500">各温层统计：</span>
            {Object.entries(tempCount).map(([k, v]) => (
              <span key={k} className="ml-3">{k} {v}单</span>
            ))}
          </div>
          <div><span className="text-gray-500">总件数：</span>{totalPackages}</div>
          <div><span className="text-gray-500">总重量：</span>{totalWeight}kg</div>
        </div>

        {/* 异常登记栏 */}
        <div className="mt-6 border-t-2 border-gray-800 pt-3">
          <h3 className="font-bold mb-2">异常登记栏</h3>
          <div className="border border-gray-400 rounded min-h-[60px] p-2 text-gray-300 text-sm">
            异常运单号及原因登记：__________________________________
          </div>
        </div>

        {/* 底部签名区 */}
        <div className="mt-6 flex justify-between">
          <div>
            <span className="text-gray-500">司机签名：</span>
            <span className="inline-block w-32 border-b border-gray-400 ml-2"></span>
          </div>
          <div>
            <span className="text-gray-500">日期：</span>
            <span className="inline-block w-24 border-b border-gray-400 ml-2"></span>
          </div>
        </div>
      </div>
    </div>
  )
}
