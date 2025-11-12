'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type HypetownCustomer = {
  id: string;
  name: string;
  email: string;
  phone_num?: string;
  delivery_method: string;
  created_at: string;
  order_count: number;
  total_spent: number;
};

export default function HypetownDatabasePage() {
  const [customers, setCustomers] = useState<HypetownCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<HypetownCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Email Editor
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchHypetownCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [customers, deliveryMethodFilter, searchQuery]);

  const fetchHypetownCustomers = async () => {
    setLoading(true);
    try {
      // Fetch all Hypetown orders with customer info
      const { data, error } = await supabase
        .from('umeki_orders_hypetown')
        .select('id, name, email, phone_num, delivery_method, created_at, total_amount')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by email and aggregate data
      const customerMap = new Map<string, HypetownCustomer>();

      data?.forEach((order: any) => {
        const email = order.email;
        if (customerMap.has(email)) {
          const existing = customerMap.get(email)!;
          existing.order_count += 1;
          existing.total_spent += order.total_amount || 0;
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
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching Hypetown customers:', error);
      alert('Failed to fetch Hypetown customers');
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

  const generateEmailPreview = (sampleCustomer?: HypetownCustomer): string => {
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
    try {
      const selectedCustomerData = filteredCustomers.filter((c) => selectedCustomers.has(c.id));

      const response = await fetch('/api/admin/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedCustomerData.map(c => ({
            ...c,
            orderId: c.id,
          })),
          subject: emailSubject,
          htmlContent: emailContent,
          textContent: emailContent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully sent ${result.successCount} emails!`);
        // Clear selections and form
        setSelectedCustomers(new Set());
        setEmailSubject('');
        setEmailContent('');
      } else {
        alert(`Failed to send emails: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('An error occurred while sending emails');
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hypetown 고객 데이터베이스</h1>
        <p className="mt-2 text-gray-600">
          Hypetown 플랫폼에서 주문한 고객 정보를 확인할 수 있습니다.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">총 고객 수</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{customers.length}명</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">총 주문 수</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {customers.reduce((sum, c) => sum + c.order_count, 0)}건
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">총 매출액</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(customers.reduce((sum, c) => sum + c.total_spent, 0))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="overflow-x-auto">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 구매액
                  </th>
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
                      <div className="text-sm text-gray-900">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {customer.phone_num || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {customer.delivery_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.order_count}회
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(customer.total_spent)}
                    </td>
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

      {/* Email Preview */}
      {showPreview && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            미리보기
          </h2>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div
              dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
              className="bg-gray-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
