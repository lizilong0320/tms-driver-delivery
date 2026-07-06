'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { cn, formatDateTime, STATUS_MAP, TEMPERATURE_MAP } from '@/lib/utils';

interface WaybillDetail {
  id: string;
  waybillNo: string;
  status: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverLng?: number;
  receiverLat?: number;
  shipperName: string;
  temperatureType: string;
  goodsType: string;
  packageCount: number;
  weight: number;
  codAmount?: number;
  signRequirement?: string;
  remark?: string;
  signRecord?: {
    type: string;
    signTime: string;
    proxyName?: string;
    proxyRelation?: string;
    photos?: string[];
    signature?: string;
  };
  exceptionRecord?: {
    type: string;
    description: string;
    createdAt: string;
    photos?: string[];
  };
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [waybill, setWaybill] = useState<WaybillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [arrived, setArrived] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWaybill = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/waybills/${id}`);
      if (!res.ok) throw new Error('获取运单信息失败');
      const data = await res.json();
      setWaybill(data);
      // If status is 配送中, check route state or assume not arrived yet
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWaybill();
  }, [fetchWaybill]);

  const handleArrived = () => {
    setArrived(true);
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

  if (error || !waybill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-5xl mb-4">😢</div>
        <p className="text-gray-600 text-lg mb-4 text-center">{error || '运单不存在'}</p>
        <button
          onClick={fetchWaybill}
          className="px-8 py-3 bg-[#07C160] text-white text-lg rounded-xl font-medium"
        >
          重试
        </button>
      </div>
    );
  }

  const tempInfo = TEMPERATURE_MAP[waybill.temperatureType] || {
    label: waybill.temperatureType,
    color: '#666',
    bgColor: '#F0F0F0',
  };
  const statusInfo = STATUS_MAP[waybill.status] || { label: '未知', color: '#999' };

  const infoRows = [
    { label: '货主', value: waybill.shipperName },
    {
      label: '温层',
      value: (
        <span
          className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: tempInfo.bgColor, color: tempInfo.color }}
        >
          {tempInfo.label}
        </span>
      ),
    },
    { label: '物品类型', value: waybill.goodsType },
    { label: '件数', value: `${waybill.packageCount} 件` },
    { label: '重量', value: `${waybill.weight} kg` },
    ...(waybill.codAmount && waybill.codAmount > 0
      ? [{ label: '代收金额', value: `¥${waybill.codAmount.toFixed(2)}` }]
      : []),
    ...(waybill.signRequirement
      ? [{ label: '签收要求', value: waybill.signRequirement }]
      : []),
    ...(waybill.remark ? [{ label: '备注', value: waybill.remark }] : []),
  ];

  return (
    <div className="pb-6">
      {/* 运单号 + 状态 */}
      <div className="bg-white mx-4 mt-4 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">运单号</p>
            <p className="text-lg font-bold text-gray-900">{waybill.waybillNo}</p>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              backgroundColor: statusInfo.color + '18',
              color: statusInfo.color,
            }}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* 收件人信息 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <p className="text-xs text-gray-400 mb-3">收件人信息</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl font-bold text-gray-900">{waybill.receiverName}</span>
          <a
            href={`tel:${waybill.receiverPhone}`}
            className="flex items-center gap-1 text-[#1677FF] text-base underline"
          >
            📞 {waybill.receiverPhone}
          </a>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{waybill.receiverAddress}</p>
      </div>

      {/* 导航按钮 */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => {
            if (waybill.receiverLng && waybill.receiverLat) {
              window.open(
                `https://uri.amap.com/navigation?to=${waybill.receiverLng},${waybill.receiverLat}&mode=car`,
                '_blank',
              );
            } else {
              window.open(
                `https://uri.amap.com/navigation?to=${encodeURIComponent(waybill.receiverAddress)}&mode=car`,
                '_blank',
              );
            }
          }}
          className="w-full h-14 rounded-xl bg-[#1677FF] text-white text-lg font-bold flex items-center justify-center gap-2 active:bg-blue-700"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          导航
        </button>
      </div>

      {/* 货物信息 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <p className="text-xs text-gray-400 mb-3">货物信息</p>
        <div className="space-y-2.5">
          {infoRows.map((row, idx) => (
            <div key={idx} className="flex items-center">
              <span className="w-20 text-sm text-gray-500 flex-shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 签收记录 */}
      {waybill.status === 3 && waybill.signRecord && (
        <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-3">签收记录</p>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">签收方式</span>
              <span className="text-sm font-medium text-gray-900">
                {waybill.signRecord.type === 'signature'
                  ? '电子签名'
                  : waybill.signRecord.type === 'photo'
                    ? '拍照签收'
                    : waybill.signRecord.type === 'proxy'
                      ? `代收签收 (${waybill.signRecord.proxyRelation})`
                      : waybill.signRecord.type}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">签收时间</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDateTime(waybill.signRecord.signTime)}
              </span>
            </div>
            {waybill.signRecord.proxyName && (
              <div className="flex items-center">
                <span className="w-20 text-sm text-gray-500">代收人</span>
                <span className="text-sm font-medium text-gray-900">
                  {waybill.signRecord.proxyName}
                </span>
              </div>
            )}
            {waybill.signRecord.signature && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">签名</p>
                <img
                  src={waybill.signRecord.signature}
                  alt="签名"
                  className="max-w-[200px] border border-gray-200 rounded-lg"
                />
              </div>
            )}
            {waybill.signRecord.photos && waybill.signRecord.photos.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">签收照片</p>
                <div className="flex gap-2 flex-wrap">
                  {waybill.signRecord.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`签收照片 ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 异常记录 */}
      {waybill.status === 4 && waybill.exceptionRecord && (
        <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-3">异常记录</p>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">异常类型</span>
              <span className="text-sm font-medium text-red-500">
                {waybill.exceptionRecord.type}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">上报时间</span>
              <span className="text-sm font-medium text-gray-900">
                {formatDateTime(waybill.exceptionRecord.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500 block mb-1">异常描述</span>
              <p className="text-sm text-gray-900">{waybill.exceptionRecord.description}</p>
            </div>
            {waybill.exceptionRecord.photos &&
              waybill.exceptionRecord.photos.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1">异常照片</p>
                  <div className="flex gap-2 flex-wrap">
                    {waybill.exceptionRecord.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={`异常照片 ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* 底部操作按钮 */}
      <div className="mx-4 mt-6 space-y-3">
        {waybill.status === 2 && !arrived && (
          <button
            onClick={handleArrived}
            className="w-full h-14 rounded-xl bg-[#1677FF] text-white text-lg font-bold active:bg-blue-700"
          >
            到达
          </button>
        )}

        {waybill.status === 2 && arrived && (
          <>
            <button
              onClick={() => router.push(`/sign/${waybill.id}`)}
              className="w-full h-14 rounded-xl bg-[#07C160] text-white text-lg font-bold active:bg-green-600"
            >
              正常签收
            </button>
            <button
              onClick={() => router.push(`/sign/${waybill.id}?mode=exception`)}
              className="w-full h-14 rounded-xl bg-[#F5222D] text-white text-lg font-bold active:bg-red-700"
            >
              异常上报
            </button>
          </>
        )}
      </div>

      <div className="h-6" />
    </div>
  );
}
