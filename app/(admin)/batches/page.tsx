'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn, formatDate, BATCH_STATUS_MAP } from '@/lib/utils';

interface Batch {
  id: number;
  batchNo: string;
  status: number;
  driver?: { id: number; name: string; plateNo: string };
  deliveryDate: string;
  totalCount?: number;
  finishedCount?: number;
}

interface Driver {
  id: number;
  name: string;
  plateNo?: string;
}

interface Waybill {
  id: number;
  waybillNo: string;
  receiverName: string;
  receiverAddress: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unassignedWaybills, setUnassignedWaybills] = useState<Waybill[]>([]);
  const [selectedWaybillIds, setSelectedWaybillIds] = useState<number[]>([]);
  const [createForm, setCreateForm] = useState({
    driverId: '',
    deliveryDate: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (dateFilter) params.set('date', dateFilter);
    if (driverFilter) params.set('driverId', driverFilter);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/batches?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then((d) => {
        setBatches(d.list || d.data || []);
        setTotal(d.total || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, pageSize, dateFilter, driverFilter, statusFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    fetch('/api/drivers')
      .then((r) => r.json())
      .then(setDrivers)
      .catch(() => {});
  }, []);

  const openCreateDialog = () => {
    setDialogOpen(true);
    setSelectedWaybillIds([]);
    setCreateForm({
      driverId: '',
      deliveryDate: new Date().toISOString().slice(0, 10),
    });
    // Load unassigned waybills (status=0)
    fetch('/api/waybills?status=0&pageSize=200')
      .then((r) => r.json())
      .then((d) => setUnassignedWaybills(d.list || d.data || []))
      .catch(() => {});
  };

  const handleCreate = async () => {
    if (!createForm.driverId) {
      alert('请选择司机');
      return;
    }
    if (selectedWaybillIds.length === 0) {
      alert('请至少选择一个运单');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: Number(createForm.driverId),
          waybillIds: selectedWaybillIds,
          deliveryDate: createForm.deliveryDate,
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      setDialogOpen(false);
      fetchBatches();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWaybill = (id: number) => {
    setSelectedWaybillIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedWaybillIds.length === unassignedWaybills.length) {
      setSelectedWaybillIds([]);
    } else {
      setSelectedWaybillIds(unassignedWaybills.map((w) => w.id));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">配送批次管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>新建分单</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建配送批次</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>配送日期</Label>
                  <Input
                    type="date"
                    value={createForm.deliveryDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, deliveryDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>选择司机</Label>
                  <Select
                    value={createForm.driverId}
                    onValueChange={(v) =>
                      setCreateForm({ ...createForm, driverId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择司机" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name} {d.plateNo ? `(${d.plateNo})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>选择运单</Label>
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedWaybillIds.length === unassignedWaybills.length
                      ? '取消全选'
                      : '全选'}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  已选 {selectedWaybillIds.length} / {unassignedWaybills.length} 单
                </div>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr className="text-left">
                        <th className="p-2 w-10">
                          <input
                            type="checkbox"
                            checked={
                              selectedWaybillIds.length === unassignedWaybills.length &&
                              unassignedWaybills.length > 0
                            }
                            onChange={toggleAll}
                          />
                        </th>
                        <th className="p-2">运单号</th>
                        <th className="p-2">收件人</th>
                        <th className="p-2">地址</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedWaybills.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            没有待分派的运单
                          </td>
                        </tr>
                      ) : (
                        unassignedWaybills.map((wb) => (
                          <tr key={wb.id} className="border-t hover:bg-muted/50">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedWaybillIds.includes(wb.id)}
                                onChange={() => toggleWaybill(wb.id)}
                              />
                            </td>
                            <td className="p-2 font-mono text-xs">{wb.waybillNo}</td>
                            <td className="p-2">{wb.receiverName}</td>
                            <td className="p-2 text-xs truncate max-w-[200px]" title={wb.receiverAddress}>
                              {wb.receiverAddress}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? '创建中...' : '创建批次'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="w-44"
            />
            <Select
              value={driverFilter}
              onValueChange={(v) => { setDriverFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部司机" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部司机</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(BATCH_STATUS_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setDateFilter('');
                setDriverFilter('');
                setStatusFilter('');
                setPage(1);
              }}
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {error && (
            <div className="text-red-500 text-center py-4">{error}</div>
          )}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2">批次号</th>
                      <th className="py-2">司机</th>
                      <th className="py-2">配送日期</th>
                      <th className="py-2">总单量</th>
                      <th className="py-2">完成单量</th>
                      <th className="py-2">状态</th>
                      <th className="py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      batches.map((b) => {
                        const sInfo = BATCH_STATUS_MAP[b.status] || {
                          label: '未知',
                          color: '#666',
                        };
                        return (
                          <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2.5">
                              <a
                                href={`/batches/${b.id}`}
                                className="font-mono text-sm text-blue-600 hover:underline"
                              >
                                {b.batchNo}
                              </a>
                            </td>
                            <td className="py-2.5">
                              {b.driver?.name || '-'}
                              {b.driver?.plateNo && (
                                <span className="text-muted-foreground text-xs ml-1">
                                  ({b.driver.plateNo})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5">{b.deliveryDate}</td>
                            <td className="py-2.5">{b.totalCount ?? '-'}</td>
                            <td className="py-2.5">{b.finishedCount ?? '-'}</td>
                            <td className="py-2.5">
                              <Badge
                                variant="outline"
                                style={{
                                  color: sInfo.color,
                                  borderColor: sInfo.color,
                                }}
                              >
                                {sInfo.label}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right">
                              <a
                                href={`/batches/${b.id}`}
                                className="text-blue-600 hover:underline mr-3"
                              >
                                查看详情
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    共 {total} 条记录
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 || p === totalPages || Math.abs(p - page) <= 1
                      )
                      .map((p, idx, arr) => (
                        <span key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="px-1 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={p === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        </span>
                      ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
