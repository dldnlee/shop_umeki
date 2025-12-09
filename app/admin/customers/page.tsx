'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone_num?: string;
  delivery_method: string;
  created_at: string;
  order_count: number;
  total_spent?: number;
  delivery_fee_payment?: boolean;
  order_status?: string;
};


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
};

type OrderWithItems = Order & {
  items: OrderItem[];
};

export default function CustomerManagementPage() {
  // Tab state - added 'export' option
  const [activeTab, setActiveTab] = useState<'regular' | 'hypetown' | 'export'>('regular');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryFeePaidFilter, setDeliveryFeePaidFilter] = useState<boolean | null>(null); // null = all, true = paid, false = unpaid
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all'); // all, paid, delivered, complete

  // Export tab state
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<{ [orderId: string]: boolean }>({});
  const [exportPlatform, setExportPlatform] = useState<'regular' | 'hypetown'>('regular');
  const [exportDeliveryFilter, setExportDeliveryFilter] = useState<string>('all');
  const [exportStatusFilter, setExportStatusFilter] = useState<string>('all');

  // Email Editor
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [sendProgress, setSendProgress] = useState({
    current: 0,
    total: 0,
    successCount: 0,
    failureCount: 0,
    currentEmail: '',
  });

  useEffect(() => {
    if (activeTab === 'export') {
      fetchOrders();
    } else {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, exportPlatform]);

  useEffect(() => {
    if (activeTab === 'export') {
      applyOrderFilters();
    } else {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, deliveryMethodFilter, searchQuery, deliveryFeePaidFilter, orderStatusFilter, orders, exportDeliveryFilter, exportStatusFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const tableName = activeTab === 'regular' ? 'umeki_orders' : 'umeki_orders_hypetown';

      // Fetch all orders with customer info
      // Only fetch delivery_fee_payment for Hypetown customers
      const selectFields = activeTab === 'hypetown'
        ? 'id, name, email, phone_num, delivery_method, created_at, total_amount, delivery_fee_payment, order_status'
        : 'id, name, email, phone_num, delivery_method, created_at, total_amount, order_status';

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by email and aggregate data
      const customerMap = new Map<string, Customer>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?.forEach((order: any) => {
        const email = order.email;
        if (customerMap.has(email)) {
          const existing = customerMap.get(email)!;
          existing.order_count += 1;
          if (order.total_amount) {
            existing.total_spent = (existing.total_spent || 0) + order.total_amount;
          }
          // Update delivery_fee_payment to true if any order has it paid
          if (order.delivery_fee_payment) {
            existing.delivery_fee_payment = true;
          }
          // Update to the most recent order_status (if newer)
          if (order.created_at > existing.created_at) {
            existing.order_status = order.order_status;
          }
        } else {
          customerMap.set(email, {
            id: order.id,
            name: order.name,
            email: order.email,
            phone_num: order.phone_num,
            delivery_method: order.delivery_method,
            created_at: order.created_at,
            order_count: 1,
            total_spent: order.total_amount || 0,
            delivery_fee_payment: order.delivery_fee_payment || false,
            order_status: order.order_status,
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersTable = exportPlatform === 'hypetown' ? 'umeki_orders_hypetown' : 'umeki_orders';
      const orderItemsTable = exportPlatform === 'hypetown' ? 'umeki_order_items_hypetown' : 'umeki_order_items';
      const productsTable = 'umeki_products';

      // Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from(ordersTable)
        .select('*')
        .neq('order_status', 'waiting')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
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
      setFilteredOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...customers];

    // Apply delivery method filter
    if (deliveryMethodFilter !== 'all') {
      filtered = filtered.filter((c) => c.delivery_method === deliveryMethodFilter);
    }

    // Apply delivery fee paid filter (only for Hypetown)
    if (activeTab === 'hypetown' && deliveryFeePaidFilter !== null) {
      filtered = filtered.filter((c) => c.delivery_fee_payment === deliveryFeePaidFilter);
    }

    // Apply order status filter
    if (orderStatusFilter !== 'all') {
      console.log('Filtering by order status:', orderStatusFilter);
      console.log('Sample customer order_status values:', filtered.slice(0, 3).map(c => ({ email: c.email, status: c.order_status })));
      filtered = filtered.filter((c) => c.order_status === orderStatusFilter);
      console.log('After filter count:', filtered.length);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone_num?.toLowerCase().includes(query)
      );
    }

    setFilteredCustomers(filtered);
  };

  const applyOrderFilters = () => {
    let filtered = [...orders];

    // Apply delivery method filter
    if (exportDeliveryFilter !== 'all') {
      filtered = filtered.filter((o) => o.delivery_method === exportDeliveryFilter);
    }

    // Apply order status filter
    if (exportStatusFilter !== 'all') {
      filtered = filtered.filter((o) => o.order_status === exportStatusFilter);
    }

    setFilteredOrders(filtered);
  };

  const toggleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers);
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId);
    } else {
      newSelection.add(customerId);
    }
    setSelectedCustomers(newSelection);
  };

  const selectAll = () => {
    const allIds = new Set(filteredCustomers.map((c) => c.id));
    setSelectedCustomers(allIds);
  };

  const deselectAll = () => {
    setSelectedCustomers(new Set());
  };

  const replaceVariables = (content: string, customerName: string, customerEmail: string, orderId?: string): string => {
    return content
      .replace(/\{\{name\}\}/g, customerName)
      .replace(/\{\{email\}\}/g, customerEmail)
      .replace(/\{\{orderId\}\}/g, orderId || '');
  };

  const generateEmailPreview = (sampleCustomer?: Customer): string => {
    // Use first selected customer for preview, or a sample
    const previewCustomer = sampleCustomer || filteredCustomers.find(c => selectedCustomers.has(c.id)) || {
      id: 'SAMPLE-ORDER-ID',
      name: '홍길동',
      email: 'customer@example.com',
    };

    const personalizedContent = replaceVariables(emailContent, previewCustomer.name, previewCustomer.email, previewCustomer.id);
    const personalizedSubject = replaceVariables(emailSubject, previewCustomer.name, previewCustomer.email, previewCustomer.id);

    // Generate HTML preview
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #4CAF50;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 24px;
    }
    .content {
      font-size: 14px;
      color: #555;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${personalizedSubject || '제목 없음'}</h1>
      <p style="margin: 10px 0 0 0; color: #666;">유메키 팬미팅 &lt;YOU MAKE IT&gt;</p>
    </div>
    <div class="content">
      ${personalizedContent || '내용 없음'}
    </div>
    <div class="footer">
      <p>본 메일은 발신전용 메일입니다.</p>
      <p>문의사항이 있으시면 고객센터로 연락해주세요.</p>
      <p style="margin-top: 20px; color: #aaa;">© 2025 유메키 팬미팅. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  };

  const handleSendEmails = async () => {
    if (selectedCustomers.size === 0) {
      alert('Please select at least one customer');
      return;
    }

    if (!emailSubject.trim() || !emailContent.trim()) {
      alert('Please provide both subject and content');
      return;
    }

    const confirmed = confirm(
      `Send email to ${selectedCustomers.size} customer(s)?\n\nSubject: ${emailSubject}`
    );

    if (!confirmed) return;

    setSending(true);
    const selectedCustomerData = filteredCustomers.filter((c) => selectedCustomers.has(c.id));

    // Initialize progress modal
    setShowProgressModal(true);
    setSendProgress({
      current: 0,
      total: selectedCustomerData.length,
      successCount: 0,
      failureCount: 0,
      currentEmail: '',
    });

    try {
      const requestBody = {
        recipients: selectedCustomerData.map(c => ({
          ...c,
          orderId: c.id,
        })),
        subject: emailSubject,
        htmlContent: emailContent,
        textContent: emailContent,
      };

      console.log('Sending email request:', {
        recipientCount: requestBody.recipients.length,
        hasSubject: !!requestBody.subject,
        hasHtmlContent: !!requestBody.htmlContent,
        hasTextContent: !!requestBody.textContent,
        sampleRecipient: requestBody.recipients[0],
      });

      // Send emails one by one to show progress
      let successCount = 0;
      let failureCount = 0;
      const errors: Array<{ email: string; error: string }> = [];

      for (let i = 0; i < selectedCustomerData.length; i++) {
        const customer = selectedCustomerData[i];

        // Update progress
        setSendProgress({
          current: i + 1,
          total: selectedCustomerData.length,
          successCount,
          failureCount,
          currentEmail: customer.email,
        });

        try {
          const response = await fetch('/api/admin/send-custom-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipients: [{
                ...customer,
                orderId: customer.id,
              }],
              subject: emailSubject,
              htmlContent: emailContent,
              textContent: emailContent,
            }),
          });

          const result = await response.json();

          if (response.ok && result.successCount > 0) {
            successCount++;
          } else {
            failureCount++;
            errors.push({
              email: customer.email,
              error: result.error || (result.errors?.[0]?.error) || 'Unknown error'
            });
          }
        } catch (error) {
          failureCount++;
          errors.push({
            email: customer.email,
            error: error instanceof Error ? error.message : 'Network error'
          });
        }

        // Update final progress for this email
        setSendProgress({
          current: i + 1,
          total: selectedCustomerData.length,
          successCount,
          failureCount,
          currentEmail: customer.email,
        });

        // Small delay to avoid overwhelming the API
        if (i < selectedCustomerData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Show final results
      setTimeout(() => {
        setShowProgressModal(false);

        let message = `Successfully sent ${successCount} out of ${selectedCustomerData.length} emails!`;

        if (failureCount > 0) {
          message += `\n\nFailed: ${failureCount} emails`;
          if (errors.length > 0) {
            message += '\n\nFailed recipients:';
            errors.slice(0, 5).forEach((err) => {
              message += `\n- ${err.email}: ${err.error}`;
            });
            if (errors.length > 5) {
              message += `\n... and ${errors.length - 5} more`;
            }
          }
        }

        alert(message);

        // Clear selections and form only if all succeeded
        if (failureCount === 0) {
          setSelectedCustomers(new Set());
          setEmailSubject('');
          setEmailContent('');
        }
      }, 500);

    } catch (error) {
      console.error('Error sending emails:', error);
      setShowProgressModal(false);
      alert('An error occurred while sending emails');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  // Clear selections and filters when switching tabs
  const handleTabChange = (tab: 'regular' | 'hypetown' | 'export') => {
    setActiveTab(tab);
    setSelectedCustomers(new Set());
    setDeliveryMethodFilter('all');
    setDeliveryFeePaidFilter(null);
    setOrderStatusFilter('all');
    setSearchQuery('');
    setEmailSubject('');
    setEmailContent('');
    setShowPreview(false);

    if (tab === 'export') {
      setExportDeliveryFilter('all');
      setExportStatusFilter('all');
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      alert('필터링된 주문이 없습니다.');
      return;
    }

    // Create CSV content based on the template from youmakeit_orders.csv
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
      const row: string[] = [];

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
      row.push(order.id || ''); // 주문번호
      row.push(''); // 주문액장번호

      // 대표상품명 (first product name)
      const firstProduct = order.items[0]?.product?.name || '';
      row.push(order.items.length > 1 ? `${firstProduct} 외 ${order.items.length - 1}건` : firstProduct);

      // Address and shipping info
      const isInternational = order.delivery_method === '해외배송';

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
      row.push(isInternational ? '항공' : ''); // 항공 / 해상

      // Add products (up to 30) - fill in actual items for each order
      for (let i = 0; i < 30; i++) {
        const item = order.items[i];
        if (item && item.product) {
          const productName = item.option
            ? `${item.product.name} (${item.option})`
            : item.product.name;
          row.push(productName); // 상품명
          row.push('YouMakeIt'); // 브랜드
          row.push(item.product.price?.toString() || '0'); // 단가
          row.push(item.quantity?.toString() || '1'); // 수량
          row.push(item.product.id || ''); // 항목코드
          row.push(''); // 상품url
        } else {
          // Empty product columns for unused slots
          row.push('', '', '', '', '', '');
        }
      }

      return row;
    });

    // Convert to CSV string
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 10);
    const platform = exportPlatform === 'hypetown' ? 'hypetown' : 'umeki';

    link.setAttribute('href', url);
    link.setAttribute('download', `youmakeit_orders_${platform}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">고객 관리</h1>
        <p className="mt-2 text-gray-600">
          조건에 맞는 고객을 선택하여 이메일을 발송할 수 있습니다.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('regular')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'regular'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              일반 고객
            </button>
            <button
              onClick={() => handleTabChange('hypetown')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'hypetown'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hypetown 고객
            </button>
            <button
              onClick={() => handleTabChange('export')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              주문 내보내기
            </button>
          </nav>
        </div>
      </div>

      {/* Export Tab Content */}
      {activeTab === 'export' ? (
        <>
          {/* Platform Selection for Export */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">플랫폼 선택</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setExportPlatform('regular')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  exportPlatform === 'regular'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                자사몰
              </button>
              <button
                onClick={() => setExportPlatform('hypetown')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  exportPlatform === 'hypetown'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                HypeTown
              </button>
            </div>
          </div>

          {/* Export Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">필터</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배송 방법
                </label>
                <select
                  value={exportDeliveryFilter}
                  onChange={(e) => setExportDeliveryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체</option>
                  <option value="해외배송">해외배송</option>
                  <option value="국내배송">국내배송</option>
                  <option value="팬미팅현장수령">팬미팅현장수령</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주문 상태
                </label>
                <select
                  value={exportStatusFilter}
                  onChange={(e) => setExportStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체</option>
                  <option value="paid">배송전</option>
                  <option value="delivered">배송중</option>
                  <option value="complete">처리 완료</option>
                </select>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                필터링된 주문: <span className="font-semibold text-gray-900">{filteredOrders.length}개</span>
              </p>
              <button
                onClick={exportToCSV}
                disabled={filteredOrders.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                CSV 다운로드
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                주문 목록 ({filteredOrders.length}개)
              </h2>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  조건에 맞는 주문이 없습니다.
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrders[order.id];
                    return (
                      <div key={order.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-300">
                        {/* Compact Header */}
                        <button
                          onClick={() => toggleOrder(order.id)}
                          className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50 transition-colors rounded-lg"
                        >
                          <div className="flex items-center flex-1 w-full gap-1.5">
                            {/* Delivery Method */}
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

                            {/* Email */}
                            <div className="w-[140px] shrink-0">
                              <p className="text-[10px] text-gray-500 mb-0.5">이메일</p>
                              <p className="text-xs font-medium text-gray-700 truncate">
                                {order.email}
                              </p>
                            </div>

                            {/* Status */}
                            <div className="w-[90px] shrink-0">
                              <p className="text-[10px] text-gray-500 mb-0.5">상태</p>
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.order_status === 'complete' ? 'bg-green-100 text-green-800' :
                                order.order_status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                                order.order_status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.order_status === 'paid' ? '배송전' :
                                 order.order_status === 'delivered' ? '배송중' :
                                 order.order_status === 'complete' ? '완료' :
                                 order.order_status}
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
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="px-4 py-3 bg-white">
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
                                        <div className="font-semibold text-sm text-gray-900">
                                          {item.total_price.toLocaleString('ko-KR')}원
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
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
          </div>
        </>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">필터</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              배송 방법
            </label>
            <select
              value={deliveryMethodFilter}
              onChange={(e) => setDeliveryMethodFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체</option>
              <option value="해외배송">해외배송</option>
              <option value="국내배송">국내배송</option>
              <option value="팬미팅현장수령">팬미팅현장수령</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주문 상태
            </label>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체</option>
              <option value="paid">배송전</option>
              <option value="delivered">배송중</option>
              <option value="complete">처리 완료</option>
            </select>
          </div>
          {activeTab === 'hypetown' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배송비 결제 상태
              </label>
              <select
                value={deliveryFeePaidFilter === null ? 'all' : deliveryFeePaidFilter ? 'paid' : 'unpaid'}
                onChange={(e) => {
                  const value = e.target.value;
                  setDeliveryFeePaidFilter(value === 'all' ? null : value === 'paid');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체</option>
                <option value="paid">결제 완료</option>
                <option value="unpaid">결제 미완료</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <input
              type="text"
              placeholder="이름, 이메일, 전화번호로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
            </div>
          </div>

          {/* Customer List */}
          <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              고객 목록 ({filteredCustomers.length}명)
            </h2>
            <p className="text-sm text-gray-600">
              선택됨: {selectedCustomers.size}명
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              전체 선택
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              선택 해제
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              조건에 맞는 고객이 없습니다.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    선택
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전화번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    배송 방법
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문 횟수
                  </th>
                  {activeTab === 'hypetown' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        총 구매액
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        배송비 결제
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    최근 주문일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedCustomers.has(customer.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {customer.phone_num || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activeTab === 'hypetown'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.delivery_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.order_count}회
                    </td>
                    {activeTab === 'hypetown' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(customer.total_spent || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              customer.delivery_fee_payment
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {customer.delivery_fee_payment ? '완료' : '미완료'}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Email Editor */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          이메일 작성
        </h2>

        {/* Variable helper */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-900 font-medium mb-2">💡 개인화 변수 사용법:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{{name}}'}</code> - 고객 이름</li>
            <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{{email}}'}</code> - 고객 이메일</li>
            <li>• <code className="bg-blue-100 px-2 py-0.5 rounded">{'{{orderId}}'}</code> - 주문 ID</li>
          </ul>
          <p className="text-xs text-blue-700 mt-2">예: &quot;안녕하세요 {'{{name}}'} 님!&quot; → &quot;안녕하세요 홍길동 님!&quot;</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="이메일 제목을 입력하세요 (예: {{name}}님께 드리는 안내)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="이메일 내용을 입력하세요 ({{name}}, {{email}}, {{orderId}} 사용 가능)"
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {showPreview ? '미리보기 닫기' : '미리보기'}
            </button>
            <button
              onClick={handleSendEmails}
              disabled={sending || selectedCustomers.size === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {sending ? '발송 중...' : `이메일 발송 (${selectedCustomers.size}명)`}
            </button>
          </div>
        </div>
          </div>
        </>
      )}

      {/* Email Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                이메일 미리보기
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-64px)]">
              <div
                dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                이메일 발송 중...
              </h2>
              <p className="text-sm text-gray-600">
                잠시만 기다려주세요. 이메일을 발송하고 있습니다.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  진행률: {sendProgress.current} / {sendProgress.total}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {sendProgress.total > 0
                    ? Math.round((sendProgress.current / sendProgress.total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${
                      sendProgress.total > 0
                        ? (sendProgress.current / sendProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Current Email */}
            {sendProgress.currentEmail && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs font-medium text-blue-900 mb-1">현재 발송 중:</p>
                <p className="text-sm text-blue-800 truncate">{sendProgress.currentEmail}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-2xl font-bold text-green-600">
                  {sendProgress.successCount}
                </div>
                <div className="text-xs text-green-700 mt-1">성공</div>
              </div>
              <div className="text-center p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-2xl font-bold text-red-600">
                  {sendProgress.failureCount}
                </div>
                <div className="text-xs text-red-700 mt-1">실패</div>
              </div>
            </div>

            {/* Loading Spinner */}
            <div className="flex justify-center mt-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
