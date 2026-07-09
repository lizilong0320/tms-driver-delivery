'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PrintPage() {
  const { batchId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/batches/${batchId}`)
      .then(r => r.json()).then(d => { if (d.error) { setData(null); } else { setData(d.data || d); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>加载中...</p></div>;
  if (!data || data.error) return <div className="flex items-center justify-center min-h-screen"><p>批次不存在</p></div>;

  const batch = data.data || data;
  const waybills = batch.waybills || [];
  const tempCounts: Record<string, number> = {};
  let totalW = 0, totalP = 0;
  waybills.forEach((w: any) => {
    tempCounts[w.temperatureLayer] = (tempCounts[w.temperatureLayer] || 0) + 1;
    totalW += w.weight || 0;
    totalP += w.packageCount || 0;
  });

  const reportStatus = (s: number) => s === 3 ? '已签' : s === 4 ? '异常' : '';

  return (
    <div className="print-area p-4 max-w-[210mm] mx-auto text-[12px] leading-relaxed">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-3">
        <h1 className="text-lg font-bold">中通冷链 · 城配派送单</h1>
        <div className="flex justify-between mt-1">
          <span>批次号: {batch.batchNo}</span>
          <span>日期: {new Date(batch.deliveryDate).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>

      {/* Driver Info */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm font-bold">
        <div>司机: {batch.driverName}</div>
        <div>车牌: {batch.plateNo || '-'}</div>
        <div>电话: {batch.driverPhone}</div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-black mb-3">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-1 py-1 w-8">序号</th>
            <th className="border border-black px-1 py-1">收件人</th>
            <th className="border border-black px-1 py-1">电话</th>
            <th className="border border-black px-1 py-1">地址</th>
            <th className="border border-black px-1 py-1 w-10">温层</th>
            <th className="border border-black px-1 py-1 w-8">件</th>
            <th className="border border-black px-1 py-1 w-10">重量</th>
            <th className="border border-black px-1 py-1 w-12">签收栏</th>
          </tr>
        </thead>
        <tbody>
          {waybills.map((wb: any, i: number) => (
            <tr key={wb.id} className={wb.status === 3 ? 'bg-green-50' : wb.status === 4 ? 'bg-red-50' : ''}>
              <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
              <td className="border border-black px-1 py-1">{wb.receiverName}</td>
              <td className="border border-black px-1 py-1 text-[10px]">{wb.receiverPhone}</td>
              <td className="border border-black px-1 py-1 text-[10px]">{wb.receiverAddress?.slice(0, 30)}</td>
              <td className="border border-black px-1 py-1 text-center text-[10px]">{wb.temperatureLayer}</td>
              <td className="border border-black px-1 py-1 text-center">{wb.packageCount}</td>
              <td className="border border-black px-1 py-1 text-center">{wb.weight}</td>
              <td className="border border-black px-1 py-1 text-center min-w-[50px]">{reportStatus(wb.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-between text-sm mb-3 border-b border-black pb-2">
        <div><strong>总单数:</strong> {waybills.length}</div>
        <div><strong>总件数:</strong> {totalP}</div>
        <div><strong>总重量:</strong> {totalW.toFixed(1)} kg</div>
        {Object.entries(tempCounts).map(([k, v]) => (
          <div key={k}><strong>{k}:</strong> {v}单</div>
        ))}
      </div>

      {/* Exception Log */}
      <div className="text-sm">
        <div className="font-bold mb-1">异常登记栏:</div>
        <div className="border border-black min-h-[60px] p-2 text-gray-400">
          异常单号 + 原因: __________________________________________________
        </div>
      </div>

      {/* Print button - hidden in print */}
      <div className="no-print mt-4 text-center">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-bold">
          🖨️ 打印派送单
        </button>
      </div>
    </div>
  );
}
