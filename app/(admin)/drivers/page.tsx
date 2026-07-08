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
import { Label } from '@/components/ui/label';

interface Driver {
  id: number;
  name: string;
  phone: string;
  plateNo?: string;
  vehicleType?: string;
  status?: string;
  identityStatus?: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    name: '',
    password: '',
    plateNo: '',
    vehicleType: '',
    idCard: '',
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    plateNo: '',
    vehicleType: '',
  });

  const fetchDrivers = useCallback(() => {
    setLoading(true);
    fetch('/api/drivers')
      .then((res) => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(setDrivers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const resetForm = () => {
    setForm({ phone: '', name: '', password: '', plateNo: '', vehicleType: '', idCard: '' });
  };

  const handleAdd = async () => {
    if (!form.phone || !form.name || !form.password) {
      alert('请填写必要信息');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '创建失败');
      }
      setAddOpen(false);
      resetForm();
      fetchDrivers();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setEditForm({
      name: driver.name,
      phone: driver.phone,
      plateNo: driver.plateNo || '',
      vehicleType: driver.vehicleType || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingDriver) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('更新失败');
      setEditOpen(false);
      fetchDrivers();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">司机管理</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); }}>新增司机</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新增司机</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>姓名 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="司机姓名"
                />
              </div>
              <div className="space-y-1">
                <Label>手机号 *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="手机号"
                />
              </div>
              <div className="space-y-1">
                <Label>密码 *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="登录密码"
                />
              </div>
              <div className="space-y-1">
                <Label>车牌号</Label>
                <Input
                  value={form.plateNo}
                  onChange={(e) => setForm({ ...form, plateNo: e.target.value })}
                  placeholder="如：京A12345"
                />
              </div>
              <div className="space-y-1">
                <Label>车型</Label>
                <Input
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  placeholder="如：4.2米冷藏车"
                />
              </div>
              <div className="space-y-1">
                <Label>身份证号</Label>
                <Input
                  value={form.idCard}
                  onChange={(e) => setForm({ ...form, idCard: e.target.value })}
                  placeholder="身份证号码"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAdd} disabled={submitting}>
                  {submitting ? '提交中...' : '确认创建'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑司机信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>姓名</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="司机姓名"
              />
            </div>
            <div className="space-y-1">
              <Label>手机号</Label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="手机号"
              />
            </div>
            <div className="space-y-1">
              <Label>车牌号</Label>
              <Input
                value={editForm.plateNo}
                onChange={(e) =>
                  setEditForm({ ...editForm, plateNo: e.target.value })
                }
                placeholder="车牌号"
              />
            </div>
            <div className="space-y-1">
              <Label>车型</Label>
              <Input
                value={editForm.vehicleType}
                onChange={(e) =>
                  setEditForm({ ...editForm, vehicleType: e.target.value })
                }
                placeholder="车型"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {error && (
            <div className="text-red-500 text-center py-4">{error}</div>
          )}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">姓名</th>
                    <th className="py-2">手机号</th>
                    <th className="py-2">车牌号</th>
                    <th className="py-2">车型</th>
                    <th className="py-2">状态</th>
                    <th className="py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    drivers.map((d) => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2.5 font-medium">{d.name}</td>
                        <td className="py-2.5">{d.phone}</td>
                        <td className="py-2.5">{d.plateNo || '-'}</td>
                        <td className="py-2.5">{d.vehicleType || '-'}</td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              d.identityStatus === 'verified'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {d.identityStatus === 'verified' ? '已认证' : '未认证'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => openEdit(d)}
                          >
                            编辑
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
