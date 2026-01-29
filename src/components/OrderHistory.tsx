'use client';

import { useState } from 'react';
import { useShopOrders, useShopOrder } from '@/hooks/useShop';
import { useToast } from '@/hooks/useToast';
import { IOSButton } from './ui/ios-button';
import { BrandIcon } from './BrandIcon';

interface OrderHistoryProps {
  userId?: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-800' },
  processing: { label: '處理中', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: '已出貨', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
};

export function OrderHistory({ userId }: OrderHistoryProps) {
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const { data, isLoading, refetch } = useShopOrders({
    page,
    limit: 10,
    status: filterStatus || undefined,
    userId,
  });
  const { data: orderDetail, isLoading: detailLoading } = useShopOrder(selectedOrder || '');
  const { showError, showSuccess } = useToast();

  const handleViewDetail = (orderNo: string) => {
    setSelectedOrder(orderNo);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-easy-title font-bold text-gray-900">
          <BrandIcon size={28} className="inline mr-2" />
          我的訂單
        </h1>
      </div>

      {/* 狀態篩選 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setFilterStatus(null);
            setPage(1);
            triggerHaptic('light');
          }}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-easy-body font-medium transition-colors ${
            !filterStatus
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          全部
        </button>
        {Object.entries(statusLabels).map(([status, { label }]) => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status);
              setPage(1);
              triggerHaptic('light');
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-easy-body font-medium transition-colors ${
              filterStatus === status
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 訂單列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-easy-body text-gray-500">載入中...</div>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <BrandIcon size={48} className="text-gray-300 mb-4" />
          <p className="text-easy-body text-gray-500">尚無訂單記錄</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((order) => {
            const statusInfo = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100' };
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500">訂單編號</span>
                      <p className="font-mono font-medium">{order.orderNo}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleString('zh-TW')}
                  </p>
                </div>

                <div className="p-4">
                  {/* 訂單項目 */}
                  <div className="space-y-2 mb-4">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} x NT${item.unitPrice}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          NT${item.subtotal}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-sm text-gray-500">
                        還有 {order.items.length - 3} 項商品...
                      </p>
                    )}
                  </div>

                  {/* 總計 */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-sm text-gray-500">
                        配送至: {order.deliveryAddress || '未填寫'}
                      </p>
                      <p className="text-sm text-gray-500">
                        聯絡人: {order.contactName} {order.contactPhone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">總計</p>
                      <p className="text-lg font-bold text-orange-500">NT${order.total}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex gap-2">
                  <IOSButton
                    onClick={() => handleViewDetail(order.orderNo)}
                    className="flex-1"
                    variant="outline"
                  >
                    查看詳情
                  </IOSButton>
                  {order.status === 'pending' && (
                    <IOSButton className="flex-1">立即付款</IOSButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分頁 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <IOSButton
            onClick={() => setPage(page - 1)}
            disabled={!data.pagination.hasPrevPage}
            variant="outline"
          >
            上一頁
          </IOSButton>
          <span className="text-sm text-gray-600">
            第 {page} / {data.pagination.totalPages} 頁
          </span>
          <IOSButton
            onClick={() => setPage(page + 1)}
            disabled={!data.pagination.hasNextPage}
            variant="outline"
          >
            下一頁
          </IOSButton>
        </div>
      )}

      {/* 訂單詳情 Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseDetail}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-easy-heading font-bold">訂單詳情</h2>
              <button onClick={handleCloseDetail} className="p-2">
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-gray-500">載入中...</div>
            ) : orderDetail ? (
              <div className="p-4 space-y-4">
                {/* 基本資訊 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">訂單編號</p>
                      <p className="font-mono font-medium">{orderDetail.orderNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">狀態</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statusLabels[orderDetail.status]?.color || 'bg-gray-100'
                      }`}>
                        {statusLabels[orderDetail.status]?.label || orderDetail.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">下單時間</p>
                      <p>{new Date(orderDetail.createdAt).toLocaleString('zh-TW')}</p>
                    </div>
                    {orderDetail.paymentAt && (
                      <div>
                        <p className="text-sm text-gray-500">付款時間</p>
                        <p>{new Date(orderDetail.paymentAt).toLocaleString('zh-TW')}</p>
                      </div>
                    )}
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
                    <p><span className="text-gray-500">付款方式：</span>
                      {orderDetail.paymentMethod === 'cash' ? '貨到付款' :
                       orderDetail.paymentMethod === 'transfer' ? '銀行轉帳' : 'LINE Pay'}
                    </p>
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

                {orderDetail.note && (
                  <div>
                    <h3 className="font-medium mb-2">備註</h3>
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-4">
                      {orderDetail.note}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="p-4 border-t">
              <IOSButton onClick={handleCloseDetail} className="w-full">
                關閉
              </IOSButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 觸發 haptic feedback
function triggerHaptic(type: 'light' | 'medium' | 'heavy') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const durations: Record<string, number[]> = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(durations[type] || [10]);
  }
}
