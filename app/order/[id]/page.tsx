"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/lib/orders";

type Order = {
  id: string;
  easy_pay_id?: string | null;
  name: string;
  email: string;
  phone_num?: string | null;
  address?: string | null;
  order_status?: string;
  delivery_method: string;
  total_amount: number;
  created_at: string;
  updated_at?: string;
  customs_code?: string | null;
};

type OrderItem = {
  id: number;
  order_id: string;
  product_id: number;
  product_name?: string;
  quantity: number;
  option?: string | null;
  total_price: number;
};

/**
 * Order Details Page
 *
 * Displays detailed information about a specific order
 */
export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customsCode, setCustomsCode] = useState("");
  const [isSavingCustomsCode, setIsSavingCustomsCode] = useState(false);
  const [customsCodeMessage, setCustomsCodeMessage] = useState("");

  // Detect order type from URL - if ID ends with "_hypetown", it's a hypetown order
  const orderType = orderId?.endsWith("_hypetown") ? "hypetown" : "original";
  const cleanOrderId = orderId?.replace("_hypetown", "");

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!cleanOrderId) {
        setError("주문번호가 유효하지 않습니다");
        setLoading(false);
        return;
      }

      try {
        const result = await getOrderById(cleanOrderId, orderType);

        if (result.success && result.data) {
          setOrder(result.data.order);
          setItems(result.data.items || []);
          setCustomsCode(result.data.order.customs_code || "");
        } else {
          setError("주문을 찾을 수 없습니다. 주문번호를 확인해주세요.");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [cleanOrderId, orderType]);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  // Get status display text
  const getStatusText = (status?: string) => {
    switch (status) {
      case "paid":
        return "결제 완료";
      case "shipped":
        return "배송 중";
      case "delivered":
        return "배송 완료";
      case "cancelled":
        return "주문 취소";
      default:
        return "처리 중";
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  };

  // Handle customs code save
  const handleSaveCustomsCode = async () => {
    if (!cleanOrderId) return;

    setIsSavingCustomsCode(true);
    setCustomsCodeMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${cleanOrderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customsCode }),
      });

      if (response.ok) {
        setCustomsCodeMessage("통관 코드가 저장되었습니다.");
        // Update the order state
        if (order) {
          setOrder({ ...order, customs_code: customsCode });
        }
      } else {
        setCustomsCodeMessage("저장 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("Error saving customs code:", err);
      setCustomsCodeMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingCustomsCode(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-zinc-600">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
        <main className="max-w-2xl mx-auto p-8 pt-24">
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-8 md:p-12 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-black mb-4">
              주문을 찾을 수 없습니다
            </h1>
            <p className="text-zinc-600 mb-8">{error}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-zinc-200 text-black rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                돌아가기
              </button>
              <Link
                href="/order"
                className="px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                다시 조회하기
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Success state - display order details
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8 pt-24">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-zinc-600 hover:text-black transition-colors mb-4 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            돌아가기
          </button>
          <h1 className="text-3xl font-semibold text-black">주문 상세</h1>
        </div>

        <div className="space-y-6">{/* Customs Code Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">통관 정보</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="customsCode" className="block text-sm font-medium text-zinc-700 mb-2">
                  통관 코드
                </label>
                <div className="flex gap-3">
                  <input
                    id="customsCode"
                    type="text"
                    value={customsCode}
                    onChange={(e) => setCustomsCode(e.target.value)}
                    placeholder="통관 코드를 입력하세요"
                    className="flex-1 px-4 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <button
                    onClick={handleSaveCustomsCode}
                    disabled={isSavingCustomsCode}
                    className="px-6 py-2 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingCustomsCode ? "저장 중..." : "저장"}
                  </button>
                </div>
                {customsCodeMessage && (
                  <p className={`mt-2 text-sm ${customsCodeMessage.includes("오류") ? "text-red-600" : "text-green-600"}`}>
                    {customsCodeMessage}
                  </p>
                )}
              </div>
              {order.customs_code && (
                <div className="flex justify-between text-sm pt-3 border-t border-zinc-200">
                  <span className="text-zinc-600">저장된 통관 코드</span>
                  <span className="font-mono text-black">{order.customs_code}</span>
                </div>
              )}
            </div>
          </div>
          {/* Order Status Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-black">주문 정보</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  order.order_status
                )}`}
              >
                {getStatusText(order.order_status)}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">주문번호</span>
                <span className="font-mono font-medium text-black">
                  {order.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">주문일시</span>
                <span className="text-black">{formatDate(order.created_at)}</span>
              </div>
              {order.easy_pay_id && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">결제 ID</span>
                  <span className="font-mono text-black">{order.easy_pay_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">주문 상품</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start pb-4 border-b border-zinc-200 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-black mb-1">
                      {item.product_name || `상품 #${item.product_id}`}
                    </p>
                    {item.option && (
                      <p className="text-sm text-zinc-600 mb-1">
                        옵션: {item.option}
                      </p>
                    )}
                    <p className="text-sm text-zinc-600">수량: {item.quantity}개</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black">
                      {formatCurrency(item.total_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Amount */}
            <div className="mt-6 pt-6 border-t border-zinc-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-black">총 결제금액</span>
                <span className="text-2xl font-bold text-black">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">고객 정보</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">이름</span>
                <span className="text-black">{order.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">이메일</span>
                <span className="text-black">{order.email}</span>
              </div>
              {order.phone_num && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">연락처</span>
                  <span className="text-black">{order.phone_num}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Info Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">배송 정보</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">배송 방법</span>
                <span className="text-black">
                  {order.delivery_method === "delivery" ? "배송" : "직접 수령"}
                </span>
              </div>
              {order.address && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">배송 주소</span>
                  <span className="text-black text-right max-w-xs">
                    {order.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity text-center"
            >
              쇼핑 계속하기
            </Link>
            <Link
              href="/order"
              className="flex-1 px-6 py-3 bg-zinc-200 text-black rounded-md font-medium hover:opacity-90 transition-opacity text-center"
            >
              다른 주문 조회
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
