"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Purchase Complete Page
 *
 * Displays order confirmation after successful payment.
 */
function PurchaseCompleteContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    setOrderId(orderIdParam);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-12 h-12 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-black dark:text-white mb-4">
            결제가 완료되었습니다!
          </h1>

          {/* Order ID */}
          {orderId && (
            <div className="mb-6">
              <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                주문번호
              </p>
              <p className="text-lg font-mono font-semibold text-black dark:text-white bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-md inline-block">
                {orderId}
              </p>
            </div>
          )}

          {/* Message */}
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            주문이 성공적으로 완료되었습니다.<br />
            입력하신 이메일로 주문 확인 메일이 발송됩니다.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* {orderId && (
              <Link
                href={`/order/${orderId}`}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                주문 상세보기
              </Link>
            )} */}
            <Link
              href="/"
              className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              쇼핑 계속하기
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
              다음 단계
            </h3>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black dark:text-white">1</span>
                </div>
                <p className="text-left">주문 확인 메일을 확인해주세요</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black dark:text-white">2</span>
                </div>
                <p className="text-left">배송 방법에 따라 상품이 발송됩니다</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black dark:text-white">3</span>
                </div>
                <p className="text-left">배송 추적은 주문 상세 페이지에서 확인 가능합니다</p>
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-md">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              문의사항이 있으시면 고객센터로 연락해주세요 <span className="text-white">1500-2000</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PurchaseCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">로딩 중...</p>
        </div>
      </div>
    }>
      <PurchaseCompleteContent />
    </Suspense>
  );
}
