'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Shipper {
  id: number;
  name: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  createdAt?: string;
}

interface Warehouse {
  id: number;
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  createdAt?: string;
}

export default function SettingsPage() {
  // Shippers
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [shippersLoading, setShippersLoading] = useState(true);
  const [shipperAddOpen, setShipperAddOpen] = useState(false);
  const [shipperForm, setShipperForm] = useState({
    name: '',
    phone: '',
    contactPerson: '',
    address: '',
  });
  const [shipperSubmitting, setShipperSubmitting] = useState(false);

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehouseAddOpen, setWarehouseAddOpen] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phone: '',
  });
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);

  const fetchShippers = useCallback(() => {
    setShippersLoading(true);
    fetch('/api/shippers')
      .then((r) => r.json())
      .then(setShippers)
      .catch(() => {})
      .finally(() => setShippersLoading(false));
  }, []);

  const fetchWarehouses = useCallback(() => {
    setWarehousesLoading(true);
    fetch('/api/warehouses')
      .then((r) => r.json())
      .then(setWarehouses)
      .catch(() => {})
      .finally(() => setWarehousesLoading(false));
  }, []);

  useEffect(() => {
    fetchShippers();
    fetchWarehouses();
  }, [fetchShippers, fetchWarehouses]);

  // Add shipper
  const handleAddShipper = async () => {
    if (!shipperForm.name) {
      alert('请输入货主名称');
      return;
    }
    setShipperSubmitting(true);
    try {
      const res = await fetch('/api/shippers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipperForm),
      });
      if (!res.ok) throw new Error('创建失败');
      setShipperAddOpen(false);
      setShipperForm({ name: '', phone: '', contactPerson: '', address: '' });
      fetchShippers();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setShipperSubmitting(false);
    }
  };

  // Add warehouse
  const handleAddWarehouse = async () => {
    if (!warehouseForm.name) {
      alert('请输入仓库名称');
      return;
    }
    setWarehouseSubmitting(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseForm),
      });
      if (!res.ok) throw new Error('创建失败');
      setWarehouseAddOpen(false);
      setWarehouseForm({ name: '', address: '', contactPerson: '', phone: '' });
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setWarehouseSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">系统设置</h1>

      <Tabs defaultValue="shippers">
        <TabsList>
          <TabsTrigger value="shippers">货主管理</TabsTrigger>
          <TabsTrigger value="warehouses">仓库管理</TabsTrigger>
        </TabsList>

        {/* Shippers Tab */}
        <TabsContent value="shippers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">货主列表</h2>
            <Dialog open={shipperAddOpen} onOpenChange={setShipperAddOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() =>
                    setShipperForm({
                      name: '',
                      phone: '',
                      contactPerson: '',
                      address: '',
                    })
                  }
                >
                  新增货主
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>新增货主</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>货主名称 *</Label>
                    <Input
                      value={shipperForm.name}
                      onChange={(e) =>
                        setShipperForm({ ...shipperForm, name: e.target.value })
                      }
                      placeholder="公司/个人名称"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>联系人</Label>
                    <Input
                      value={shipperForm.contactPerson}
                      onChange={(e) =>
                        setShipperForm({
                          ...shipperForm,
                          contactPerson: e.target.value,
                        })
                      }
                      placeholder="联系人姓名"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>电话</Label>
                    <Input
                      value={shipperForm.phone}
                      onChange={(e) =>
                        setShipperForm({ ...shipperForm, phone: e.target.value })
                      }
                      placeholder="手机号码"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>地址</Label>
                    <Input
                      value={shipperForm.address}
                      onChange={(e) =>
                        setShipperForm({
                          ...shipperForm,
                          address: e.target.value,
                        })
                      }
                      placeholder="公司地址"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShipperAddOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleAddShipper}
                      disabled={shipperSubmitting}
                    >
                      {shipperSubmitting ? '提交中...' : '确认'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-4">
              {shippersLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">编号</th>
                        <th className="py-2">名称</th>
                        <th className="py-2">联系人</th>
                        <th className="py-2">电话</th>
                        <th className="py-2">地址</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shippers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            暂无货主
                          </td>
                        </tr>
                      ) : (
                        shippers.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b last:border-0 hover:bg-muted/50"
                          >
                            <td className="py-2.5 text-muted-foreground">
                              {s.id}
                            </td>
                            <td className="py-2.5 font-medium">{s.name}</td>
                            <td className="py-2.5">
                              {s.contactPerson || '-'}
                            </td>
                            <td className="py-2.5">{s.phone || '-'}</td>
                            <td className="py-2.5 text-xs max-w-[200px] truncate">
                              {s.address || '-'}
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
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">仓库列表</h2>
            <Dialog
              open={warehouseAddOpen}
              onOpenChange={setWarehouseAddOpen}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() =>
                    setWarehouseForm({
                      name: '',
                      address: '',
                      contactPerson: '',
                      phone: '',
                    })
                  }
                >
                  新增仓库
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>新增仓库</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>仓库名称 *</Label>
                    <Input
                      value={warehouseForm.name}
                      onChange={(e) =>
                        setWarehouseForm({
                          ...warehouseForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="仓库名称"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>联系人</Label>
                    <Input
                      value={warehouseForm.contactPerson}
                      onChange={(e) =>
                        setWarehouseForm({
                          ...warehouseForm,
                          contactPerson: e.target.value,
                        })
                      }
                      placeholder="联系人姓名"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>电话</Label>
                    <Input
                      value={warehouseForm.phone}
                      onChange={(e) =>
                        setWarehouseForm({
                          ...warehouseForm,
                          phone: e.target.value,
                        })
                      }
                      placeholder="联系电话"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>地址</Label>
                    <Input
                      value={warehouseForm.address}
                      onChange={(e) =>
                        setWarehouseForm({
                          ...warehouseForm,
                          address: e.target.value,
                        })
                      }
                      placeholder="仓库地址"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setWarehouseAddOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleAddWarehouse}
                      disabled={warehouseSubmitting}
                    >
                      {warehouseSubmitting ? '提交中...' : '确认'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-4">
              {warehousesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">编号</th>
                        <th className="py-2">名称</th>
                        <th className="py-2">联系人</th>
                        <th className="py-2">电话</th>
                        <th className="py-2">地址</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            暂无仓库
                          </td>
                        </tr>
                      ) : (
                        warehouses.map((w) => (
                          <tr
                            key={w.id}
                            className="border-b last:border-0 hover:bg-muted/50"
                          >
                            <td className="py-2.5 text-muted-foreground">
                              {w.id}
                            </td>
                            <td className="py-2.5 font-medium">{w.name}</td>
                            <td className="py-2.5">
                              {w.contactPerson || '-'}
                            </td>
                            <td className="py-2.5">{w.phone || '-'}</td>
                            <td className="py-2.5 text-xs max-w-[200px] truncate">
                              {w.address || '-'}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
