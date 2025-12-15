'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

type Product = {
  id: string;
  name: string;
  price: number;
  display_order: number;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  option?: string | null;
  quantity: number;
  total_price: number;
  malltail_order_id?: string; 
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
  customs_code?: string | null;
  delivery_fee_payment?: boolean;
  malltail_order_id?: string;
};

type OrderWithItems = Order & {
  items: OrderItem[];
};

type DeliveryFilter = 'all' | '국내배송' | '해외배송';
type PlatformTab = 'shop_umeki' | 'hypetown';
type SortOrder = 'asc' | 'desc';
type OrderStatusFilter = 'all' | 'cancel' | 'paid' | 'delivered' | 'complete';

type ProductOption = {
  productId: string;
  productName: string;
  option: string | null;
  displayOrder: number;
};

export default function DeliveryPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceNumbers, setInvoiceNumbers] = useState<{ [orderId: string]: string }>({});
  const [updatingInvoice, setUpdatingInvoice] = useState<{ [orderId: string]: boolean }>({});
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: string]: boolean }>({});
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [platformTab, setPlatformTab] = useState<PlatformTab>('shop_umeki');
  const [allProductOptions, setAllProductOptions] = useState<ProductOption[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [deliveryFeePaidFilter, setDeliveryFeePaidFilter] = useState<boolean | null>(null); // null = all, true = paid, false = unpaid
  const [emailSearch, setEmailSearch] = useState<string>('');
  const [updatingDeliveryFee, setUpdatingDeliveryFee] = useState<{ [orderId: string]: boolean }>({});
  const [updatingStatus, setUpdatingStatus] = useState<{ [orderId: string]: boolean }>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [displayCount, setDisplayCount] = useState(20);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setDisplayCount(20); // Reset display count when platform or sort changes
    fetchDeliveryOrders();
  }, [platformTab, sortOrder]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('umeki_products')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      if (data) {
        // Build all product options
        const options: ProductOption[] = [];
        data.forEach((product) => {
          if (product.options && Array.isArray(product.options) && product.options.length > 0) {
            (product.options as string[]).forEach((option: string) => {
              options.push({
                productId: product.id.toString(),
                productName: product.name as string,
                option,
                displayOrder: product.display_order as number,
              });
            });
          } else {
            options.push({
              productId: product.id.toString(),
              productName: product.name as string,
              option: null,
              displayOrder: product.display_order as number,
            });
          }
        });
        setAllProductOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true);

      // Determine which tables to use based on platform
      const ordersTable = platformTab === 'hypetown' ? 'umeki_orders_hypetown' : 'umeki_orders';
      const orderItemsTable = platformTab === 'hypetown' ? 'umeki_order_items_hypetown' : 'umeki_order_items';

      // Fetch orders with their items in a single query using embedded resources
      // This avoids the limitation of .in() with large arrays
      const { data: ordersData, error: ordersError } = await supabase
        .from(ordersTable)
        .select(`
          *,
          items:${orderItemsTable}(
            id,
            order_id,
            product_id,
            option,
            quantity,
            total_price,
            product:umeki_products(id, name, price)
          )
        `)
        .neq('delivery_method', '팬미팅현장수령')
        .neq('delivery_method', '팬미팅 현장수령')
        .neq('order_status', 'waiting')
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Data is already in the correct format with items embedded
      setOrders(ordersData as OrderWithItems[]);

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

  const handleToggleDeliveryFeePayment = async (orderId: string, currentStatus: boolean | undefined) => {
    try {
      setUpdatingDeliveryFee(prev => ({ ...prev, [orderId]: true }));

      // Determine which table to use based on platform
      const ordersTable = platformTab === 'hypetown' ? 'umeki_orders_hypetown' : 'umeki_orders';

      const newStatus = !currentStatus;

      const { error } = await supabase
        .from(ordersTable)
        .update({
          delivery_fee_payment: newStatus
        })
        .eq('id', orderId);

      if (error) throw error;

      alert(`배송비 결제 상태가 ${newStatus ? '완료' : '미완료'}로 변경되었습니다.`);

      // Update the local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, delivery_fee_payment: newStatus }
          : order
      ));

    } catch (error) {
      console.error('Error updating delivery fee payment status:', error);
      alert('배송비 결제 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingDeliveryFee(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));

      // Determine which table to use based on platform
      const ordersTable = platformTab === 'hypetown' ? 'umeki_orders_hypetown' : 'umeki_orders';

      const { error } = await supabase
        .from(ordersTable)
        .update({
          order_status: newStatus
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update the local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, order_status: newStatus }
          : order
      ));

    } catch (error) {
      console.error('Error updating order status:', error);
      alert('주문 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'cancel':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'packed':
        return 'bg-purple-100 text-purple-800'
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
      case 'delivered':
        return '배송중';
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

  const exportToExcel = () => {
    if (filteredOrders.length === 0) {
      alert('필터링된 주문이 없습니다.');
      return;
    }

    // Create headers based on the template from youmakeit_orders.csv
    const headers = [
      '아이디',
      '구매사이트주소 (http://, https:// 는 붙이지 않습니다.)',
      '주문번호',
      '주문액장번호',
      '대표상품명',
      '수령받는국가',
      '우편번호1',
      '우편번호2',
      'STATE',
      'CITY',
      '우편번호주소',
      '상세주소',
      '수령인이름',
      '수령인전화번호1',
      '수령인전화번호2',
      '수령인 이메일',
      '세금',
      '배송비',
      '할인금액',
      '스마트 온라인결제 여부',
      '항공 / 해상'
    ];

    // Add product columns (up to 30 products as per template)
    for (let i = 1; i <= 30; i++) {
      headers.push(`상품명${i}`);
      headers.push(`브랜드${i}`);
      headers.push(`단가${i}`);
      headers.push(`수량${i}`);
      headers.push(`항목코드${i}`);
      headers.push(`상품url${i}`);
    }

    const rows = filteredOrders.map(order => {
      const row: (string | number)[] = [];

      // Parse address to extract postal code and clean address
      const address = order.address || '';
      let postalCode1 = '';
      let cleanAddress = address;

      // Extract postal code from square brackets like [123-4567]
      const postalMatch = address.match(/\[([0-9]{3}-?[0-9]{4})\]/);
      if (postalMatch) {
        postalCode1 = postalMatch[1].replace('-', ''); // Remove hyphen for postal code
        // Remove the bracket part from address
        cleanAddress = address.replace(/\[[0-9]{3}-?[0-9]{4}\]/, '').trim();
      }

      // Basic info
      row.push(order.id || ''); // 아이디 (order ID)
      row.push('youmakeit.shop'); // 구매사이트주소
      row.push(order.malltail_order_id || ''); // 주문번호
      row.push(''); // 주문액장번호

      // 대표상품명 (first product name)
      const firstProduct = order.items[0]?.product?.name || '';
      row.push(order.items.length > 1 ? `${firstProduct} 외 ${order.items.length - 1}건` : firstProduct);

      // Address and shipping info
      row.push('JP'); // 수령받는국가 (Japan)
      row.push(postalCode1); // 우편번호1
      row.push(''); // 우편번호2
      row.push(''); // STATE
      row.push(''); // CITY
      row.push(cleanAddress); // 우편번호주소 (address without brackets)
      row.push(''); // 상세주소
      row.push(order.name || ''); // 수령인이름
      row.push(order.phone_num || ''); // 수령인전화번호1
      row.push(''); // 수령인전화번호2
      row.push(order.email || ''); // 수령인 이메일
      row.push(''); // 세금
      row.push(''); // 배송비
      row.push(''); // 할인금액
      row.push(''); // 스마트 온라인결제 여부
      row.push(''); // 항공 / 해상

      // Add products (up to 30) - fill in actual items for each order
      for (let i = 0; i < 30; i++) {
        const item = order.items[i];
        if (item && item.product) {
          const productName = item.option
            ? `${item.product.name} (${item.option})`
            : item.product.name;
          row.push(productName); // 상품명
          row.push('YouMakeIt'); // 브랜드
          row.push(item.product.price || 0); // 단가 (as number)
          row.push(item.quantity || 1); // 수량 (as number)
          row.push('A01'); // 항목코드
          row.push(''); // 상품url
        } else {
          // Empty product columns for unused slots
          row.push('', '', '', '', '', '');
        }
      }

      return row;
    });

    // Create worksheet from array of arrays
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const platform = platformTab === 'hypetown' ? 'hypetown' : 'umeki';
    const filename = `youmakeit_orders_${platform}_${timestamp}.xlsx`;

    // Write and download file
    XLSX.writeFile(wb, filename);
  };

  const filteredOrders = orders.filter(order => {
    // Apply delivery method filter
    if (deliveryFilter !== 'all' && order.delivery_method !== deliveryFilter) {
      return false;
    }

    // Apply order status filter
    if (orderStatusFilter !== 'all' && order.order_status !== orderStatusFilter) {
      return false;
    }

    // Apply delivery fee paid filter (only for Hypetown)
    if (platformTab === 'hypetown' && deliveryFeePaidFilter !== null) {
      if (order.delivery_fee_payment !== deliveryFeePaidFilter) {
        return false;
      }
    }

    // Apply email search filter
    if (emailSearch.trim() !== '') {
      if (!order.email.toLowerCase().includes(emailSearch.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Client-side pagination: only render a subset of filtered orders
  const displayedOrders = filteredOrders.slice(0, displayCount);
  const hasMoreToDisplay = displayCount < filteredOrders.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Calculate product counts by delivery method for paid orders
  const calculateProductCountsByDeliveryMethod = () => {
    const countsByDeliveryMethod: Record<string, Record<string, number>> = {
      '국내배송': {},
      '해외배송': {},
    };

    // Initialize all product options with 0
    allProductOptions.forEach((productOption) => {
      const key = productOption.option
        ? `${productOption.productName} (${productOption.option})`
        : productOption.productName;
      countsByDeliveryMethod['국내배송'][key] = 0;
      countsByDeliveryMethod['해외배송'][key] = 0;
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

    return countsByDeliveryMethod;
  };

  const countsByDeliveryMethod = calculateProductCountsByDeliveryMethod();

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
              onClick={() => {
                setPlatformTab('shop_umeki');
                setDeliveryFeePaidFilter(null);
              }}
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
                <h2 className="text-base font-semibold text-gray-900 mb-2">제품별 배송 현황 (배송전)</h2>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold text-gray-700">
                        배송방법
                      </th>
                      {allProductOptions.map((productOption, index) => (
                        <th
                          key={`header-${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
                          className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {productOption.option
                            ? `${productOption.productName} (${productOption.option})`
                            : productOption.productName}
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
                        {allProductOptions.map((productOption, index) => {
                          const key = productOption.option
                            ? `${productOption.productName} (${productOption.option})`
                            : productOption.productName;
                          const count = counts[key] || 0;
                          return (
                            <td
                              key={`count-${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
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
                      {allProductOptions.map((productOption, index) => {
                        const key = productOption.option
                          ? `${productOption.productName} (${productOption.option})`
                          : productOption.productName;
                        const total = Object.values(countsByDeliveryMethod).reduce(
                          (sum, counts) => sum + (counts[key] || 0),
                          0
                        );
                        return (
                          <td
                            key={`total-${productOption.productId}-${productOption.option || 'no-option'}-${index}`}
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

          {/* Email Search Input */}
          <div className="mb-4">
            <label htmlFor="email-search" className="block text-sm font-medium text-gray-700 mb-2">
              이메일로 주문 검색
            </label>
            <input
              id="email-search"
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="이메일 주소를 입력하세요..."
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {emailSearch && (
              <p className="text-sm text-gray-600 mt-1">
                검색 결과: {filteredOrders.length}개의 주문
              </p>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center flex-wrap gap-4">
            {/* Delivery Method Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="delivery-filter" className="text-sm font-medium text-gray-700">
                배송 방법:
              </label>
              <select
                id="delivery-filter"
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as DeliveryFilter)}
                className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">전체 ({orders.length})</option>
                <option value="국내배송">국내배송 ({orders.filter(o => o.delivery_method === '국내배송').length})</option>
                <option value="해외배송">해외배송 ({orders.filter(o => o.delivery_method === '해외배송').length})</option>
              </select>
            </div>

            {/* Order Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                주문 상태:
              </label>
              <select
                id="status-filter"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatusFilter)}
                className="px-4 py-2 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">전체</option>
                <option value="cancel">고객취소 ({orders.filter(o => o.order_status === 'cancel').length})</option>
                <option value="paid">배송전 ({orders.filter(o => o.order_status === 'paid').length})</option>
                <option value="delivered">배송중 ({orders.filter(o => o.order_status === 'delivered').length})</option>
                <option value="complete">배송완료 ({orders.filter(o => o.order_status === 'complete').length})</option>
              </select>
            </div>

            {/* Delivery Fee Payment Filter - Only for Hypetown */}
            {platformTab === 'hypetown' && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => setDeliveryFeePaidFilter(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    deliveryFeePaidFilter === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  배송비: 전체
                </button>
                <button
                  onClick={() => setDeliveryFeePaidFilter(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    deliveryFeePaidFilter === true
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  결제 완료
                </button>
                <button
                  onClick={() => setDeliveryFeePaidFilter(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    deliveryFeePaidFilter === false
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  결제 미완료
                </button>
              </>
            )}

            {/* Sort Order Toggle */}
            <div className="ml-auto flex gap-2">
              <button
                onClick={exportToExcel}
                disabled={filteredOrders.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Excel 내보내기 ({filteredOrders.length})
              </button>
              <div className="w-px h-full bg-gray-300 mx-2"></div>
              <span className="text-sm text-gray-600 self-center">정렬:</span>
              <button
                onClick={() => setSortOrder('asc')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortOrder === 'asc'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                오래된 순
              </button>
              <button
                onClick={() => setSortOrder('desc')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortOrder === 'desc'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                최신 순
              </button>
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              {deliveryFilter === 'all' ? '배송 주문이 없습니다.' : `${deliveryFilter} 주문이 없습니다.`}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-700">
                전체 <span className="font-semibold">{filteredOrders.length}</span>개의 주문 중{' '}
                <span className="font-semibold">{displayedOrders.length}</span>개 표시
              </p>
              {hasMoreToDisplay && (
                <button
                  onClick={loadMore}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  더 보기 ({ITEMS_PER_PAGE}개)
                </button>
              )}
            </div>
            <div className="space-y-2">
              {displayedOrders.map((order) => {
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
                      <div className="w-[50px] shrink-0">
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
                        <select
                          value={order.order_status || 'paid'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(order.id, e.target.value);
                          }}
                          disabled={updatingStatus[order.id]}
                          onClick={(e) => e.stopPropagation()}
                          className={`
                            w-full px-2 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer
                            border-2 transition-colors
                            ${getStatusBadgeColor(order.order_status)}
                            ${updatingStatus[order.id] ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
                          `}
                        >
                          <option value="cancel">고객취소</option>
                          <option value="paid">배송전</option>
                          <option value="packed">포장완료</option>
                          <option value="delivered">배송중</option>
                          <option value="complete">배송완료</option>
                        </select>
                      </div>

                      {/* Delivery Fee Payment Status - Only for Hypetown */}
                      {platformTab === 'hypetown' && (
                        <div className="w-[90px] shrink-0">
                          <p className="text-[10px] text-gray-500 mb-0.5">배송비 결제</p>
                          <span
                            className={`
                              inline-block px-2 py-1 rounded text-xs font-semibold whitespace-nowrap
                              ${order.delivery_fee_payment
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'}
                            `}
                          >
                            {order.delivery_fee_payment ? '완료' : '미완료'}
                          </span>
                        </div>
                      )}

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
                            <p className="font-medium text-gray-700 whitespace-normal text-ellipsis">{order.address || 'N/A'}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">이메일</p>
                            <p className="font-semibold text-blue-600">{order.email}</p>
                          </div>
                          <div className="min-w-0 col-span-3">
                            <p className="text-xs text-gray-500 mb-1">주문번호</p>
                            <p className="font-semibold text-gray-900 truncate">#{order.id}</p>
                          </div>
                          {/* Customs Code - Only show for international shipping */}
                          {order.delivery_method === '해외배송' && (
                            <div className="min-w-0 col-span-2">
                              <p className="text-xs text-gray-500 mb-1">통관 코드</p>
                              <p className="font-semibold text-indigo-600">
                                {order.customs_code || '미입력'}
                              </p>
                            </div>
                          )}
                          {/* Delivery Fee Payment - Only show for Hypetown */}
                          {platformTab === 'hypetown' && (
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 mb-1">배송비 결제</p>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`
                                    inline-block px-3 py-1 rounded-full text-sm font-semibold
                                    ${order.delivery_fee_payment
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'}
                                  `}
                                >
                                  {order.delivery_fee_payment ? '✓ 완료' : '✗ 미완료'}
                                </span>
                                <button
                                  onClick={() => handleToggleDeliveryFeePayment(order.id, order.delivery_fee_payment)}
                                  disabled={updatingDeliveryFee[order.id]}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {updatingDeliveryFee[order.id] ? '변경중...' : '상태 변경'}
                                </button>
                              </div>
                            </div>
                          )}
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
          {hasMoreToDisplay && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMore}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                더 보기 ({ITEMS_PER_PAGE}개씩)
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
