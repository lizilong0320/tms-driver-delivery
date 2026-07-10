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
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDateTime, STATUS_MAP, TEMPERATURE_MAP } from '@/lib/utils';

interface Waybill {
  id: number;
  waybillNo: string;
  status: number;
  shipper?: { name: string };
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  temperatureLayer: string;
  weight: number;
  itemType: string;
  packageCount: number;
  createdAt: string;
}

interface Shipper {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
  address?: string;
  city?: string;
}

interface ImportPreviewRow {
  index: number;
  waybillNo: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  temperatureLayer: string;
  weight: number;
  packageCount: number;
  itemType: string;
  hasError: boolean;
}

export default function WaybillsPage() {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tempFilter, setTempFilter] = useState('');

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; messages: string[] }[]>([]);
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const [form, setForm] = useState({
    waybillNo: '',
    warehouseId: '',
    shipperId: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    temperatureLayer: '',
    weight: '',
    itemType: '',
    packageCount: '',
    remark: '',
  });

  const selectedWarehouse = warehouses.find((w) => String(w.id) === form.warehouseId);

  const fetchWaybills = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (keyword) params.set('keyword', keyword);
    if (statusFilter) params.set('status', statusFilter);
    if (tempFilter) params.set('temperatureLayer', tempFilter);

    fetch(`/api/waybills?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then((d) => {
        setWaybills(d.list || d.data || []);
        setTotal(d.total || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, pageSize, keyword, statusFilter, tempFilter]);

  useEffect(() => {
    fetchWaybills();
  }, [fetchWaybills]);

  useEffect(() => {
    fetch('/api/shippers')
      .then((r) => r.json())
      .then(setShippers)
      .catch(() => {});
    fetch('/api/warehouses')
      .then((r) => r.json())
      .then(setWarehouses)
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({
      waybillNo: '',
      warehouseId: '',
      shipperId: '',
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      temperatureLayer: '',
      weight: '',
      itemType: '',
      packageCount: '',
      remark: '',
    });
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const payload: any = {
        ...form,
        warehouseId: Number(form.warehouseId),
        shipperId: Number(form.shipperId),
        weight: Number(form.weight),
        packageCount: Number(form.packageCount),
        pickupAddress: selectedWarehouse?.address || '',
      };
      if (!payload.waybillNo) delete payload.waybillNo;

      const res = await fetch('/api/waybills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('创建失败');
      setDialogOpen(false);
      resetForm();
      fetchWaybills();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该运单？')) return;
    try {
      const res = await fetch(`/api/waybills/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      fetchWaybills();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/waybills/template');
      if (!res.ok) throw new Error('下载失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '运单导入模板.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || '下载模板失败');
    }
  };

  // Import step 1: upload and preview
  const handleImportUpload = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/waybills/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解析失败');

      setImportPreview(data.rows || []);
      setImportErrors(data.errors || []);
      // Auto-select all valid rows
      const validIndexes = (data.rows || [])
        .filter((r: ImportPreviewRow) => !r.hasError)
        .map((r: ImportPreviewRow) => r.index);
      setImportSelected(new Set(validIndexes));
      setImportStep('preview');
    } catch (err: any) {
      alert(err.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  // Import step 2: confirm and write
  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('confirm', 'true');
      fd.append('selected', JSON.stringify(Array.from(importSelected)));
      const res = await fetch('/api/waybills/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '导入失败');

      setImportResult({ imported: data.imported, total: data.total, errors: data.errors || [] });
      setImportStep('done');
      fetchWaybills();
    } catch (err: any) {
      alert(err.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const toggleImportRow = (idx: number) => {
    setImportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const resetImport = () => {
    setImportStep('upload');
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportSelected(new Set());
    setImportResult(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">运单管理</h1>
        <div className="flex gap-2">
          {/* 批量导入 Dialog */}
          <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) resetImport(); }}>
            <DialogTrigger asChild>
              <Button variant="outline">批量导入</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {importStep === 'upload' && '批量导入运单'}
                  {importStep === 'preview' && '预览导入数据'}
                  {importStep === 'done' && '导入完成'}
                </DialogTitle>
              </DialogHeader>

              {/* Step 1: Upload */}
              {importStep === 'upload' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      📥 下载模板
                    </Button>
                    <span className="text-sm text-gray-500">先下载模板，按格式填写后上传</span>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-gray-600 mb-4">选择 Excel 文件（.xlsx / .xls）</p>
                    <label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setImportFile(file);
                        }}
                        className="hidden"
                      />
                      <Button asChild>
                        <span>选择文件</span>
                      </Button>
                    </label>
                    {importFile && (
                      <p className="mt-3 text-sm text-green-600 font-medium">
                        已选择: {importFile.name}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setImportOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleImportUpload} disabled={!importFile || importing}>
                      {importing ? '解析中...' : '下一步：预览'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {importStep === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      共 {importPreview.length} 条数据，
                      <span className="text-red-500 ml-1">{importErrors.length} 条有误</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportSelected(new Set(importPreview.filter((r) => !r.hasError).map((r) => r.index)))}
                      >
                        全选有效
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportSelected(new Set())}
                      >
                        取消全选
                      </Button>
                    </div>
                  </div>

                  {/* Error messages */}
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                      {importErrors.map((err, i) => (
                        <div key={i} className="text-xs text-red-600">
                          第{err.row}行: {err.messages.join('、')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b text-left">
                          <th className="py-2 px-3 w-10">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setImportSelected(new Set(importPreview.filter((r) => !r.hasError).map((r) => r.index)));
                                } else {
                                  setImportSelected(new Set());
                                }
                              }}
                              checked={
                                importPreview.filter((r) => !r.hasError).length > 0 &&
                                importPreview.filter((r) => !r.hasError).every((r) => importSelected.has(r.index))
                              }
                            />
                          </th>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">运单号</th>
                          <th className="py-2 px-3">收件人</th>
                          <th className="py-2 px-3">电话</th>
                          <th className="py-2 px-3">温层</th>
                          <th className="py-2 px-3">重量</th>
                          <th className="py-2 px-3">件数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row) => (
                          <tr
                            key={row.index}
                            className={cn(
                              'border-b last:border-0',
                              row.hasError && 'bg-red-50',
                            )}
                          >
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                disabled={row.hasError}
                                checked={importSelected.has(row.index)}
                                onChange={() => toggleImportRow(row.index)}
                              />
                            </td>
                            <td className="py-2 px-3 text-gray-400">{row.index + 2}</td>
                            <td className="py-2 px-3 font-mono text-xs">{row.waybillNo || '(自动)'}</td>
                            <td className="py-2 px-3">{row.receiverName}</td>
                            <td className="py-2 px-3">{row.receiverPhone}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline">{row.temperatureLayer}</Badge>
                            </td>
                            <td className="py-2 px-3">{row.weight}kg</td>
                            <td className="py-2 px-3">{row.packageCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={resetImport}>
                      ← 重新选择文件
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setImportOpen(false)}>
                        取消
                      </Button>
                      <Button
                        onClick={handleImportConfirm}
                        disabled={importSelected.size === 0 || importing}
                      >
                        {importing ? '导入中...' : `确认导入 (${importSelected.size} 条)`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Done */}
              {importStep === 'done' && importResult && (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-xl p-6 text-center">
                    <div className="text-5xl mb-3">✅</div>
                    <div className="text-xl font-bold text-green-700">导入完成</div>
                    <div className="text-sm text-green-600 mt-1">
                      成功导入 {importResult.imported}/{importResult.total} 条
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-xs text-red-600">{err}</div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setImportOpen(false);
                        resetImport();
                      }}
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 新增运单 Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); }}>新增运单</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新增运单</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>运单号（不填自动生成）</Label>
                  <Input
                    value={form.waybillNo}
                    onChange={(e) => setForm({ ...form, waybillNo: e.target.value })}
                    placeholder="如 ZT20260708001，留空则自动生成"
                  />
                </div>
                <div className="space-y-1">
                  <Label>仓库 *</Label>
                  <Select
                    value={form.warehouseId}
                    onValueChange={(v) => setForm({ ...form, warehouseId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择仓库" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>提货地址（自动从仓库带入）</Label>
                  <Input
                    value={selectedWarehouse?.address || ''}
                    readOnly
                    placeholder="选择仓库后自动带入"
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label>货主 *</Label>
                  <Select
                    value={form.shipperId}
                    onValueChange={(v) => setForm({ ...form, shipperId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择货主" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>收件人 *</Label>
                  <Input
                    value={form.receiverName}
                    onChange={(e) =>
                      setForm({ ...form, receiverName: e.target.value })
                    }
                    placeholder="收件人姓名"
                  />
                </div>
                <div className="space-y-1">
                  <Label>收件人电话 *</Label>
                  <Input
                    value={form.receiverPhone}
                    onChange={(e) =>
                      setForm({ ...form, receiverPhone: e.target.value })
                    }
                    placeholder="手机号"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>送货地址 *</Label>
                  <Input
                    value={form.receiverAddress}
                    onChange={(e) =>
                      setForm({ ...form, receiverAddress: e.target.value })
                    }
                    placeholder="详细送货地址"
                  />
                </div>
                <div className="space-y-1">
                  <Label>温层 *</Label>
                  <Select
                    value={form.temperatureLayer}
                    onValueChange={(v) =>
                      setForm({ ...form, temperatureLayer: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择温层" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(TEMPERATURE_MAP).map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>物品类型</Label>
                  <Input
                    value={form.itemType}
                    onChange={(e) =>
                      setForm({ ...form, itemType: e.target.value })
                    }
                    placeholder="如：生鲜、药品"
                  />
                </div>
                <div className="space-y-1">
                  <Label>重量(kg)</Label>
                  <Input
                    type="number"
                    value={form.weight}
                    onChange={(e) =>
                      setForm({ ...form, weight: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>件数</Label>
                  <Input
                    type="number"
                    value={form.packageCount}
                    onChange={(e) =>
                      setForm({ ...form, packageCount: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>备注</Label>
                  <Textarea
                    value={form.remark}
                    onChange={(e) =>
                      setForm({ ...form, remark: e.target.value })
                    }
                    placeholder="备注信息（选填）"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? '提交中...' : '确认创建'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="搜索运单号/收件人..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-60"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={tempFilter}
              onValueChange={(v) => { setTempFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部温层" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部温层</SelectItem>
                {Object.keys(TEMPERATURE_MAP).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setKeyword(''); setStatusFilter(''); setTempFilter(''); setPage(1); }}>
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
                      <th className="py-2 whitespace-nowrap">运单号</th>
                      <th className="py-2 whitespace-nowrap">货主</th>
                      <th className="py-2 whitespace-nowrap">收件人</th>
                      <th className="py-2 whitespace-nowrap">地址</th>
                      <th className="py-2 whitespace-nowrap">温层</th>
                      <th className="py-2 whitespace-nowrap">件数</th>
                      <th className="py-2 whitespace-nowrap">重量</th>
                      <th className="py-2 whitespace-nowrap">状态</th>
                      <th className="py-2 whitespace-nowrap">创建时间</th>
                      <th className="py-2 whitespace-nowrap text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waybills.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      waybills.map((wb) => {
                        const statusInfo = STATUS_MAP[wb.status] || { label: '未知', color: '' };
                        const tempInfo = TEMPERATURE_MAP[wb.temperatureLayer];
                        return (
                          <tr key={wb.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2.5 font-mono text-sm">{wb.waybillNo}</td>
                            <td className="py-2.5">{wb.shipper?.name || (wb as any).shipperName || '-'}</td>
                            <td className="py-2.5">{wb.receiverName}</td>
                            <td className="py-2.5 max-w-[140px] truncate" title={wb.receiverAddress}>
                              {wb.receiverAddress}
                            </td>
                            <td className="py-2.5">
                              {tempInfo ? (
                                <Badge
                                  variant="outline"
                                  className={cn(tempInfo.bgColor, tempInfo.color)}
                                >
                                  {tempInfo.label}
                                </Badge>
                              ) : (
                                wb.temperatureLayer
                              )}
                            </td>
                            <td className="py-2.5">{wb.packageCount}</td>
                            <td className="py-2.5">{wb.weight}kg</td>
                            <td className="py-2.5">
                              <Badge
                                variant="outline"
                                style={{ color: statusInfo.color, borderColor: statusInfo.color }}
                              >
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-muted-foreground text-xs">
                              {formatDateTime(wb.createdAt)}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap">
                              <a
                                href={`/waybills/${wb.id}`}
                                className="text-blue-600 hover:underline mr-3"
                              >
                                查看
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDelete(wb.id)}
                              >
                                删除
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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
