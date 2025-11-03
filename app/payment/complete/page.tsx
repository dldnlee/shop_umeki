"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatKRW } from "@/lib/utils";

type Order = {
  id: string;
  payment_method?: string;
  total_amount: number;
};

/**
 * Purchase Complete Page
 *
 * Displays order confirmation after successful payment.
 */
function PurchaseCompleteContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    setOrderId(orderIdParam);

    // Fetch order details to check payment method
    if (orderIdParam) {
      const fetchOrder = async () => {
        try {
          const { getOrderById } = await import('@/lib/orders');
          const result = await getOrderById(orderIdParam);
          if (result.success && result.data) {
            setOrder(result.data.order as Order);
          }
        } catch (error) {
          console.error('Error fetching order:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  // Check if it's a PayPal order
  const isPayPalOrder = order?.payment_method === "paypal";

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-zinc-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg border border-black/6 shadow-sm p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className={`w-20 h-20 ${isPayPalOrder ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto`}>
              <svg
                className={`w-12 h-12 ${isPayPalOrder ? 'text-blue-600' : 'text-green-600'}`}
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
          <h1 className="text-3xl font-semibold text-black mb-4">
            {isPayPalOrder ? '주문 접수가 완료 되었습니다' : '결제가 완료되었습니다!'}
          </h1>

          {/* Order ID */}
          {orderId && (
            <div className="mb-6">
              <p className="text-zinc-600 mb-2">
                주문번호
              </p>
              <p className="text-lg font-mono font-semibold text-black bg-zinc-100 px-4 py-2 rounded-md inline-block">
                {orderId}
              </p>
            </div>
          )}

          {/* Message - Different for PayPal */}
          {isPayPalOrder ? (
            <div className="mb-8 space-y-4">
              <p className="text-zinc-600">
                아래 계좌로 <span className="font-semibold text-black">{order && formatKRW(order.total_amount)}</span>을 입금해주세요
              </p>
              <div className="bg-zinc-50 p-4 rounded-md">
                <p className="text-lg font-semibold text-black">
                  tkay@grigoent.co.kr
                </p>
              </div>
              <p className="text-sm text-zinc-600">
                입금 확인 후 주문 확인 메일을 보내드립니다
              </p>
            </div>
          ) : (
            <p className="text-zinc-600 mb-8">
              주문이 성공적으로 완료되었습니다.<br />
              입력하신 이메일로 주문 확인 메일이 발송됩니다.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* {orderId && (
              <Link
                href={`/order/${orderId}`}
                className="px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                주문 상세보기
              </Link>
            )} */}
            <Link
              href="/"
              className="px-6 py-3 bg-zinc-200 text-black rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              쇼핑 계속하기
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 pt-8 border-t border-zinc-200">
            <h3 className="text-sm font-semibold text-black mb-4">
              다음 단계
            </h3>
            {isPayPalOrder ? (
              <div className="space-y-3 text-sm text-zinc-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-black">1</span>
                  </div>
                  <p className="text-left">tkay@grigoent.co.kr로 결제 금액을 송금해주세요</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-black">2</span>
                  </div>
                  <p className="text-left">입금 확인 후 주문 확인 메일을 보내드립니다</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-black">3</span>
                  </div>
                  <p className="text-left">배송 방법에 따라 상품이 발송됩니다</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-zinc-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-black">1</span>
                  </div>
                  <p className="text-left">주문 확인 메일을 확인해주세요</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-black">2</span>
                  </div>
                  <p className="text-left">배송 방법에 따라 상품이 발송됩니다</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-black">3</span>
                  </div>
                  <p className="text-left">배송 추적은 주문 상세 페이지에서 확인 가능합니다</p>
                </div>
              </div>
            )}
          </div>

          {/* Support Info */}
          {/* <div className="mt-8 p-4 bg-zinc-50 rounded-md">
            <p className="text-xs text-zinc-500">
              문의사항이 있으시면 고객센터로 연락해주세요 <span className="text-black font-semibold">1500-2000</span>
            </p>
          </div> */}
        </div>
      </main>
    </div>
  );
}

export default function PurchaseCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-zinc-600">로딩 중...</p>
        </div>
      </div>
    }>
      <PurchaseCompleteContent />
    </Suspense>
  );
}
