'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type SalesAnalytics = {
  totalPaidAmount: number;
  totalWaitingAmount: number;
  totalPaidOrders: number;
  totalWaitingOrders: number;
  paidDeliveryMethods: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  waitingDeliveryMethods: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  productSales: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    deliveryMethods: Array<{
      method: string;
      quantity: number;
      revenue: number;
    }>;
    options: Array<{
      option: string;
      quantity: number;
      revenue: number;
      deliveryMethods: Array<{
        method: string;
        quantity: number;
        revenue: number;
      }>;
    }>;
  }>;
};

const JPY_RATE = 0.11; // 1 KRW = ~0.11 JPY
const USD_RATE = 0.00075; // 1 KRW = ~0.00075 USD

export default function AnalyticsPage() {
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const requestSeq = useRef(0);

  // Date range state - default to last 30 days
  const [startDate, setStartDate] = useState<string>(
    format(startOfDay(subDays(new Date(), 30)), "yyyy-MM-dd'T'HH:mm:ss")
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss")
  );

  const fetchSalesAnalytics = useCallback(
    async (signal: AbortSignal, requestId: number) => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`/api/admin/sales-analytics?${params.toString()}`, {
          signal,
          cache: 'no-store',
        });
        const data = await response.json();

        if (requestId !== requestSeq.current) return;

        if (response.ok) {
          setSalesAnalytics(data);
        } else {
          setError('Failed to load sales analytics');
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        if (requestId !== requestSeq.current) return;
        setError('An error occurred while loading sales analytics');
      } finally {
        if (requestId !== requestSeq.current) return;
        setLoading(false);
      }
    },
    [endDate, startDate]
  );

  useEffect(() => {
    const controller = new AbortController();
    requestSeq.current += 1;
    const requestId = requestSeq.current;
    void fetchSalesAnalytics(controller.signal, requestId);
    return () => controller.abort();
  }, [fetchSalesAnalytics]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setStartDate(format(startOfDay(date), "yyyy-MM-dd'T'HH:mm:ss"));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setEndDate(format(endOfDay(date), "yyyy-MM-dd'T'HH:mm:ss"));
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(startOfDay(start), "yyyy-MM-dd'T'HH:mm:ss"));
    setEndDate(format(endOfDay(end), "yyyy-MM-dd'T'HH:mm:ss"));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const formatMultiCurrency = (priceKRW: number) => {
    const jpy = priceKRW * JPY_RATE;
    const usd = priceKRW * USD_RATE;

    return {
      krw: formatPrice(priceKRW),
      jpy: new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
      }).format(jpy),
      usd: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(usd),
    };
  };

  const getDeliveryMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'pickup': '픽업',
      'shipping': '배송',
      'unknown': '알 수 없음',
    };
    return labels[method] || method;
  };

  const toggleProduct = (productId: number) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">매출 분석</h2>
        <p className="text-gray-600 mt-1">Sales Analytics</p>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">기간 선택</h3>

        {/* Quick Date Range Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setDateRange(7)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            최근 7일
          </button>
          <button
            onClick={() => setDateRange(30)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            최근 30일
          </button>
          <button
            onClick={() => setDateRange(90)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            최근 90일
          </button>
          <button
            onClick={() => {
              setStartDate(format(startOfDay(new Date(2024, 0, 1)), "yyyy-MM-dd'T'HH:mm:ss"));
              setEndDate(format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss"));
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            전체 기간
          </button>
        </div>

        {/* Custom Date Range Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              value={format(new Date(startDate), 'yyyy-MM-dd')}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={format(new Date(endDate), 'yyyy-MM-dd')}
              onChange={handleEndDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Display Selected Range */}
        <div className="mt-4 text-sm text-gray-600">
          선택된 기간: {format(new Date(startDate), 'yyyy년 MM월 dd일')} ~ {format(new Date(endDate), 'yyyy년 MM월 dd일')}
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

      {!loading && !error && salesAnalytics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">매출 현황</h3>
              <p className="text-3xl font-bold text-green-600 mb-2">
                {formatPrice(salesAnalytics.totalPaidAmount)}
              </p>
              <div className="flex gap-3 text-sm">
                <span className="text-blue-600 font-medium">
                  {formatMultiCurrency(salesAnalytics.totalPaidAmount).jpy}
                </span>
                <span className="text-green-600 font-medium">
                  {formatMultiCurrency(salesAnalytics.totalPaidAmount).usd}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                총 {salesAnalytics.totalPaidOrders}개 주문
              </p>
            </div>
          </div>

          {/* Delivery Methods Breakdown */}
          <div className="gap-6">
            {/* Paid Orders Delivery Methods */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">배송 방법별 - 결제 완료</h3>
                <p className="text-sm text-gray-600">Delivery Methods - Paid Orders</p>
              </div>
              <div className="p-6">
                {salesAnalytics.paidDeliveryMethods.length > 0 ? (
                  <div className="space-y-4">
                    {salesAnalytics.paidDeliveryMethods.map((dm) => (
                      <div key={dm.method} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 capitalize">
                              {getDeliveryMethodLabel(dm.method)}
                            </p>
                            <p className="text-sm text-gray-600">{dm.count}개 주문</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {formatPrice(dm.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-blue-600">
                            {formatMultiCurrency(dm.amount).jpy}
                          </span>
                          <span className="text-green-600">
                            {formatMultiCurrency(dm.amount).usd}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">데이터 없음</p>
                )}
              </div>
            </div>

            {/* Waiting Orders Delivery Methods */}
            {/* <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                <h3 className="text-lg font-semibold text-gray-900">배송 방법별 - 결제 대기</h3>
                <p className="text-sm text-gray-600">Delivery Methods - Waiting Orders</p>
              </div>
              <div className="p-6">
                {salesAnalytics.waitingDeliveryMethods.length > 0 ? (
                  <div className="space-y-4">
                    {salesAnalytics.waitingDeliveryMethods.map((dm) => (
                      <div key={dm.method} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 capitalize">
                              {getDeliveryMethodLabel(dm.method)}
                            </p>
                            <p className="text-sm text-gray-600">{dm.count}개 주문</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              {formatPrice(dm.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-blue-600">
                            {formatMultiCurrency(dm.amount).jpy}
                          </span>
                          <span className="text-green-600">
                            {formatMultiCurrency(dm.amount).usd}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">데이터 없음</p>
                )}
              </div>
            </div> */}
          </div>

          {/* Product Sales Accordion */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">판매된 상품</h3>
              <p className="text-sm text-gray-600 mt-1">Product sales with delivery method breakdown</p>
            </div>
            <div className="divide-y divide-gray-200">
              {salesAnalytics.productSales.map((product) => {
                const isExpanded = expandedProductId === product.productId;
                // Filter out "No Option" entries
                const hasRealOptions = product.options.length > 1 ||
                  (product.options.length === 1 && product.options[0].option !== 'No Option');
                const displayOptions = product.options.filter(opt => opt.option !== 'No Option');

                return (
                  <div key={`product-${product.productId}`} className="border-b border-gray-200 last:border-0">
                    {/* Product Header - Clickable */}
                    <button
                      onClick={() => toggleProduct(product.productId)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              isExpanded ? 'transform rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          <div>
                            <h4 className="font-bold text-gray-900 text-base">{product.productName}</h4>
                            <div className="flex gap-3 mt-1 text-xs text-gray-600">
                              {product.deliveryMethods.map((dm) => (
                                <span key={dm.method}>
                                  {getDeliveryMethodLabel(dm.method)}: {dm.quantity}개
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-gray-900 text-base">{product.totalQuantity}개</div>
                        <div className="font-bold text-gray-900">
                          {formatPrice(product.totalRevenue)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatMultiCurrency(product.totalRevenue).jpy} / {formatMultiCurrency(product.totalRevenue).usd}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-gray-50">
                        <div className="space-y-4">
                          {/* Delivery Method Breakdown for Product Total */}
                          <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">배송 방법별 판매</h5>
                            <div className="space-y-2">
                              {product.deliveryMethods.map((dm) => (
                                <div
                                  key={`delivery-${dm.method}`}
                                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                      {getDeliveryMethodLabel(dm.method)}
                                    </span>
                                    <span className="text-sm text-gray-600">{dm.quantity}개</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {formatPrice(dm.revenue)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatMultiCurrency(dm.revenue).jpy} / {formatMultiCurrency(dm.revenue).usd}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Options Breakdown (only if there are real options) */}
                          {hasRealOptions && displayOptions.length > 0 && (
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h5 className="text-sm font-semibold text-gray-700 mb-3">옵션별 판매</h5>
                              <div className="space-y-4">
                                {displayOptions.map((opt) => (
                                  <div key={`option-${opt.option}`} className="border-l-2 border-blue-200 pl-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="font-medium text-gray-900">{opt.option}</div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium text-gray-900">{opt.quantity}개</div>
                                        <div className="text-sm text-gray-900">
                                          {formatPrice(opt.revenue)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {formatMultiCurrency(opt.revenue).jpy} / {formatMultiCurrency(opt.revenue).usd}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Delivery methods for this option */}
                                    <div className="space-y-1 mt-2">
                                      {opt.deliveryMethods.map((dm) => (
                                        <div
                                          key={`option-delivery-${dm.method}`}
                                          className="flex justify-between items-center py-1.5 text-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                              {getDeliveryMethodLabel(dm.method)}
                                            </span>
                                            <span className="text-gray-600">{dm.quantity}개</span>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm text-gray-700">
                                              {formatPrice(dm.revenue)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {formatMultiCurrency(dm.revenue).jpy} / {formatMultiCurrency(dm.revenue).usd}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
