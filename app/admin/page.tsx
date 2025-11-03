'use client';

import { useEffect, useState } from 'react';
import { Order } from '@/lib/orders';

type OrderWithItems = Order & {
  items: Array<{
    id: number;
    order_id: number;
    product_id: number;
    product_name?: string;
    option?: string;
    quantity: number;
    unit_price?: number;
    total_price: number;
  }>;
};

type TabType = 'waiting' | 'paid' | 'complete';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('waiting');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/orders?status=${activeTab}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      setError('An error occurred while loading orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh orders after update
        fetchOrders();
      } else {
        alert('Failed to update order status');
      }
    } catch (err) {
      alert('An error occurred while updating order');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'waiting', label: 'Waiting' },
    { key: 'paid', label: 'Paid' },
    { key: 'complete', label: 'Complete' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No orders found in this category.
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.id?.substring(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <span
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${
                      order.order_status === 'waiting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.order_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }
                  `}
                >
                  {order.order_status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium">{order.name}</p>
                  <p className="text-sm text-gray-600">{order.email}</p>
                  <p className="text-sm text-gray-600">{order.phone_num}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery</p>
                  <p className="font-medium capitalize">{order.delivery_method}</p>
                  {order.address && (
                    <p className="text-sm text-gray-600">{order.address}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {item.product_name || `Product #${item.product_id}`}
                        {item.option && ` (${item.option})`} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPrice(order.total_amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Payment: {order.payment_method}
                  </p>
                </div>

                <div className="flex gap-2">
                  {activeTab === 'waiting' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id!, 'paid')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark as Paid
                      </button>
                    </>
                  )}
                  {activeTab === 'paid' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id!, 'complete')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        Mark as Complete
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id!, 'waiting')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                      >
                        Back to Waiting
                      </button>
                    </>
                  )}
                  {activeTab === 'complete' && (
                    <button
                      onClick={() => handleStatusChange(order.id!, 'paid')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      Back to Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
