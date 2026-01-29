'use client';

import { useState, useEffect } from 'react';
import { useShopOrders, useShopOrder, useUpdateShopOrder } from '@/hooks/useShop';
import { useToast } from '@/hooks/useToast';
import { IOSButton } from './ui/ios-button';
import { Input } from './ui/ios-input';
import { BrandIcon } from './BrandIcon';
import { Pagination } from './ui/Pagination';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-800' },
  processing: { label: '處理中', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: '已出貨', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
};

const statusOptions = [
  { value: '', label: '全部狀態' },
  ...Object.entries(statusLabels).map(([value, { label }]) => ({ value, label })),
];

export function ShopOrderManagement() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data, isLoading, refetch } = useShopOrders({
    page,
    limit: 20,
    status: filterStatus || undefined,
  });
  const { data: orderDetail, isLoading: detailLoading } = useShopOrder(selectedOrder || '');
  const updateOrderMutation = useUpdateShopOrder();
  const { showSuccess, showError, showLoading, dismissToast } = useToast();

  // 統計資料
  const stats = {
    total: data?.pagination.total || 0,
    pending: data?.data.filter((o) => o.status === 'pending').length || 0,
    processing: data?.data.filter((o) => o.status === 'processing').length || 0,
    shipped: data?.data.filter((o) => o.status === 'shipped').length || 0,
    completed: data?.data.filter((o) => o.status === 'completed').length || 0,
  };

  // 篩選訂單
  const filteredOrders = searchQuery
    ? data?.data.filter(
        (order) =>
          order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.contactPhone?.includes(searchQuery)
      ) || data?.data
    : data?.data || [];

  const handleUpdateStatus = (orderNo: string, newStatus: string) => {
    const toastId = showLoading('更新訂單狀態中...');

    updateOrderMutation.mutate(
      { orderNo, status: newStatus },
      {
        onSuccess: () => {
          dismissToast(toastId);
          showSuccess('訂單狀態已更新');
          refetch();
          if (selectedOrder) {
            setSelectedOrder(orderNo);
          }
        },
        onError: (error: Error) => {
          dismissToast(toastId);
          showError(error.message || '更新失敗');
        },
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-easy-title font-bold text-gray-900">
          <BrandIcon size={28} className="inline mr-2" />
          商城訂單管理
        </h1>
        <div className="text-sm text-gray-500">
          總訂單數: {stats.total}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(statusLabels).map(([status, { label, color }]) => {
          const count = data?.data.filter((o) => o.status === status).length || 0;
          return (
            <div
              key={status}
              className={`p-4 rounded-lg ${color} cursor-pointer transition-opacity hover:opacity-80`}
              onClick={() => {
                setFilterStatus(status === filterStatus ? '' : status);
                setPage(1);
              }}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm">{label}</p>
            </div>
          );
        })}
      </div>

      {/* 篩選與搜尋 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setFilterStatus(option.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === option.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <Input
            placeholder="搜尋訂單編號、聯絡人、電話..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* 訂單列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-easy-body text-gray-500">載入中...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <BrandIcon size={48} className="text-gray-300 mb-4" />
          <p className="text-easy-body text-gray-500">尚無訂單</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  訂單編號
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  聯絡人
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  下單時間
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const statusInfo = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100' };
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{order.orderNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{order.contactName || '訪客'}</p>
                      <p className="text-xs text-gray-500">{order.contactPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">NT${order.total}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('zh-TW')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <IOSButton
                          onClick={() => {
                            setSelectedOrder(order.orderNo);
                            setShowDetail(true);
                          }}
                          variant="outline"
                          className="text-xs px-2 py-1"
                        >
                          詳情
                        </IOSButton>
                        {order.status === 'pending' && (
                          <IOSButton
                            onClick={() => handleUpdateStatus(order.orderNo, 'paid')}
                            className="text-xs px-2 py-1 bg-blue-500"
                          >
                            收款
                          </IOSButton>
                        )}
                        {order.status === 'paid' && (
                          <IOSButton
                            onClick={() => handleUpdateStatus(order.orderNo, 'processing')}
                            className="text-xs px-2 py-1"
                          >
                            開始處理
                          </IOSButton>
                        )}
                        {order.status === 'processing' && (
                          <IOSButton
                            onClick={() => handleUpdateStatus(order.orderNo, 'shipped')}
                            className="text-xs px-2 py-1"
                          >
                            出貨
                          </IOSButton>
                        )}
                        {order.status === 'shipped' && (
                          <IOSButton
                            onClick={() => handleUpdateStatus(order.orderNo, 'completed')}
                            className="text-xs px-2 py-1"
                          >
                            完成
                          </IOSButton>
                        )}
                        {(order.status === 'pending' || order.status === 'paid') && (
                          <IOSButton
                            onClick={() => {
                              if (confirm('確定要取消此訂單嗎？')) {
                                handleUpdateStatus(order.orderNo, 'cancelled');
                              }
                            }}
                            className="text-xs px-2 py-1 bg-red-500"
                          >
                            取消
                          </IOSButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分頁 */}
      {data && data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* 訂單詳情 Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDetail(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-easy-heading font-bold">訂單詳情</h2>
              <button onClick={() => setShowDetail(false)} className="p-2">
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-500">載入中...</div>
            ) : orderDetail ? (
              <div className="p-4 space-y-4">
                {/* 基本資訊 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">訂單編號</p>
                      <p className="font-mono font-medium">{orderDetail.orderNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">狀態</p>
                      <select
                        value={orderDetail.status}
                        onChange={(e) => handleUpdateStatus(orderDetail.orderNo, e.target.value)}
                        className="mt-1 px-2 py-1 rounded border text-sm"
                      >
                        {Object.entries(statusLabels).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">下單時間</p>
                      <p>{new Date(orderDetail.createdAt).toLocaleString('zh-TW')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">付款方式</p>
                      <p>
                        {orderDetail.paymentMethod === 'cash' ? '貨到付款' :
                         orderDetail.paymentMethod === 'transfer' ? '銀行轉帳' : 'LINE Pay'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 聯絡資訊 */}
                <div>
                  <h3 className="font-medium mb-2">聯絡與配送資訊</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="text-gray-500">聯絡人：</span>{orderDetail.contactName}</p>
                    <p><span className="text-gray-500">電話：</span>{orderDetail.contactPhone}</p>
                    <p><span className="text-gray-500">配送地址：</span>{orderDetail.deliveryAddress}</p>
                    {orderDetail.deliveryTime && (
                      <p>
                        <span className="text-gray-500">送貨時段：</span>
                        {orderDetail.deliveryTime === 'morning' ? '上午' :
                         orderDetail.deliveryTime === 'afternoon' ? '下午' : '晚上'}
                      </p>
                    )}
                    {orderDetail.note && (
                      <p><span className="text-gray-500">備註：</span>{orderDetail.note}</p>
                    )}
                  </div>
                </div>

                {/* 商品清單 */}
                <div>
                  <h3 className="font-medium mb-2">商品清單</h3>
                  <div className="border rounded-lg overflow-hidden">
                    {orderDetail.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 border-b last:border-b-0"
                      >
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} x NT${item.unitPrice}
                          </p>
                        </div>
                        <span className="font-medium">NT${item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 價格明細 */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">商品小計</span>
                    <span>NT${orderDetail.subtotal}</span>
                  </div>
                  {orderDetail.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>折扣</span>
                      <span>-NT${orderDetail.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">運費</span>
                    <span>{orderDetail.deliveryFee === 0 ? '免運' : `NT${orderDetail.deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>總計</span>
                    <span className="text-orange-500">NT${orderDetail.total}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="p-4 border-t">
              <IOSButton onClick={() => setShowDetail(false)} className="w-full">
                關閉
              </IOSButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
