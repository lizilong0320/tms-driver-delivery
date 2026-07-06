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
  BATCH_STATUS_MAP,
} from '@/lib/utils';

interface BatchDetail {
  id: number;
  batchNo: string;
  status: number;
  deliveryDate: string;
  driver?: { id: number; name: string; plateNo: string; phone?: string };
  waybills?: {
    id: number;
    waybillNo: string;
    receiverName: string;
    receiverAddress: string;
    temperatureLayer: string;
    status: number;
  }[];
  totalCount?: number;
  finishedCount?: number;
}

interface PrintData {
  batch: BatchDetail;
  tempCount: Record<string, number>;
  totalWeight: number;
  totalPackages: number;
}

export default function BatchDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    fetch(`/api/batches/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = async () => {
    try {
      const res = await fetch(`/api/batches/${id}/print`);
      if (!res.ok) throw new Error('获取打印数据失败');
      const d = await res.json();
      setPrintData(d);
      setShowPrint(true);
    } catch (err: any) {
      alert(err.message || '获取打印数据失败');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-red-500">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Print view
  if (showPrint && printData) {
    return (
      <div className="p-8 print-view">
        <div className="flex items-center justify-between mb-6 no-print">
          <Button variant="outline" onClick={() => setShowPrint(false)}>
            &larr; 返回
          </Button>
          <Button onClick={() => window.print()}>打印</Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-center mb-2">配送派送单</h1>
          <p className="text-center text-sm text-muted-foreground mb-6">
            打印时间：{formatDateTime(new Date().toISOString())}
          </p>

          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">批次号</span>
                  <p className="font-mono font-medium">{printData.batch.batchNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">司机</span>
                  <p className="font-medium">{printData.batch.driver?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">配送日期</span>
                  <p>{printData.batch.deliveryDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">车牌号</span>
                  <p>{printData.batch.driver?.plateNo}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-sm">
                <div className="text-center">
                  <span className="text-muted-foreground">总单数</span>
                  <p className="text-2xl font-bold">{printData.batch.totalCount}</p>
                </div>
                <div className="text-center">
                  <span className="text-muted-foreground">总重量</span>
                  <p className="text-2xl font-bold">{printData.totalWeight}kg</p>
                </div>
                <div className="text-center">
                  <span className="text-muted-foreground">总件数</span>
                  <p className="text-2xl font-bold">{printData.totalPackages}</p>
                </div>
              </div>
              {/* Temp stats */}
              {Object.keys(printData.tempCount).length > 0 && (
                <div className="flex gap-4 mt-3 pt-3 border-t text-sm">
                  {Object.entries(printData.tempCount).map(([k, v]) => (
                    <Badge key={k} variant="outline">
                      {k}: {v}单
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-3 w-10">序号</th>
                    <th className="p-3">运单号</th>
                    <th className="p-3">收件人</th>
                    <th className="p-3">地址</th>
                    <th className="p-3">温层</th>
                    <th className="p-3">签收</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.batch.waybills?.map((wb, idx) => (
                    <tr key={wb.id} className="border-t">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3 font-mono text-xs">{wb.waybillNo}</td>
                      <td className="p-3">{wb.receiverName}</td>
                      <td className="p-3 text-xs">{wb.receiverAddress}</td>
                      <td className="p-3">{wb.temperatureLayer}</td>
                      <td className="p-3">
                        <div className="border border-dashed rounded w-16 h-8" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <style jsx global>{`
            @media print {
              .no-print { display: none !important; }
              body { font-size: 12px; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const batchStatus = BATCH_STATUS_MAP[data.status] || { label: '未知', color: '#666' };
  const progress =
    data.totalCount && data.totalCount > 0
      ? Math.round(((data.finishedCount || 0) / data.totalCount) * 100)
      : 0;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/batches" className="text-blue-600 hover:underline text-sm">
            &larr; 返回列表
          </a>
          <h1 className="text-2xl font-bold">批次详情</h1>
          <Badge
            variant="outline"
            style={{ color: batchStatus.color, borderColor: batchStatus.color }}
          >
            {batchStatus.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            打印派送单
          </Button>
        </div>
      </div>

      {/* Batch Header */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">批次号</span>
              <p className="font-mono font-medium mt-1">{data.batchNo}</p>
            </div>
            <div>
              <span className="text-muted-foreground">司机</span>
              <p className="font-medium mt-1">{data.driver?.name || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">车牌号</span>
              <p className="mt-1">{data.driver?.plateNo || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">配送日期</span>
              <p className="mt-1">{data.deliveryDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">配送进度</span>
              <p className="mt-1 font-medium">
                {data.finishedCount ?? 0} / {data.totalCount ?? 0}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>完成率</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">配送轨迹</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 mx-auto mb-2 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p>地图展示区域</p>
              <p className="text-xs mt-1">集成地图SDK后可显示实时配送轨迹</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waybill List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">运单列表 ({data.waybills?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left text-muted-foreground">
                  <th className="p-3 w-12">序号</th>
                  <th className="p-3">运单号</th>
                  <th className="p-3">收件人</th>
                  <th className="p-3">地址</th>
                  <th className="p-3">温层</th>
                  <th className="p-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {!data.waybills || data.waybills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      暂无运单
                    </td>
                  </tr>
                ) : (
                  data.waybills.map((wb, idx) => {
                    const ws = STATUS_MAP[wb.status] || { label: '未知', color: '#666' };
                    const wt = TEMPERATURE_MAP[wb.temperatureLayer];
                    return (
                      <tr key={wb.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">{idx + 1}</td>
                        <td className="p-3">
                          <a
                            href={`/waybills/${wb.id}`}
                            className="font-mono text-xs text-blue-600 hover:underline"
                          >
                            {wb.waybillNo}
                          </a>
                        </td>
                        <td className="p-3">{wb.receiverName}</td>
                        <td className="p-3 text-xs max-w-[180px] truncate" title={wb.receiverAddress}>
                          {wb.receiverAddress}
                        </td>
                        <td className="p-3">
                          {wt ? (
                            <Badge
                              variant="outline"
                              className={cn(wt.bgColor, wt.color)}
                            >
                              {wt.label}
                            </Badge>
                          ) : (
                            wb.temperatureLayer
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            style={{ color: ws.color, borderColor: ws.color }}
                          >
                            {ws.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
