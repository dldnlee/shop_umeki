'use client';

import { useEffect, useState, useCallback } from 'react';
import { Order } from '@/lib/orders';
import { Product } from '@/models';

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

type ProductOption = {
  productId: number;
  productName: string;
  option: string | null;
};

export default function POSDashboard() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProductOptions, setAllProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    orderId: '',
    name: '',
    email: '',
    phone: '',
  });
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Fetch all products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('umeki_products')
          .select('*')
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching products:', error);
          return;
        }

        if (data) {
          setProducts(data as Product[]);

          // Build all product options
          const options: ProductOption[] = [];
          data.forEach((product: Product) => {
            if (product.options && product.options.length > 0) {
              product.options.forEach((option) => {
                options.push({
                  productId: product.id,
                  productName: product.name,
                  option,
                });
              });
            } else {
              options.push({
                productId: product.id,
                productName: product.name,
                option: null,
              });
            }
          });
          setAllProductOptions(options);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    };

    fetchProducts();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        delivery_method: '팬미팅현장수령',
        sort: 'desc',
      });

      // Add individual search filters
      if (searchFilters.orderId.trim()) {
        params.append('order_id', searchFilters.orderId.trim());
      }
      if (searchFilters.name.trim()) {
        params.append('name', searchFilters.name.trim());
      }
      if (searchFilters.email.trim()) {
        params.append('email', searchFilters.email.trim());
      }
      if (searchFilters.phone.trim()) {
        params.append('phone', searchFilters.phone.trim());
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
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
  }, [searchFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timer);
  }, [fetchOrders]);

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
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const toggleAccordion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
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
        alert('주문 상태 변경에 실패했습니다');
      }
    } catch (err) {
      alert('오류가 발생했습니다');
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'complete':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'waiting':
        return '대기';
      case 'paid':
        return '결제완료';
      case 'complete':
        return '완료';
      default:
        return status || 'N/A';
    }
  };

  // Calculate product counts by status
  const calculateProductCounts = () => {
    const countsByStatus: Record<string, Record<string, number>> = {
      '현장수령- 결제완료': {},
      '현장수령- 결제미확인': {},
    };

    // Initialize all product options with 0
    allProductOptions.forEach((productOption) => {
      const key = productOption.option
        ? `${productOption.productName} (${productOption.option})`
        : productOption.productName;
      countsByStatus['현장수령- 결제완료'][key] = 0;
      countsByStatus['현장수령- 결제미확인'][key] = 0;
    });

    // Count products by status
    orders.forEach((order) => {
      const statusKey = order.order_status === 'paid'
        ? '현장수령- 결제완료'
        : '현장수령- 결제미확인';

      order.items.forEach((item) => {
        const key = item.option
          ? `${item.product_name} (${item.option})`
          : item.product_name || '';

        if (countsByStatus[statusKey][key] !== undefined) {
          countsByStatus[statusKey][key] += item.quantity;
        }
      });
    });

    return countsByStatus;
  };

  const productCounts = calculateProductCounts();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          현장수령용 POS
        </h1>
        <p className="text-sm text-gray-600">
          팬미팅현장수령 주문 관리
        </p>
      </div>

      {/* Product Summary Table */}
      {!loading && orders.length > 0 && allProductOptions.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제품별 주문 현황</h2>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#F5F5DC]">
                  <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                    상태
                  </th>
                  {allProductOptions.map((productOption, index) => (
                    <th
                      key={`header-${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
                      className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold text-gray-900 whitespace-nowrap"
                    >
                      {productOption.option
                        ? `${productOption.productName} (${productOption.option})`
                        : productOption.productName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(productCounts).map(([status, counts]) => (
                  <tr key={status} className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-400 px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {status}
                    </td>
                    {allProductOptions.map((productOption, index) => {
                      const key = productOption.option
                        ? `${productOption.productName} (${productOption.option})`
                        : productOption.productName;
                      const count = counts[key] || 0;
                      return (
                        <td
                          key={`count-${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
                          className="border border-gray-400 px-3 py-2 text-center text-base font-semibold text-gray-900"
                        >
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-[#FFFACD] font-bold">
                  <td className="border border-gray-400 px-3 py-2 text-sm font-bold text-gray-900">
                    합계
                  </td>
                  {allProductOptions.map((productOption, index) => {
                    const key = productOption.option
                      ? `${productOption.productName} (${productOption.option})`
                      : productOption.productName;
                    const total = Object.values(productCounts).reduce(
                      (sum, counts) => sum + (counts[key] || 0),
                      0
                    );
                    return (
                      <td
                        key={`total-${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
                        className="border border-gray-400 px-3 py-2 text-center text-base font-bold text-gray-900"
                      >
                        {total > 0 ? total : ''}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search Filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-gray-700">검색 필터</h2>
          {Object.values(searchFilters).some(v => v.trim()) && (
            <button
              onClick={() => setSearchFilters({ orderId: '', name: '', email: '', phone: '' })}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              필터 초기화
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              주문번호
            </label>
            <input
              type="text"
              placeholder="주문번호로 검색..."
              value={searchFilters.orderId}
              onChange={(e) => setSearchFilters({ ...searchFilters, orderId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              이름
            </label>
            <input
              type="text"
              placeholder="이름으로 검색..."
              value={searchFilters.name}
              onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              이메일
            </label>
            <input
              type="text"
              placeholder="이메일로 검색..."
              value={searchFilters.email}
              onChange={(e) => setSearchFilters({ ...searchFilters, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              전화번호
            </label>
            <input
              type="text"
              placeholder="전화번호로 검색..."
              value={searchFilters.phone}
              onChange={(e) => setSearchFilters({ ...searchFilters, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {Object.values(searchFilters).some(v => v.trim()) ? '검색 결과가 없습니다.' : '현장수령 주문이 없습니다.'}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-gray-100"
              >
                {/* Collapsed View - Top Info Bar */}
                <button
                  onClick={() => toggleAccordion(order.id!)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-6 flex-1">
                    {/* Order Number */}
                    <div className="flex-shrink-0 min-w-[100px]">
                      <p className="text-xs text-gray-500 mb-1">주문번호</p>
                      <p className="text-sm font-bold text-gray-900">
                        #{order.id?.substring(0, 8)}
                      </p>
                    </div>

                    {/* Name */}
                    <div className="flex-shrink-0 min-w-[120px]">
                      <p className="text-xs text-gray-500 mb-1">이름</p>
                      <p className="text-base font-semibold text-gray-900">
                        {order.name}
                      </p>
                    </div>

                    {/* Delivery Method */}
                    <div className="flex-shrink-0 min-w-[140px]">
                      <p className="text-xs text-gray-500 mb-1">수령방법</p>
                      <p className="text-sm font-medium text-blue-600">
                        {order.delivery_method}
                      </p>
                    </div>

                    {/* Total Amount */}
                    <div className="flex-shrink-0 min-w-[120px]">
                      <p className="text-xs text-gray-500 mb-1">총 금액</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>

                    {/* Payment Method */}
                    <div className="flex-shrink-0 min-w-[100px]">
                      <p className="text-xs text-gray-500 mb-1">결제방법</p>
                      <p className="text-sm font-medium text-gray-700">
                        {order.payment_method || 'N/A'}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <span
                        className={`
                          px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap
                          ${getStatusBadgeColor(order.order_status)}
                        `}
                      >
                        {getStatusLabel(order.order_status)}
                      </span>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div className="ml-4 flex-shrink-0">
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
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
                </button>

                {/* Expanded View - Items Table */}
                {isExpanded && (
                  <div className="border-t-2 border-gray-200">
                    {/* Order Items Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-[#F5F5DC]">
                            {/* All product options as columns */}
                            {allProductOptions.map((productOption, index) => (
                              <th
                                key={`${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
                                className="border border-gray-400 px-3 py-2 text-center text-sm font-normal text-gray-900 whitespace-nowrap"
                              >
                                {productOption.option ? `${productOption.productName} (${productOption.option})` : productOption.productName}
                              </th>
                            ))}
                            <th className="border border-gray-400 px-3 py-2 text-center text-sm font-normal text-gray-900 bg-[#FFFACD]">
                              총 구매 금액
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Quantity Row */}
                          <tr className="bg-white">
                            {allProductOptions.map((productOption, index) => {
                              // Find matching item in this order
                              const matchingItem = order.items.find(
                                (item) =>
                                  item.product_id === productOption.productId &&
                                  (item.option || null) === productOption.option
                              );
                              const quantity = matchingItem ? matchingItem.quantity : 0;

                              return (
                                <td
                                  key={`${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
                                  className="border border-gray-400 px-3 py-3 text-center text-base font-semibold text-gray-900"
                                >
                                  {quantity}
                                </td>
                              );
                            })}
                            <td className="border border-gray-400 px-3 py-3 text-center text-base font-bold text-gray-900 bg-[#FFFACD]">
                              {formatPrice(order.total_amount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t-2 border-gray-300 bg-[#F5F5DC] px-6 py-4">
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => {
                            if (confirm('수령완료로 변경하시겠습니까?')) {
                              handleStatusChange(order.id!, 'complete');
                            }
                          }}
                          className="px-8 py-3 bg-green-600 text-white text-base font-semibold rounded-md hover:bg-green-700 transition-colors shadow-md"
                        >
                          수령완료로 변경
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('대기로 변경하시겠습니까?')) {
                              handleStatusChange(order.id!, 'waiting');
                            }
                          }}
                          className="px-8 py-3 bg-gray-600 text-white text-base font-semibold rounded-md hover:bg-gray-700 transition-colors shadow-md"
                        >
                          대기로 변경
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
