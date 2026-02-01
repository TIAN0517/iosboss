'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Search,
  Eye,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  Phone,
  User,
  X
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  note: string | null;
  createdAt: string;
  items: any[];
  coupons?: any[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingDialog, setShippingDialog] = useState<Order | null>(null);
  const [cancelDialog, setCancelDialog] = useState<Order | null>(null);
  const [refundDialog, setRefundDialog] = useState<Order | null>(null);
  const [shippingTracking, setShippingTracking] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { variant: 'secondary' as const, label: '待確認' },
      confirmed: { variant: 'default' as const, label: '已確認' },
      shipped: { variant: 'default' as const, label: '已發貨' },
      delivered: { variant: 'default' as const, label: '已送達' },
      cancelled: { variant: 'destructive' as const, label: '已取消' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const config: any = {
      unpaid: { variant: 'destructive' as const, label: '未付款' },
      paid: { variant: 'default' as const, label: '已付款' },
      refunded: { variant: 'secondary' as const, label: '已退款' },
    };
    return <Badge variant={config[status]?.variant || config.unpaid.variant}>{config[status]?.label || '未知'}</Badge>;
  };

  const handleShipOrder = async () => {
    if (!shippingDialog || !shippingTracking || !shippingCarrier) return;

    try {
      const response = await fetch('/api/admin/orders/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: shippingDialog.id,
          trackingNo: shippingTracking,
          carrier: shippingCarrier,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        setShippingDialog(null);
        setShippingTracking('');
        setShippingCarrier('');
      }
    } catch (error) {
      console.error('Failed to ship order:', error);
      alert('發貨失敗');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelDialog) return;

    try {
      const response = await fetch('/api/admin/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cancelDialog.id }),
      });

      if (response.ok) {
        await fetchOrders();
        setCancelDialog(null);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('取消訂單失敗');
    }
  };

  const handleRefund = async () => {
    if (!refundDialog || !refundReason || refundAmount <= 0) return;

    try {
      const response = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: refundDialog.id,
          amount: refundAmount,
          reason: refundReason,
        }),
      });

      if (response.ok) {
        await fetchOrders();
        setRefundDialog(null);
        setRefundReason('');
        setRefundAmount(0);
      }
    } catch (error) {
      console.error('Failed to refund order:', error);
      alert('退款失敗');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">訂單管理</h1>
                <p className="text-xs text-muted-foreground">Order Management</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">訂單總數</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">所有訂單</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">待處理</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">待確認訂單</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已發貨</CardTitle>
              <Truck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.shipped}</div>
              <p className="text-xs text-muted-foreground mt-1">運輸中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總金額</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">NT$ {stats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">累計訂單金額</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">
              <Package className="h-4 w-4 mr-2" />
              訂單列表
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              待處理 ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="shipped">
              <Truck className="h-4 w-4 mr-2" />
              已發貨 ({stats.shipped})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>訂單列表</CardTitle>
                <CardDescription>管理所有訂單</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="搜尋訂單..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Input
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    placeholder="所有狀態"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>訂單編號</TableHead>
                        <TableHead>客戶信息</TableHead>
                        <TableHead>金額</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>付款</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{order.customerName}</div>
                              <div className="text-xs text-muted-foreground">{order.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">NT$ {order.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {order.status === 'confirmed' && (
                                <Button variant="ghost" size="sm" onClick={() => setShippingDialog(order)}>
                                  <Truck className="h-4 w-4" />
                                </Button>
                              )}
                              {(order.status === 'pending' || order.status === 'confirmed') && (
                                <Button variant="ghost" size="sm" onClick={() => setCancelDialog(order)} className="text-red-500">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                              {order.paymentStatus === 'paid' && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setRefundDialog(order);
                                  setRefundAmount(order.totalAmount);
                                }}>
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>待確認訂單</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.filter(o => o.status === 'pending').length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>沒有待確認的訂單</p>
                    </div>
                  ) : (
                    orders.filter(o => o.status === 'pending').map(order => (
                      <Card key={order.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-lg">{order.orderNumber}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleString('zh-TW')}
                              </div>
                            </div>
                            <Badge variant="secondary">待確認</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>客戶姓名</Label>
                                <div className="font-medium">{order.customerName}</div>
                              </div>
                              <div>
                                <Label>聯繫電話</Label>
                                <div className="font-medium">{order.phone}</div>
                              </div>
                            </div>
                            <div>
                              <Label>配送地址</Label>
                              <div className="font-medium flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {order.address}
                              </div>
                            </div>
                            <div>
                              <Label>訂單金額</Label>
                              <div className="font-semibold text-2xl text-blue-600">
                                NT$ {order.totalAmount.toLocaleString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看詳情
                              </Button>
                              <Button variant="outline" className="flex-1" onClick={() => setCancelDialog(order)}>
                                <X className="h-4 w-4 mr-2" />
                                取消訂單
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipped">
            <Card>
              <CardHeader>
                <CardTitle>已發貨訂單</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.filter(o => o.status === 'shipped').length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>沒有已發貨的訂單</p>
                    </div>
                  ) : (
                    orders.filter(o => o.status === 'shipped').map(order => (
                      <Card key={order.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-lg">{order.orderNumber}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleString('zh-TW')}
                              </div>
                            </div>
                            <Badge>已發貨</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看詳情
                              </Button>
                              <Button variant="outline" className="flex-1" onClick={() => {
                                setRefundDialog(order);
                                setRefundAmount(order.totalAmount);
                              }}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                處理退款
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>訂單詳情 - {selectedOrder.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedOrder.status}</Badge>
                  <Badge variant="secondary">{selectedOrder.paymentStatus}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  {new Date(selectedOrder.createdAt).toLocaleString('zh-TW')}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>客戶信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>客戶姓名</Label>
                      <div className="font-medium">{selectedOrder.customerName}</div>
                    </div>
                    <div>
                      <Label>聯繫電話</Label>
                      <div className="font-medium">{selectedOrder.phone}</div>
                    </div>
                    <div className="col-span-2">
                      <Label>配送地址</Label>
                      <div className="font-medium">{selectedOrder.address}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>商品列表</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        {item.imageUrl && (
                          <div className="w-16 h-16 rounded bg-background overflow-hidden">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">數量: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">NT$ {(item.price * item.quantity).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedOrder.note && (
                <div>
                  <Label>備註</Label>
                  <Textarea value={selectedOrder.note} readOnly className="bg-muted" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                關閉
              </Button>
              {selectedOrder.status === 'confirmed' && (
                <Button onClick={() => {
                  setSelectedOrder(null);
                  setShippingDialog(selectedOrder);
                }}>
                  發貨
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Shipping Dialog */}
      {shippingDialog && (
        <Dialog open={!!shippingDialog} onOpenChange={(open) => !open && setShippingDialog(null)}>
          <DialogHeader>
            <DialogTitle>訂單發貨 - {shippingDialog.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>物流公司</Label>
              <Input
                value={shippingCarrier}
                onChange={(e) => setShippingCarrier(e.target.value)}
                placeholder="例如：黑貓宅急便"
              />
            </div>
            <div className="space-y-2">
              <Label>物流單號</Label>
              <Input
                value={shippingTracking}
                onChange={(e) => setShippingTracking(e.target.value)}
                placeholder="請輸入物流單號"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingDialog(null)}>
              取消
            </Button>
            <Button onClick={handleShipOrder} disabled={!shippingTracking || !shippingCarrier}>
              確認發貨
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Cancel Order Dialog */}
      {cancelDialog && (
        <Dialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
          <DialogHeader>
            <DialogTitle>確認取消訂單</DialogTitle>
            <DialogDescription>
              確定要取消訂單「{cancelDialog.orderNumber}」嗎？此操作無法恢復。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder}>
              確認取消
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Refund Dialog */}
      {refundDialog && (
        <Dialog open={!!refundDialog} onOpenChange={(open) => !open && setRefundDialog(null)}>
          <DialogHeader>
            <DialogTitle>處理退款 - {refundDialog.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>退款金額</Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
              />
              <div className="text-sm text-muted-foreground">
                訂單金額: NT$ {refundDialog.totalAmount.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <Label>退款原因 *</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="請說明退款原因"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRefundDialog(null);
              setRefundReason('');
              setRefundAmount(0);
            }}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={!refundReason || refundAmount <= 0}>
              確認退款
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
