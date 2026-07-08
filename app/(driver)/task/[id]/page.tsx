'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface StepState {
  arrived: boolean;
  completed: boolean;
  loading: boolean;
}

export default function DriverTaskDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [batch, setBatch] = useState<any>(null);
  const [waybills, setWaybills] = useState<any[]>([]);
  const [steps, setSteps] = useState<Record<number, StepState>>({});
  const [batchStarted, setBatchStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  const loadData = async () => {
    const r = await fetch(`/api/batches/${id}`);
    const d = await r.json();
    const rd = d.data || d;
    if (rd) {
      setBatch(rd.batch || rd);
      const wbs = rd.waybills || [];
      setWaybills(wbs);
      setBatchStarted((rd.batch || rd).status >= 1);

      // Init steps from current state
      const s: Record<number, StepState> = {};
      wbs.forEach((w: any) => {
        s[w.id] = {
          arrived: w.status === 3 || w.status >= 2,
          completed: w.status === 3,
          loading: false,
        };
      });
      setSteps(s);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const startBatch = async () => {
    await fetch(`/api/batches/${id}/start`, { method: 'POST' });
    setBatchStarted(true);
    await loadData();
  };

  const finishBatch = async () => {
    await fetch(`/api/batches/${id}/finish`, { method: 'POST' });
    await loadData();
  };

  const markArrived = async (wbId: number) => {
    setSteps(prev => ({ ...prev, [wbId]: { ...prev[wbId], loading: true } }));
    // Simulate arrive - update waybill status to 2
    await fetch(`/api/waybills/${wbId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 2 }),
    });
    setSteps(prev => ({ ...prev, [wbId]: { arrived: true, completed: prev[wbId]?.completed || false, loading: false } }));
  };

  const markComplete = (wbId: number) => () => {
    router.push(`/(driver)/sign/${wbId}`);
  };

  const markException = (wbId: number) => () => {
    router.push(`/(driver)/sign/${wbId}?mode=exception`);
  };

  const navToAddress = (wb: any) => {
    if (wb.receiverLat && wb.receiverLng) {
      window.open(`https://uri.amap.com/navigation?to=${wb.receiverLng},${wb.receiverLat},${encodeURIComponent(wb.receiverName)}&mode=car&callnative=1`, '_blank');
    } else {
      window.open(`https://uri.amap.com/navigation?to=0,0,${encodeURIComponent(wb.receiverAddress)}&mode=car&callnative=1`, '_blank');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">加载中...</p></div>;
  if (!batch) return <div className="flex items-center justify-center min-h-screen"><p className="text-red-500">批次不存在</p></div>;

  const done = waybills.filter((w: any) => w.status === 3).length;
  const allDone = done === waybills.length && waybills.length > 0;
  const currentWb = waybills[currentTab];
  const shareUrl = `${window.location.origin}/share/${batch.id}`;
  const printUrl = `${window.location.origin}/print/${batch.id}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top Bar */}
      <div className="bg-green-600 text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/(driver)/tasks')} className="text-white text-xl">←</button>
          <div className="flex-1">
            <div className="font-bold">{batch.batchNo}</div>
            <div className="text-xs opacity-80">{batch.driverName} · {batch.plateNo}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-bold">{done}/{waybills.length}</div>
            <div className="opacity-80">已送达</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: waybills.length ? `${Math.round((done / waybills.length) * 100)}%` : '0%' }} />
        </div>
      </div>

      {/* Tab navigation - one tab per stop */}
      {waybills.length > 1 && (
        <div className="bg-white px-2 py-2 sticky top-[88px] z-20 shadow-sm overflow-x-auto">
          <div className="flex gap-1">
            {waybills.map((wb: any, i: number) => (
              <button
                key={wb.id}
                onClick={() => setCurrentTab(i)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === i
                    ? 'bg-green-600 text-white shadow'
                    : wb.status === 3
                      ? 'bg-green-50 text-green-600'
                      : wb.status === 4
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                }`}
              >
                {wb.status === 3 ? '✓' : wb.status === 4 ? '✕' : ''}
                第{i + 1}站
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Stop Detail */}
      {currentWb && (
        <div className="p-4 max-w-lg mx-auto">
          {/* Stop card */}
          <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-t-4 ${
            currentWb.status === 3 ? 'border-green-500' : currentWb.status === 4 ? 'border-red-500' : 'border-green-600'
          }`}>
            {/* Stop number */}
            <div className="bg-gray-50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  currentWb.status === 3 ? 'bg-green-500' : currentWb.status === 4 ? 'bg-red-500' : 'bg-green-600'
                }`}>
                  {currentTab + 1}
                </div>
                <div>
                  <div className="font-bold text-lg">{currentWb.receiverName}</div>
                  <div className="text-xs text-gray-500">
                    {currentWb.status === 3 ? '✅ 已送达' : currentWb.status === 4 ? '❌ 异常' :
                     steps[currentWb.id]?.arrived ? '📍 已到达 · 待签收' : '📍 待前往'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">{currentWb.temperatureLayer}</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Contact */}
              <div className="flex gap-3">
                <a href={`tel:${currentWb.receiverPhone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors">
                  📞 {currentWb.receiverPhone}
                </a>
                <button onClick={() => navToAddress(currentWb)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors">
                  🧭 导航
                </button>
              </div>

              {/* Address */}
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <span className="text-gray-400">📍 </span>{currentWb.receiverAddress}
              </div>

              {/* Cargo info */}
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="bg-gray-100 px-3 py-1 rounded-lg">{currentWb.packageCount}件</span>
                <span className="bg-gray-100 px-3 py-1 rounded-lg">{currentWb.weight}kg</span>
                {currentWb.itemType && <span className="bg-gray-100 px-3 py-1 rounded-lg">{currentWb.itemType}</span>}
                {currentWb.shipper?.name && <span className="bg-gray-100 px-3 py-1 rounded-lg">货主: {currentWb.shipper.name}</span>}
              </div>

              {/* Sign info if completed */}
              {currentWb.status === 3 && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm text-green-700 font-bold">✅ 已签收</div>
                  <div className="text-xs text-green-600 mt-1">
                    {currentWb.signType === 'photo' ? '📷 拍照签收' : '✍️ 签名签收'}
                    {currentWb.signerName ? ` · ${currentWb.signerName}` : ''}
                    {currentWb.signTime ? ` · ${new Date(currentWb.signTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                </div>
              )}

              {currentWb.status === 4 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-sm text-red-700 font-bold">❌ 异常</div>
                  <div className="text-xs text-red-600 mt-1">{currentWb.exceptionType} · {currentWb.exceptionDesc}</div>
                </div>
              )}

              {/* Action buttons */}
              {currentWb.status !== 3 && currentWb.status !== 4 && (
                <div className="space-y-2 pt-2">
                  {!batchStarted && (
                    <button onClick={startBatch}
                      className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors">
                      🚀 开始配送
                    </button>
                  )}

                  {batchStarted && !steps[currentWb.id]?.arrived && (
                    <button onClick={() => markArrived(currentWb.id)}
                      disabled={steps[currentWb.id]?.loading}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors">
                      {steps[currentWb.id]?.loading ? '处理中...' : '📍 到达此站'}
                    </button>
                  )}

                  {batchStarted && steps[currentWb.id]?.arrived && (
                    <div className="flex gap-3">
                      <button onClick={markComplete(currentWb.id)}
                        className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors">
                        ✅ 完成送货
                      </button>
                      <button onClick={markException(currentWb.id)}
                        className="flex-1 py-4 border-2 border-red-500 text-red-500 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors">
                        ❌ 异常
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* All stops summary */}
          <div className="mt-6">
            <h3 className="font-bold text-gray-800 mb-3">配送进度</h3>
            <div className="space-y-2">
              {waybills.map((wb: any, i: number) => (
                <button
                  key={wb.id}
                  onClick={() => setCurrentTab(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    currentTab === i ? 'bg-green-50 border-2 border-green-600' :
                    wb.status === 3 ? 'bg-gray-50 opacity-60' : 'bg-white shadow-sm'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                    wb.status === 3 ? 'bg-green-500' : wb.status === 4 ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {wb.status === 3 ? '✓' : wb.status === 4 ? '✕' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{wb.receiverName}</div>
                    <div className="text-xs text-gray-500 truncate">{wb.receiverAddress}</div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {wb.status === 3 ? '已签收' : wb.status === 4 ? '异常' : '待配送'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* All done */}
          {allDone && waybills.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="bg-green-50 rounded-2xl p-6 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <div className="text-xl font-bold text-green-700">全部配送完成！</div>
                <div className="text-sm text-green-600 mt-1">共 {waybills.length} 站，已全部送达</div>
              </div>
              <button onClick={finishBatch}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors">
                ✅ 确认完成全部配送
              </button>
            </div>
          )}

          {/* Tools */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={printUrl} target="_blank"
              className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl shadow text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              🖨️ 打印派送单
            </a>
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('已复制分享链接！'); }}
              className="flex items-center justify-center gap-2 py-3 bg-white rounded-xl shadow text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              📋 复制分享链接
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
