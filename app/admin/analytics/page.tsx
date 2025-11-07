'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetchSalesAnalytics();
  }, []);

  const fetchSalesAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/sales-analytics');
      const data = await response.json();

      if (response.ok) {
        setSalesAnalytics(data);
      } else {
        setError('Failed to load sales analytics');
      }
    } catch (err) {
      setError('An error occurred while loading sales analytics');
    } finally {
      setLoading(false);
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">결제 완료 (Paid)</h3>
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

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">결제 대기 (Waiting)</h3>
              <p className="text-3xl font-bold text-yellow-600 mb-2">
                {formatPrice(salesAnalytics.totalWaitingAmount)}
              </p>
              <div className="flex gap-3 text-sm">
                <span className="text-blue-600 font-medium">
                  {formatMultiCurrency(salesAnalytics.totalWaitingAmount).jpy}
                </span>
                <span className="text-green-600 font-medium">
                  {formatMultiCurrency(salesAnalytics.totalWaitingAmount).usd}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                총 {salesAnalytics.totalWaitingOrders}개 주문
              </p>
            </div>
          </div>

          {/* Delivery Methods Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
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
            </div>
          </div>

          {/* Product Sales Accordion */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">판매된 상품 (Paid Orders Only)</h3>
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
