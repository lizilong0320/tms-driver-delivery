'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, STATUS_MAP, TEMPERATURE_MAP } from '@/lib/utils';

interface Waybill {
  id: number;
  sequence: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  temperatureType: string;
  packageCount: number;
  weight: number;
  status: number;
}

interface Batch {
  id: number;
  batchNo: string;
  status: number;
  waybills: Waybill[];
  createdAt: string;
}

interface TaskStats {
  total: number;
  completed: number;
  remaining: number;
}

export default function TasksPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [waybillActionLoading, setWaybillActionLoading] = useState<number | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) throw new Error('获取用户信息失败');
      const user = await userRes.json();
      const driverId = user.driver?.id || user.id;

      const batchesRes = await fetch(`/api/batches?driverId=${driverId}&status=0,1`);
      if (!batchesRes.ok) throw new Error('获取任务列表失败');
      const data = await batchesRes.json();

      const batchList: Batch[] = data.list || data.batches || (Array.isArray(data) ? data : []);

      let total = 0;
      let completed = 0;
      batchList.forEach((b) => {
        if (Array.isArray(b.waybills)) {
          b.waybills.forEach((w: Waybill) => {
            total++;
            if (w.status === 3) completed++;
          });
        }
      });

      setBatches(batchList);
      setStats({
        total,
        completed,
        remaining: total - completed,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleBatchAction = async (batchId: number, action: 'start' | 'finish') => {
    setActionLoading(String(batchId));
    try {
      const res = await fetch(`/api/batches/${batchId}/${action}`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `${action === 'start' ? '开始' : '完成'}配送失败`);
      }
      await fetchTasks();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWaybillAction = async (waybillId: number, action: 'sign' | 'exception') => {
    setWaybillActionLoading(waybillId);
    try {
      const newStatus = action === 'sign' ? 3 : 4;
      const res = await fetch(`/api/waybills/${waybillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(action === 'sign'
            ? { signTime: new Date().toISOString(), signType: 'direct', signerName: '司机' }
            : { exceptionType: '配送异常', exceptionDesc: '司机标记异常' }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || '操作失败');
      }
      await fetchTasks();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setWaybillActionLoading(null);
    }
  };

  const openMap = (address: string, name: string) => {
    window.open(
      `https://uri.amap.com/search?keyword=${encodeURIComponent(address)}&callnative=1`,
      '_blank',
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#07C160] rounded-full animate-spin" />
          <p className="text-gray-500 text-base">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-5xl mb-4">😢</div>
        <p className="text-gray-600 text-lg mb-4 text-center">{error}</p>
        <button
          onClick={fetchTasks}
          className="px-8 py-3 bg-[#07C160] text-white text-lg rounded-xl font-medium"
        >
          重试
        </button>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-gray-500 text-lg mb-2">暂无任务</p>
        <p className="text-gray-400 text-sm">当前没有待处理的配送任务</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* 任务统计 */}
      <div className="bg-white mx-4 mt-4 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center flex-1">
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
            <span className="text-sm text-gray-500 mt-1">今日任务</span>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-2xl font-bold text-[#07C160]">{stats.completed}</span>
            <span className="text-sm text-gray-500 mt-1">已完成</span>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-2xl font-bold text-[#FF6B35]">{stats.remaining}</span>
            <span className="text-sm text-gray-500 mt-1">剩余</span>
          </div>
        </div>
      </div>

      {/* 批次列表 */}
      {batches.map((batch) => (
        <div key={batch.id} className="mx-4 mt-4">
          {/* 批次头 */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">批次</span>
              <span className="text-base font-bold text-gray-900">{batch.batchNo}</span>
            </div>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                batch.status === 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-orange-50 text-orange-600',
              )}
            >
              {batch.status === 0 ? '待配送' : batch.status === 1 ? '配送中' : '已完成'}
            </span>
          </div>

          {/* 运单卡片列表 */}
          <div className="space-y-2.5">
            {batch.waybills?.map((waybill, idx) => {
              const tempInfo = TEMPERATURE_MAP[waybill.temperatureType] || {
                label: waybill.temperatureType,
                color: '#666',
                bgColor: '#F0F0F0',
              };
              const statusInfo = STATUS_MAP[waybill.status] || {
                label: '未知',
                color: '#999',
              };

              return (
                <div
                  key={waybill.id}
                  className="bg-white rounded-xl shadow-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* 序号 */}
                    <div
                      onClick={() => router.push(`/task/${waybill.id}`)}
                      className="flex-shrink-0 w-10 h-10 rounded-full bg-[#07C160] text-white flex items-center justify-center text-lg font-bold cursor-pointer active:bg-green-600"
                    >
                      {waybill.sequence || idx + 1}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer"
                        onClick={() => router.push(`/task/${waybill.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-semibold text-gray-900 truncate">
                            {waybill.receiverName}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                            )}
                            style={{
                              backgroundColor: tempInfo.bgColor,
                              color: tempInfo.color,
                            }}
                          >
                            {tempInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                          <span>📞</span>
                          <a
                            href={`tel:${waybill.receiverPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#1677FF] underline"
                          >
                            {waybill.receiverPhone}
                          </a>
                        </div>

                        <p className="text-sm text-gray-500 mb-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openMap(waybill.receiverAddress, waybill.receiverName);
                            }}
                            className="text-left text-[#1677FF] underline hover:text-blue-800 line-clamp-2"
                          >
                            📍 {waybill.receiverAddress}
                          </button>
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{waybill.packageCount}件</span>
                            <span>{waybill.weight}kg</span>
                          </div>
                          <span
                            className={cn('px-2 py-0.5 rounded text-xs font-medium')}
                            style={{
                              backgroundColor: statusInfo.color + '15',
                              color: statusInfo.color,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      {batch.status === 1 && waybill.status === 2 && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWaybillAction(waybill.id, 'sign');
                            }}
                            disabled={waybillActionLoading === waybill.id}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-sm font-bold transition-colors',
                              waybillActionLoading === waybill.id
                                ? 'bg-green-200 text-green-400'
                                : 'bg-green-50 text-green-600 active:bg-green-100',
                            )}
                          >
                            {waybillActionLoading === waybill.id ? '...' : '✅ 签收'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWaybillAction(waybill.id, 'exception');
                            }}
                            disabled={waybillActionLoading === waybill.id}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-sm font-bold transition-colors',
                              waybillActionLoading === waybill.id
                                ? 'bg-red-200 text-red-400'
                                : 'bg-red-50 text-red-500 active:bg-red-100',
                            )}
                          >
                            {waybillActionLoading === waybill.id ? '...' : '❌ 异常'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 批次操作按钮 */}
          <div className="mt-4">
            {batch.status === 0 && (
              <button
                onClick={() => handleBatchAction(batch.id, 'start')}
                disabled={actionLoading === String(batch.id)}
                className={cn(
                  'w-full h-14 rounded-xl text-white text-lg font-bold flex items-center justify-center gap-2',
                  actionLoading === String(batch.id)
                    ? 'bg-green-400'
                    : 'bg-[#07C160] active:bg-green-600',
                )}
              >
                {actionLoading === String(batch.id) ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    处理中...
                  </>
                ) : (
                  '开始配送'
                )}
              </button>
            )}
            {batch.status === 1 && (
              <button
                onClick={() => handleBatchAction(batch.id, 'finish')}
                disabled={actionLoading === String(batch.id)}
                className={cn(
                  'w-full h-14 rounded-xl text-white text-lg font-bold flex items-center justify-center gap-2',
                  actionLoading === String(batch.id)
                    ? 'bg-orange-400'
                    : 'bg-[#FF6B35] active:bg-orange-600',
                )}
              >
                {actionLoading === String(batch.id) ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    处理中...
                  </>
                ) : (
                  '完成配送'
                )}
              </button>
            )}
          </div>
        </div>
      ))}

      {/* 底部安全距离 */}
      <div className="h-6" />
    </div>
  );
}
