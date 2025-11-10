'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  price: number;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  option?: string | null;
  quantity: number;
  total_price: number;
  product?: Product;
};

type Order = {
  id: string;
  name: string;
  email: string;
  phone_num?: string | null;
  address?: string | null;
  delivery_method: string;
  order_status?: string;
  created_at?: string;
  invoice_id?: string | null;
};

type OrderWithItems = Order & {
  items: OrderItem[];
};

type DeliveryFilter = 'all' | '국내배송' | '해외배송';
type PlatformTab = 'shop_umeki' | 'hypetown';

export default function DeliveryPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceNumbers, setInvoiceNumbers] = useState<{ [orderId: string]: string }>({});
  const [updatingInvoice, setUpdatingInvoice] = useState<{ [orderId: string]: boolean }>({});
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: string]: boolean }>({});
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [platformTab, setPlatformTab] = useState<PlatformTab>('shop_umeki');

  useEffect(() => {
    fetchDeliveryOrders();
  }, [platformTab]);

  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true);

      // Determine which tables to use based on platform
      const ordersTable = platformTab === 'hypetown' ? 'umeki_orders_hypetown' : 'umeki_orders';
      const orderItemsTable = platformTab === 'hypetown' ? 'umeki_order_items_hypetown' : 'umeki_order_items';
      const productsTable = 'umeki_products';

      // Fetch orders where delivery_method is NOT 팬미팅현장수령
      const { data: ordersData, error: ordersError } = await supabase
        .from(ordersTable)
        .select('*')
        .neq('delivery_method', '팬미팅현장수령')
        .neq('delivery_method', '팬미팅 현장수령')
        .neq('order_status', 'waiting')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch all order items for these orders with product information
      const orderIds = ordersData.map(order => order.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from(orderItemsTable)
        .select(`
          *,
          product:${productsTable}(id, name, price)
        `)
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Combine orders with their items
      const ordersWithItems = ordersData.map(order => ({
        ...order,
        items: itemsData?.filter(item => item.order_id === order.id) || []
      }));

      setOrders(ordersWithItems);

      // Initialize invoice numbers state
      const initialInvoiceNumbers: { [orderId: string]: string } = {};
      ordersData.forEach(order => {
        if (order.invoice_id) {
          initialInvoiceNumbers[order.id] = order.invoice_id;
        }
      });
      setInvoiceNumbers(initialInvoiceNumbers);

    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      alert('배송 주문을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceNumberChange = (orderId: string, value: string) => {
    setInvoiceNumbers(prev => ({
      ...prev,
      [orderId]: value
    }));
  };

  const handleSaveInvoiceNumber = async (orderId: string) => {
    try {
      setUpdatingInvoice(prev => ({ ...prev, [orderId]: true }));

      // Determine which table to use based on platform
      const ordersTable = platformTab === 'hypetown' ? 'umeki_orders_hypetown' : 'umeki_orders';

      const { error } = await supabase
        .from(ordersTable)
        .update({
          invoice_id: invoiceNumbers[orderId] || null,
          order_status: "complete"
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('송장번호가 저장되었습니다.');

      // Update the local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, invoice_id: invoiceNumbers[orderId] || null, order_status: "complete" }
          : order
      ));

    } catch (error) {
      console.error('Error saving invoice number:', error);
      alert('송장번호 저장에 실패했습니다.');
    } finally {
      setUpdatingInvoice(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'complete':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'waiting':
        return '대기중';
      case 'paid':
        return '배송전';
      case 'complete':
        return '배송완료';
      default:
        return status || '알 수 없음';
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const filteredOrders = orders.filter(order => {
    if (deliveryFilter === 'all') return true;
    return order.delivery_method === deliveryFilter;
  });

  // Calculate product counts by delivery method for paid orders
  const calculateProductCountsByDeliveryMethod = () => {
    const countsByDeliveryMethod: Record<string, Record<string, number>> = {
      '국내배송': {},
      '해외배송': {},
    };

    // Get all unique products with options
    const allProductOptions = new Set<string>();
    orders.forEach(order => {
      if (order.order_status === 'paid' || order.order_status === 'complete' ) {
        order.items.forEach(item => {
          const key = item.option
            ? `${item.product?.name} (${item.option})`
            : item.product?.name || '상품명 없음';
          allProductOptions.add(key);
        });
      }
    });

    // Initialize all products with 0
    allProductOptions.forEach(productKey => {
      countsByDeliveryMethod['국내배송'][productKey] = 0;
      countsByDeliveryMethod['해외배송'][productKey] = 0;
    });

    // Count products by delivery method (only paid orders)
    orders.forEach(order => {
      if (order.order_status === 'paid' && (order.delivery_method === '국내배송' || order.delivery_method === '해외배송')) {
        order.items.forEach(item => {
          const key = item.option
            ? `${item.product?.name} (${item.option})`
            : item.product?.name || '상품명 없음';

          if (countsByDeliveryMethod[order.delivery_method][key] !== undefined) {
            countsByDeliveryMethod[order.delivery_method][key] += item.quantity;
          }
        });
      }
    });

    return { countsByDeliveryMethod, allProductOptions: Array.from(allProductOptions).sort() };
  };

  const { countsByDeliveryMethod, allProductOptions } = calculateProductCountsByDeliveryMethod();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">배송 관리</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">주문 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">배송 관리</h1>
          <p className="text-gray-600 mb-4">팬미팅 현장수령을 제외한 모든 배송 주문</p>

          {/* Platform Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPlatformTab('shop_umeki')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                platformTab === 'shop_umeki'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              자사몰
            </button>
            <button
              onClick={() => setPlatformTab('hypetown')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                platformTab === 'hypetown'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              HypeTown
            </button>
          </div>

          {/* Product Summary Table */}
          {!loading && orders.length > 0 && allProductOptions.length > 0 && (
            <div className="mb-5 overflow-x-auto">
              <div className="bg-white rounded-lg shadow border border-gray-300 p-3">
                <h2 className="text-base font-semibold text-gray-900 mb-2">제품별 배송 현황 (결제완료)</h2>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold text-gray-700">
                        배송방법
                      </th>
                      {allProductOptions.map((productKey, index) => (
                        <th
                          key={`header-${index}`}
                          className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {productKey}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(countsByDeliveryMethod).map(([deliveryMethod, counts]) => (
                      <tr key={deliveryMethod} className="bg-white hover:bg-blue-50 transition-colors">
                        <td className="border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-800 whitespace-nowrap">
                          {deliveryMethod}
                        </td>
                        {allProductOptions.map((productKey, index) => {
                          const count = counts[productKey] || 0;
                          return (
                            <td
                              key={`count-${deliveryMethod}-${index}`}
                              className="border border-gray-300 px-2 py-1.5 text-center text-sm font-semibold text-gray-900"
                            >
                              {count > 0 ? count : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-gradient-to-r from-yellow-100 to-amber-100 font-bold">
                      <td className="border border-gray-300 px-2 py-1.5 text-xs font-bold text-gray-900">
                        합계
                      </td>
                      {allProductOptions.map((productKey, index) => {
                        const total = Object.values(countsByDeliveryMethod).reduce(
                          (sum, counts) => sum + (counts[productKey] || 0),
                          0
                        );
                        return (
                          <td
                            key={`total-${index}`}
                            className="border border-gray-300 px-2 py-1.5 text-center text-sm font-bold text-gray-900"
                          >
                            {total > 0 ? total : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setDeliveryFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                deliveryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              전체 ({orders.length})
            </button>
            <button
              onClick={() => setDeliveryFilter('국내배송')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                deliveryFilter === '국내배송'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              국내배송 ({orders.filter(o => o.delivery_method === '국내배송').length})
            </button>
            <button
              onClick={() => setDeliveryFilter('해외배송')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                deliveryFilter === '해외배송'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              해외배송 ({orders.filter(o => o.delivery_method === '해외배송').length})
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              {deliveryFilter === 'all' ? '배송 주문이 없습니다.' : `${deliveryFilter} 주문이 없습니다.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrders[order.id];

              return (
                <div key={order.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-300">
                  {/* Compact Header - Always Visible */}
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center flex-1 w-full gap-1.5">
                      {/* Order ID */}
                      <div className="w-[100px] shrink-0">
                        <p className="text-[10px] text-gray-500 mb-0.5">배송방법</p>
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {order.delivery_method}
                        </p>
                      </div>

                      {/* Name */}
                      <div className="w-[140px] shrink-0">
                        <p className="text-[10px] text-gray-500 mb-0.5">이름</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {order.name}
                        </p>
                      </div>

                      {/* Phone */}
                      <div className="w-[120px] shrink-0">
                        <p className="text-[10px] text-gray-500 mb-0.5">전화번호</p>
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {order.phone_num || 'N/A'}
                        </p>
                      </div>

                      {/* Delivery Method */}
                      <div className="w-[140px] shrink-0">
                        <p className="text-[10px] text-gray-500 mb-0.5">이메일</p>
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {order.email}
                        </p>
                      </div>

                      {/* Invoice Number */}
                      <div className="w-[110px] shrink-0">
                        <p className="text-[10px] text-gray-500 mb-0.5">송장번호</p>
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {order.invoice_id || '-'}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="w-[105px] shrink-0">
                        <span
                          className={`
                            inline-block px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                            ${getStatusBadgeColor(order.order_status)}
                          `}
                        >
                          {getStatusLabel(order.order_status)}
                        </span>
                      </div>

                      {/* Expand Icon */}
                      <div className="shrink-0 ml-auto pl-2">
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isExpanded ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {/* Customer Information */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">이름</p>
                            <p className="font-semibold text-gray-900">{order.name}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">전화번호</p>
                            <p className="font-medium text-gray-700">{order.phone_num || 'N/A'}</p>
                          </div>
                          <div className="min-w-0 col-span-2">
                            <p className="text-xs text-gray-500 mb-1">주소</p>
                            <p className="font-medium text-gray-700 truncate overflow-hidden text-ellipsis">{order.address || 'N/A'}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">이메일</p>
                            <p className="font-semibold text-blue-600">{order.email}</p>
                          </div>
                          <div className="min-w-0 col-span-3">
                            <p className="text-xs text-gray-500 mb-1">주문번호</p>
                            <p className="font-semibold text-gray-900 truncate">#{order.id}</p>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="px-4 py-3 bg-white border-b border-gray-200">
                        <h4 className="text-xs font-semibold mb-2 text-gray-700">주문 상품</h4>
                        <div className="space-y-1.5">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-semibold">{item.product?.name || '상품명 없음'}</span>
                                  {item.option && <span className="text-gray-600 text-xs"> ({item.option})</span>}
                                  <span className="text-gray-600 text-xs ml-2">× {item.quantity}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">
                                    {item.product?.price?.toLocaleString('ko-KR')}원 × {item.quantity}
                                  </div>
                                  <div className="font-semibold text-sm text-gray-900">
                                    {item.total_price.toLocaleString('ko-KR')}원
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Total Price */}
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-gray-900">총 주문 금액</span>
                            <span className="font-bold text-lg text-indigo-600">
                              {order.items.reduce((sum, item) => sum + item.total_price, 0).toLocaleString('ko-KR')}원
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Invoice Number Section */}
                      <div className="border-t border-gray-300 bg-gray-50 px-4 py-3">
                        <h4 className="text-xs font-semibold mb-2 text-gray-700">송장번호 입력</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={invoiceNumbers[order.id] || ''}
                            onChange={(e) => handleInvoiceNumberChange(order.id, e.target.value)}
                            placeholder="송장번호를 입력하세요"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={updatingInvoice[order.id]}
                          />
                          <button
                            onClick={() => handleSaveInvoiceNumber(order.id)}
                            disabled={updatingInvoice[order.id]}
                            className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {updatingInvoice[order.id] ? '저장중...' : '저장 & 배송완료'}
                          </button>
                        </div>
                        {order.invoice_id && (
                          <p className="text-xs text-green-600 mt-2 font-medium">
                            ✓ 저장된 송장번호: {order.invoice_id}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
