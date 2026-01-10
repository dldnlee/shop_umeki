
'use client'

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function WidgetSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function confirm() {
      try {
        // Get pending order data from sessionStorage first, then localStorage as fallback
        // localStorage is more reliable across redirects (Toss redirects can lose sessionStorage)
        let pendingOrderJson = sessionStorage.getItem('pendingTossOrder');
        if (!pendingOrderJson) {
          pendingOrderJson = localStorage.getItem('pendingTossOrder');
        }

        if (!pendingOrderJson) {
          throw new Error('주문 정보를 찾을 수 없습니다. 결제가 완료되었다면 고객센터에 문의해주세요.');
        }

        const { orderData, cartItems } = JSON.parse(pendingOrderJson);

        const requestData = {
          orderId: searchParams.get("orderId"),
          amount: searchParams.get("amount"),
          paymentKey: searchParams.get("paymentKey"),
          orderData,
          cartItems,
        };

        const response = await fetch("/api/toss/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw { message: json.message || json.error || '결제 확인 실패', code: json.code };
        }

        // Clear pending order data from both storages
        sessionStorage.removeItem('pendingTossOrder');
        localStorage.removeItem('pendingTossOrder');

        // Clear cart
        const { clearCart } = await import('@/lib/cart');
        clearCart();

        // Redirect to complete page with order ID
        router.push(`/payment/complete?orderId=${json.orderId}`);
      } catch (error) {
        console.error('Payment confirmation error:', error);
        // Only clear storage if it's not a "order not found" error
        // This preserves data for retry or customer service recovery
        const isOrderNotFound = error instanceof Error && error.message.includes('주문 정보를 찾을 수 없습니다');
        if (!isOrderNotFound) {
          sessionStorage.removeItem('pendingTossOrder');
          localStorage.removeItem('pendingTossOrder');
        }
        const errorMessage = error instanceof Error ? error.message : '결제 확인 중 오류가 발생했습니다';
        const errorCode = (error as { code?: string })?.code || 'UNKNOWN';
        router.push(`/toss/fail?code=${errorCode}&message=${encodeURIComponent(errorMessage)}`);
      }
    }

    confirm();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p className="text-lg text-zinc-700">결제를 확인하고 있습니다...</p>
      </div>
    </div>
  );
}

export default function WidgetSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg text-zinc-700">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    }>
      <WidgetSuccessPageContent />
    </Suspense>
  );
}
