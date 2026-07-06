'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  totalToday: number;
  finishedToday: number;
  inProgress: number;
  exceptionToday: number;
  trend: { date: string; total: number; finished: number }[];
  driverRank: { name: string; plateNo: string; count: number }[];
  tempStats: { temperatureLayer: string; _count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">数据概览</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">数据概览</h1>
        <Card>
          <CardContent className="py-10 text-center text-red-500">
            加载失败：{error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">数据概览</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              今日总单量
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalToday}</div>
            <p className="text-xs text-muted-foreground mt-1">今日运单总量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              今日已完成
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.finishedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              已完成 {data.totalToday > 0 ? Math.round((data.finishedToday / data.totalToday) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              配送中
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">正在配送中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              异常单
            </CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.exceptionToday}</div>
            <p className="text-xs text-muted-foreground mt-1">今日异常运单</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">近7日配送趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="total" name="总单量" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="finished" name="已完成" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Temperature Stats */}
      {data.tempStats && data.tempStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">温层分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {data.tempStats.map((t) => (
                <div key={t.temperatureLayer} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      t.temperatureLayer === '冷冻' && 'border-blue-400 text-blue-600',
                      t.temperatureLayer === '冷藏' && 'border-cyan-400 text-cyan-600',
                      t.temperatureLayer === '常温' && 'border-gray-400 text-gray-600'
                    )}
                  >
                    {t.temperatureLayer}
                  </Badge>
                  <span className="text-lg font-semibold">{t._count} 单</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">司机配送排行榜</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 w-12">排名</th>
                <th className="py-2">司机</th>
                <th className="py-2">车牌号</th>
                <th className="py-2 text-right">配送单数</th>
              </tr>
            </thead>
            <tbody>
              {data.driverRank.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.driverRank.map((d, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2.5">
                      {idx < 3 ? (
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold',
                            idx === 0 && 'bg-amber-500',
                            idx === 1 && 'bg-slate-400',
                            idx === 2 && 'bg-orange-400'
                          )}
                        >
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-muted-foreground ml-1.5">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 font-medium">{d.name}</td>
                    <td className="py-2.5 text-muted-foreground">{d.plateNo}</td>
                    <td className="py-2.5 text-right font-medium">{d.count} 单</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
