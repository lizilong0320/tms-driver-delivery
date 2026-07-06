'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  cn,
  formatDateTime,
  STATUS_MAP,
  TEMPERATURE_MAP,
} from '@/lib/utils';

interface WaybillDetail {
  id: number;
  waybillNo: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  shipper?: { id: number; name: string; phone?: string };
  warehouse?: { id: number; name: string; address?: string };
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  temperatureLayer: string;
  weight: number;
  itemType: string;
  packageCount: number;
  codAmount?: number;
  signRequirement?: string;
  remark?: string;
  batch?: {
    id: number;
    batchNo: string;
    driver?: { name: string; plateNo: string; phone: string };
    deliveryDate?: string;
  };
  statusLogs?: { status: number; createdAt: string; remark?: string }[];
  signRecords?: { imageUrl: string; type: string }[];
  exceptionLogs?: { reason: string; createdAt: string }[];
}

export default function WaybillDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<WaybillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/waybills/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const statusInfo = STATUS_MAP[data.status] || { label: '未知', color: '#666' };
  const tempInfo = TEMPERATURE_MAP[data.temperatureLayer];

  const statusFlow = [
    { status: 0, label: '待分派', desc: '运单已创建，等待分派' },
    { status: 1, label: '待配送', desc: '已分派，等待司机配送' },
    { status: 2, label: '配送中', desc: '司机正在配送' },
    { status: 3, label: '已签收', desc: '收件人已签收' },
    { status: 4, label: '异常', desc: '配送异常' },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <a href="/waybills" className="text-blue-600 hover:underline text-sm">
          &larr; 返回列表
        </a>
        <h1 className="text-2xl font-bold">运单详情</h1>
        <Badge
          variant="outline"
          style={{ color: statusInfo.color, borderColor: statusInfo.color }}
          className="ml-2"
        >
          {statusInfo.label}
        </Badge>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Waybill Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">运单信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">运单号</span>
              <span className="font-mono font-medium">{data.waybillNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">状态</span>
              <Badge
                variant="outline"
                style={{ color: statusInfo.color, borderColor: statusInfo.color }}
              >
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建时间</span>
              <span>{formatDateTime(data.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">货主</span>
              <span>{data.shipper?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">仓库</span>
              <span>{data.warehouse?.name || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Receiver Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">收件信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">收件人</span>
              <span>{data.receiverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">电话</span>
              <span>{data.receiverPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">地址</span>
              <span className="text-right max-w-[180px]">{data.receiverAddress}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cargo Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">货物信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">温层</span>
              {tempInfo ? (
                <Badge
                  variant="outline"
                  className={cn(tempInfo.bgColor, tempInfo.color)}
                >
                  {tempInfo.label}
                </Badge>
              ) : (
                <span>{data.temperatureLayer}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">物品类型</span>
              <span>{data.itemType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">件数</span>
              <span>{data.packageCount} 件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">重量</span>
              <span>{data.weight} kg</span>
            </div>
            {data.codAmount !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">代收金额</span>
                <span className="font-medium text-orange-600">
                  ¥{data.codAmount.toFixed(2)}
                </span>
              </div>
            )}
            {data.signRequirement && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">签收要求</span>
                <span>{data.signRequirement}</span>
              </div>
            )}
            {data.remark && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">备注</span>
                <span className="text-right max-w-[180px]">{data.remark}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batch Info */}
      {data.batch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">批次/司机信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">批次号</span>
                <p className="font-mono font-medium mt-1">{data.batch.batchNo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">司机</span>
                <p className="font-medium mt-1">{data.batch.driver?.name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">车牌号</span>
                <p className="mt-1">{data.batch.driver?.plateNo || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">配送日期</span>
                <p className="mt-1">{data.batch.deliveryDate || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">状态流转</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {statusFlow.map((step, idx) => {
              const isReached = data.status >= step.status;
              const isCurrent = data.status === step.status;
              const log = data.statusLogs?.find((l) => l.status === step.status);
              return (
                <div key={step.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full border-2',
                        isReached
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      )}
                    />
                    {idx < statusFlow.length - 1 && (
                      <div
                        className={cn(
                          'w-0.5 h-8',
                          data.status > step.status ? 'bg-blue-500' : 'bg-gray-200'
                        )}
                      />
                    )}
                  </div>
                  <div className={cn('pb-4', !isReached && 'opacity-40')}>
                    <p className={cn('text-sm font-medium', isCurrent && 'text-blue-600')}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                    {log && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(log.createdAt)}
                        {log.remark && ` - ${log.remark}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sign Records */}
      {data.signRecords && data.signRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">签收记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.signRecords.map((rec, idx) => (
                <div key={idx} className="border rounded-lg p-3 text-center">
                  <div className="bg-muted rounded aspect-square flex items-center justify-center mb-2">
                    <span className="text-muted-foreground text-xs">
                      {rec.type === 'signature' ? '签名图片' : '拍照图片'}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {rec.type === 'signature' ? '电子签名' : '现场照片'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exception Records */}
      {data.exceptionLogs && data.exceptionLogs.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600">异常记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.exceptionLogs.map((ex, idx) => (
                <div key={idx} className="flex gap-3 text-sm border-b border-red-100 pb-2 last:border-0">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(ex.createdAt)}
                  </span>
                  <span className="text-red-700">{ex.reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
