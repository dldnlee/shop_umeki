"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Order Lookup Page
 *
 * Allows users to enter an order ID to view their order details
 */
export default function OrderLookupPage() {
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate order ID
    if (!orderId.trim()) {
      setError("주문번호를 입력해주세요");
      return;
    }

    // Clear any previous errors
    setError("");

    // Navigate to order details page
    router.push(`/order/${orderId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
      <main className="max-w-2xl mx-auto p-8 pt-24">
        <div className="bg-white rounded-lg border border-black/6 shadow-sm p-8 md:p-12">
          {/* Title */}
          <h1 className="text-3xl font-semibold text-black mb-2">
            주문 조회
          </h1>
          <p className="text-zinc-600 mb-8">
            주문번호를 입력하시면 주문 상세 정보를 확인하실 수 있습니다
          </p>

          {/* Order ID Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="orderId"
                className="block text-sm font-medium text-black mb-2"
              >
                주문번호
              </label>
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setError(""); // Clear error when typing
                }}
                placeholder="주문번호를 입력하세요"
                className="w-full px-4 py-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder:text-zinc-400"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              주문 조회하기
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-zinc-200">
            <h3 className="text-sm font-semibold text-black mb-4">
              주문번호를 찾을 수 없으신가요?
            </h3>
            <div className="space-y-3 text-sm text-zinc-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black">1</span>
                </div>
                <p className="text-left">결제 완료 후 발송된 이메일을 확인해주세요</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black">2</span>
                </div>
                <p className="text-left">주문번호는 결제 완료 페이지에서도 확인 가능합니다</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black">3</span>
                </div>
                <p className="text-left">문의사항이 있으시면 고객센터로 연락해주세요</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
