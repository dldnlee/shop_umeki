"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Payment Callback Page
 *
 * This page is opened by EasyPay after payment completion.
 * It handles:
 * 1. Payment verification
 * 2. Order creation
 * 3. Closing the popup window (if opened in popup)
 * 4. Redirecting parent window to purchase complete page
 */
export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('결제 처리 중...');

  useEffect(() => {
    // Check if there's POST data (EasyPay might use form submission)
    console.log('=== Page Loaded ===');
    console.log('window.location.href:', window.location.href);
    console.log('window.location.search:', window.location.search);
    console.log('document.referrer:', document.referrer);
    console.log('==================');
    const handlePaymentCallback = async () => {
      try {
        // Get payment result from URL parameters
        const resCd = searchParams.get('resCd');
        const resMsg = searchParams.get('resMsg');
        const shopOrderNo = searchParams.get('shopOrderNo');
        const authorizationId = searchParams.get('authorizationId')

        // Debug: Log all URL parameters
        console.log('=== Callback Page URL Parameters ===');
        console.log('Full URL:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('resCd:', resCd);
        console.log('resMsg:', resMsg);
        console.log('shopOrderNo:', shopOrderNo);

        // Log all parameters
        const allParams: { [key: string]: string } = {};
        searchParams.forEach((value, key) => {
          allParams[key] = value;
        });
        console.log('All parameters:', allParams);
        console.log('===================================');

        // If no parameters at all, show a specific error
        if (!resCd && !resMsg && !shopOrderNo && searchParams.toString() === '') {
          setStatus('error');
          setMessage('결제 결과 정보가 전달되지 않았습니다. EasyPay 콜백 설정을 확인해주세요.');
          return;
        }

        // Check if payment was successful
        if (resCd !== '0000') {
          setStatus('error');
          setMessage(`결제 실패: ${resMsg || '알 수 없는 오류'}`);

          // Close popup and notify parent
          if (window.opener) {
            window.opener.postMessage({
              type: 'PAYMENT_FAILED',
              message: resMsg,
            }, window.location.origin);

            setTimeout(() => {
              window.close();
            }, 2000);
          }
          return;
        }

        // Retrieve pending order data from sessionStorage
        const pendingOrderData = sessionStorage.getItem('pendingOrder');
        const storedShopOrderNo = sessionStorage.getItem('currentShopOrderNo');

        if (!pendingOrderData || shopOrderNo !== storedShopOrderNo) {
          setStatus('error');
          setMessage('주문 정보가 일치하지 않습니다.');

          if (window.opener) {
            window.opener.postMessage({
              type: 'PAYMENT_ERROR',
              message: '주문 정보 불일치',
            }, window.location.origin);

            setTimeout(() => {
              window.close();
            }, 2000);
          }
          return;
        }

        const { orderData, cartItems } = JSON.parse(pendingOrderData);

        // Verify payment with server
        setMessage('결제 확인 중...');
        const approvalRes = await fetch('/api/payment/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopOrderNo: shopOrderNo,
            amount: orderData.total_amount,
            authorizationId: authorizationId
          }),
        });

        const approvalData = await approvalRes.json();

        console.log('Approval response:', approvalData);

        if (!approvalData.success) {
          const errorMsg = approvalData.message || '결제 승인 실패';
          const errorDetails = approvalData.details ? JSON.stringify(approvalData.details) : '';
          console.error('Payment approval failed:', errorMsg, errorDetails);
          throw new Error(`${errorMsg}${errorDetails ? ' - ' + errorDetails : ''}`);
        }

        // Create order
        setMessage('주문 생성 중...');
        orderData.easy_pay_id = approvalData.data?.paymentId || shopOrderNo;

        const { createOrder } = await import('@/lib/orders');
        const result = await createOrder(orderData, cartItems);

        if (!result.success) {
          const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
            ? String(result.error.message)
            : "주문 생성 중 오류가 발생했습니다";
          throw new Error(errorMessage);
        }

        // Success - clear storage
        sessionStorage.removeItem('pendingOrder');
        sessionStorage.removeItem('currentShopOrderNo');

        // Clear cart
        const { clearCart } = await import('@/lib/cart');
        clearCart();

        setStatus('success');
        setMessage('결제가 완료되었습니다!');

        // Notify parent window and redirect
        if (window.opener) {
          // If opened in popup, notify parent and close
          window.opener.postMessage({
            type: 'PAYMENT_SUCCESS',
            orderId: result.data?.order.id,
          }, window.location.origin);

          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // If not in popup, redirect directly
          setTimeout(() => {
            window.location.href = `/payment/complete?orderId=${result.data?.order.id}`;
          }, 1000);
        }

      } catch (error) {
        console.error('Payment callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');

        // Clean up
        sessionStorage.removeItem('pendingOrder');
        sessionStorage.removeItem('currentShopOrderNo');

        if (window.opener) {
          window.opener.postMessage({
            type: 'PAYMENT_ERROR',
            message: error instanceof Error ? error.message : '결제 처리 실패',
          }, window.location.origin);

          setTimeout(() => {
            window.close();
          }, 2000);
        }
      }
    };

    handlePaymentCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white mx-auto"></div>
            </div>
            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
              결제 처리 중
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 text-green-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
              결제 완료
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {message}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-4">
              잠시 후 페이지가 이동됩니다...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 text-red-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
              결제 실패
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {message}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-4">
              잠시 후 창이 닫힙니다...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
