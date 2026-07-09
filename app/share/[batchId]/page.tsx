'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function SharePage() {
  const { batchId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/batches/${batchId}?public=1`)
      .then(r => r.json()).then(d => { if (d.error) { setData(null); } else { setData(d.data || d); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><p>加载中...</p></div>;
  if (!data || data.error) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-center"><div className="text-5xl mb-4">📋</div><h1 className="text-xl font-bold text-gray-800">派送单不存在</h1><p className="text-gray-500 mt-2">该配送批次可能已被删除</p></div></div>;

  const batch = data.data || data;
  const waybills = batch.waybills || [];
  const tempCounts: Record<string, number> = {};
  let totalW = 0, totalP = 0;
  waybills.forEach((w: any) => { tempCounts[w.temperatureLayer] = (tempCounts[w.temperatureLayer] || 0) + 1; totalW += w.weight || 0; totalP += w.packageCount || 0; });

  const deliveryDateStr = batch.deliveryDate ? new Date(batch.deliveryDate).toLocaleDateString('zh-CN') : '未指定';

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${batchId}` : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white px-4 py-4 sticky top-0 z-10 shadow-md flex items-center justify-between">
        <div><h1 className="text-lg font-bold">🚚 配送派送单</h1><p className="text-sm opacity-80">{batch.batchNo}</p></div>
        <button onClick={() => window.print()} className="bg-white text-green-600 px-4 py-2 rounded-lg font-bold text-sm">🖨️ 打印</button>
      </div>
      <div className="max-w-lg mx-auto p-4">
        {/* Driver card */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div><span className="text-gray-500">司机</span><br/><span className="font-bold">{batch.driverName}</span></div>
            <div><span className="text-gray-500">车牌</span><br/><span className="font-bold">{batch.plateNo || '-'}</span></div>
            <div><span className="text-gray-500">日期</span><br/><span className="font-bold">{deliveryDateStr}</span></div>
          </div>
          <div className="mt-2 text-sm"><span className="text-gray-500">电话: </span><a href={`tel:${batch.driverPhone}`} className="text-blue-600 font-bold">{batch.driverPhone}</a></div>
          <div className="mt-2 flex gap-2 text-xs"><span className="bg-gray-100 px-2 py-1 rounded">总{waybills.length}单</span><span className="bg-gray-100 px-2 py-1 rounded">{totalP}件</span><span className="bg-gray-100 px-2 py-1 rounded">{totalW.toFixed(1)}kg</span></div>
        </div>

        {/* Waybill cards */}
        <div className="space-y-2">
          {waybills.map((wb: any, i: number) => (
            <div key={wb.id} className={`bg-white rounded-xl shadow p-4 border-l-4 ${wb.status === 3 ? 'border-green-500 bg-green-50' : wb.status === 4 ? 'border-red-500 bg-red-50' : 'border-blue-500'}`}>
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${wb.status === 3 ? 'bg-green-500' : wb.status === 4 ? 'bg-red-500' : 'bg-blue-500'}`}>{wb.status === 3 ? '✓' : wb.status === 4 ? '✕' : i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800">{wb.receiverName}</div>
                  <div className="text-xs text-gray-500 mt-0.5"><a href={`tel:${wb.receiverPhone}`} className="text-blue-600 underline">📞 {wb.receiverPhone}</a></div>
                  <div className="text-xs text-gray-500 mt-0.5">📍 {wb.receiverAddress}</div>
                  {wb.warehouse?.address && <div className="text-xs text-gray-400 mt-0.5">🏭 提: {wb.warehouse.name} · {wb.warehouse.address}</div>}
                  <div className="flex gap-2 mt-2 text-xs"><span className="bg-gray-100 px-2 py-0.5 rounded">{wb.temperatureLayer}</span><span className="bg-gray-100 px-2 py-0.5 rounded">{wb.packageCount}件</span><span className="bg-gray-100 px-2 py-0.5 rounded">{wb.weight}kg</span></div>
                  {wb.status === 3 && <div className="text-green-600 text-xs mt-1">✅ 已签收</div>}
                  {wb.status === 4 && <div className="text-red-600 text-xs mt-1">❌ {wb.exceptionType || '异常'}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Copy link */}
        <div className="mt-6 mb-8 text-center">
          <p className="text-xs text-gray-400 mb-2">分享给司机，无需登录即可查看</p>
          <div className="bg-gray-100 rounded-lg p-2 flex items-center gap-2">
            <input className="flex-1 bg-transparent text-xs text-gray-600 outline-none" readOnly value={shareUrl} />
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('已复制'); }} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">复制</button>
          </div>
        </div>
      </div>
    </div>
  );
}
