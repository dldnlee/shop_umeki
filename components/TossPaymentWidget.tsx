'use client'

import { loadTossPayments, ANONYMOUS, TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk"
import { useEffect, useState, useCallback } from "react";

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

export interface TossPaymentWidgetProps {
  /** 결제 금액 (KRW) */
  amount: number;
  /** 주문 ID - 고유해야 함 */
  orderId: string;
  /** 주문 이름 (예: "토스 티셔츠 외 2건") */
  orderName: string;
  /** 고객 이메일 */
  customerEmail: string;
  /** 고객 이름 */
  customerName: string;
  /** 고객 전화번호 (선택사항) */
  customerMobilePhone?: string;
  /** 결제 성공 시 콜백 URL */
  successUrl: string;
  /** 결제 실패 시 콜백 URL */
  failUrl: string;
  /** 회원 결제시 고객 키 (선택사항, 없으면 비회원 결제) */
  customerKey?: string;
  /** 쿠폰 사용 여부 (선택사항) */
  enableCoupon?: boolean;
  /** 쿠폰 할인 금액 (선택사항) */
  couponAmount?: number;
  /** 결제 준비 완료 시 콜백 */
  onReady?: () => void;
  /** 에러 발생 시 콜백 */
  onError?: (error: Error) => void;
  /** 결제 요청 전 콜백 - 주문 데이터 저장 등에 사용 */
  onBeforePaymentRequest?: () => void | Promise<void>;
}

export default function TossPaymentWidget({
  amount,
  orderId,
  orderName,
  customerEmail,
  customerName,
  customerMobilePhone,
  successUrl,
  failUrl,
  customerKey,
  enableCoupon = false,
  couponAmount = 5000,
  onReady,
  onError,
  onBeforePaymentRequest,
}: TossPaymentWidgetProps) {
  const [currentAmount, setCurrentAmount] = useState({
    currency: "KRW" as const,
    value: amount,
  });
  const [ready, setReady] = useState(false);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets>();
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  // Update amount when prop changes
  useEffect(() => {
    setCurrentAmount(prev => ({
      ...prev,
      value: amount,
    }));
  }, [amount]);

  // Initialize Toss Payments widgets
  useEffect(() => {
    async function fetchPaymentWidgets() {
      try {
        const tossPayments = await loadTossPayments(clientKey as string);

        // 회원 결제 또는 비회원 결제
        const widgets = customerKey
          ? tossPayments.widgets({ customerKey })
          : tossPayments.widgets({ customerKey: ANONYMOUS });

        setWidgets(widgets);
      } catch (error) {
        console.error("Error fetching payment widget:", error);
        onError?.(error instanceof Error ? error : new Error("Failed to load payment widget"));
      }
    }

    fetchPaymentWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerKey]);

  // Render payment widgets
  useEffect(() => {
    async function renderPaymentWidgets() {
      if (widgets == null) {
        return;
      }

      try {
        // 주문서의 결제 금액 설정
        await widgets.setAmount(currentAmount);

        await Promise.all([
          // 결제 UI 렌더링
          widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          // 이용약관 UI 렌더링
          widgets.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);

        setReady(true);
        onReady?.();
      } catch (error) {
        console.error("Error rendering payment widgets:", error);
        onError?.(error instanceof Error ? error : new Error("Failed to render payment widget"));
      }
    }

    renderPaymentWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, currentAmount]);

  // Handle coupon toggle
  const handleCouponChange = useCallback(async (checked: boolean) => {
    const newAmount = checked
      ? currentAmount.value - couponAmount
      : currentAmount.value + couponAmount;

    await widgets?.setAmount({
      currency: currentAmount.currency,
      value: newAmount,
    });

    setCurrentAmount(prev => ({
      ...prev,
      value: newAmount,
    }));
    setIsCouponApplied(checked);
  }, [widgets, currentAmount, couponAmount]);

  // Handle payment request
  const handlePaymentRequest = useCallback(async () => {
    try {
      // Call onBeforePaymentRequest callback before initiating payment
      if (onBeforePaymentRequest) {
        await onBeforePaymentRequest();
      }

      await widgets?.requestPayment({
        orderId,
        orderName,
        successUrl,
        failUrl,
        customerEmail,
        customerName,
        customerMobilePhone,
      });
    } catch (error) {
      console.error("Payment request error:", error);
      onError?.(error instanceof Error ? error : new Error("Payment request failed"));
    }
  }, [widgets, orderId, orderName, successUrl, failUrl, customerEmail, customerName, customerMobilePhone, onError, onBeforePaymentRequest]);

  return (
    <div className="toss-payment-widget">
      {/* 결제 UI */}
      <div id="payment-method" className="mb-4" />

      {/* 이용약관 UI */}
      <div id="agreement" className="mb-4" />

      {/* 쿠폰 체크박스 (선택사항) */}
      {enableCoupon && (
        <div className="mb-6 px-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCouponApplied}
              disabled={!ready}
              onChange={(e) => handleCouponChange(e.target.checked)}
              className="w-5 h-5 text-black rounded focus:ring-2 focus:ring-zinc-400"
            />
            <span className="text-sm text-black">
              {couponAmount.toLocaleString()}원 쿠폰 적용
            </span>
          </label>
        </div>
      )}

      {/* 결제하기 버튼 */}
      <button
        type="button"
        disabled={!ready}
        onClick={handlePaymentRequest}
        className="w-full py-3 px-6 bg-black text-white rounded-md font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {ready ? "결제하기" : "결제 준비 중..."}
      </button>
    </div>
  );
}
