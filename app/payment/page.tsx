"use client";

import { useState, useEffect } from "react";
import { getCart, getCartTotal, type CartItem } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import Link from "next/link";
import { AddressSearch } from "@/components/AddressSearch";

type DeliveryMethod = "국내배송" | "해외배송" | "직접수령";

// Replace this with your actual API key
const JUSO_API_KEY = process.env.NEXT_PUBLIC_JUSO_API_KEY || "YOUR_API_KEY_HERE";

export default function PaymentPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("국내배송");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load cart from localStorage on mount (client-side only)
    const currentCart = getCart();
    setCartItems(currentCart);

    // Listen for cart updates
    const handleCartUpdate = (event: CustomEvent) => {
      setCartItems(event.detail);
    };

    window.addEventListener("cartUpdated", handleCartUpdate as EventListener);

    // Listen for messages from payment popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      const { type, orderId, message, data } = event.data;

      console.log('Received message from popup:', event.data);

      if (type === 'PAYMENT_CALLBACK') {
        // EasyPay callback received via POST
        const { resCd, resMsg, shopOrderNo, ordNo, authorizationId } = data || {};

        console.log('Processing payment callback:', { resCd, resMsg, shopOrderNo, authorizationId });

        if (resCd !== '0000') {
          // Payment failed
          alert(`결제 실패: ${resMsg || '알 수 없는 오류'}`);
          sessionStorage.removeItem('pendingOrder');
          sessionStorage.removeItem('currentShopOrderNo');
          return;
        }

        // Payment successful - verify and create order
        try {
          // Try to get from sessionStorage first, then localStorage as fallback
          let pendingOrderData = sessionStorage.getItem('pendingOrder');
          let storedShopOrderNo = sessionStorage.getItem('currentShopOrderNo');

          if (!pendingOrderData) {
            pendingOrderData = localStorage.getItem('pendingOrder');
            storedShopOrderNo = localStorage.getItem('currentShopOrderNo');
          }

          if (!pendingOrderData || shopOrderNo !== storedShopOrderNo) {
            throw new Error('주문 정보가 일치하지 않습니다.');
          }

          const { orderData, cartItems } = JSON.parse(pendingOrderData);

          // Verify payment with approval API
          const approvalRes = await fetch('/api/payment/approve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shopOrderNo: shopOrderNo,
              amount: orderData.total_amount,
              authorizationId: authorizationId, // Pass authorizationId to approval API
            }),
          });

          const approvalData = await approvalRes.json();
          console.log('Approval response:', approvalData);

          if (!approvalData.success) {
            // Enhanced error message for R102 and other errors
            let errorMessage = approvalData.message || '결제 확인 실패';

            // If there's troubleshooting info, log it
            if (approvalData.troubleshooting) {
              console.error('Troubleshooting info:', approvalData.troubleshooting);
            }

            // Add error code to message if available
            if (approvalData.code) {
              errorMessage = `[${approvalData.code}] ${errorMessage}`;
            }

            throw new Error(errorMessage);
          }

          // Create order
          orderData.easy_pay_id = approvalData.data?.paymentId || ordNo || shopOrderNo;

          const { createOrder } = await import('@/lib/orders');
          const result = await createOrder(orderData, cartItems);

          if (!result.success) {
            const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
              ? String(result.error.message)
              : "주문 생성 중 오류가 발생했습니다";
            throw new Error(errorMessage);
          }

          // Send order confirmation email
          if (result.data?.order && result.data?.items) {
            try {
              const { sendOrderConfirmationEmail } = await import('@/lib/email');

              // Format order date
              const orderDate = new Date(result.data.order.created_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Prepare email data
              await sendOrderConfirmationEmail({
                orderId: result.data.order.id,
                customerName: result.data.order.name,
                customerEmail: result.data.order.email,
                orderDate: orderDate,
                items: result.data.items.map((item) => ({
                  productName: `상품 ID: ${item.product_id}`,
                  productOption: item.option,
                  quantity: item.quantity,
                  totalPrice: item.total_price,
                })),
                totalAmount: result.data.order.total_amount,
                deliveryMethod: result.data.order.delivery_method,
                address: result.data.order.address,
                phoneNum: result.data.order.phone_num,
              });

              console.log('Order confirmation email sent successfully');
            } catch (emailError) {
              // Log email error but don't fail the order
              console.error('Failed to send order confirmation email:', emailError);
              // Order was created successfully, so we continue even if email fails
            }
          }

          // Success - clear storage from both session and local storage
          sessionStorage.removeItem('pendingOrder');
          sessionStorage.removeItem('currentShopOrderNo');
          localStorage.removeItem('pendingOrder');
          localStorage.removeItem('currentShopOrderNo');

          const { clearCart } = await import('@/lib/cart');
          clearCart();

          // Redirect to complete page
          window.location.href = `/payment/complete?orderId=${result.data?.order.id}`;

        } catch (error) {
          console.error('Payment processing error:', error);
          alert(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
          sessionStorage.removeItem('pendingOrder');
          sessionStorage.removeItem('currentShopOrderNo');
          localStorage.removeItem('pendingOrder');
          localStorage.removeItem('currentShopOrderNo');
        }

      } else if (type === 'PAYMENT_SUCCESS') {
        // Payment successful - redirect to complete page
        window.location.href = `/payment/complete?orderId=${orderId}`;
      } else if (type === 'PAYMENT_FAILED' || type === 'PAYMENT_ERROR') {
        // Payment failed - show error message
        alert(`결제 실패: ${message || '알 수 없는 오류'}`);
        sessionStorage.removeItem('pendingOrder');
        sessionStorage.removeItem('currentShopOrderNo');
        localStorage.removeItem('pendingOrder');
        localStorage.removeItem('currentShopOrderNo');
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate as EventListener);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Note: Payment callback is now handled by /payment/callback page
  // which communicates with this page via postMessage for popup flow

  const requestPayment = async () => {
    try {
      // Calculate goods name from cart items
      const goodsName = cartItems.length === 1
        ? cartItems[0].productName
        : `${cartItems[0].productName} 외 ${cartItems.length - 1}건`;

      // Call our server-side payment registration API
      const registrationRes = await fetch('/api/payment/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Charset': 'UTF-8'
        },
        body: JSON.stringify({
          amount: finalTotal,
          orderInfo: {
            goodsName: goodsName,
          },
        }),
      });

      const registrationData = await registrationRes.json();
      console.log(registrationData.message);

      if (!registrationData.success || !registrationData.authPageUrl) {
        throw new Error(registrationData.message || 'Payment registration failed');
      }

      // Store the shop order number for later verification in both storages
      sessionStorage.setItem('currentShopOrderNo', registrationData.shopOrderNo);
      localStorage.setItem('currentShopOrderNo', registrationData.shopOrderNo);

      // Open payment window in popup, fallback to redirect if blocked
      const features = 'width=600,height=680,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';
      const win = typeof window !== 'undefined'
        ? window.open(registrationData.authPageUrl, 'easypay_payment', features)
        : null;

      if (!win) {
        // Popup blocked, redirect to payment page
        window.location.href = registrationData.authPageUrl;
        return;
      }

      // Payment window opened successfully
      // The window will send a postMessage back when EasyPay redirects to our callback
      console.log('Payment window opened successfully');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`결제창 요청 실패: ${errorMessage}`);
      throw e;
    }
  };

  const handleAddressSelect = (
    selectedAddress: string,
    selectedZipCode: string
  ) => {
    setAddress(selectedAddress);
    setZipCode(selectedZipCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      alert("이름을 입력해주세요");
      return;
    }
    if(!email.trim()){
      alert("이메일을 입력해주세요")
      return;
    }
    if (!phone.trim()) {
      alert("전화번호를 입력해주세요");
      return;
    }
    if (deliveryMethod !== "직접수령" && !address.trim()) {
      alert("주소를 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare address string (combine all address fields)
      const fullAddress = deliveryMethod !== "직접수령"
        ? `[${zipCode}] ${address} ${addressDetail}`.trim()
        : null;

      // Prepare order data (but don't create in DB yet)
      const orderData = {
        name: name,
        email: email,
        phone_num: phone,
        address: fullAddress,
        delivery_method: deliveryMethod,
        total_amount: finalTotal,
        easy_pay_id: null,
      };

      // Store order data in both sessionStorage and localStorage for use after payment success
      // sessionStorage for popup flow, localStorage as fallback for redirect flow
      const pendingOrderJson = JSON.stringify({
        orderData,
        cartItems
      });
      sessionStorage.setItem('pendingOrder', pendingOrderJson);
      localStorage.setItem('pendingOrder', pendingOrderJson);

      // Request payment - order will be created in callback after successful payment
      await requestPayment();
    } catch (error) {
      console.error("Payment error:", error);
      alert(error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      sessionStorage.removeItem('pendingOrder');
      sessionStorage.removeItem('currentShopOrderNo');
      localStorage.removeItem('pendingOrder');
      localStorage.removeItem('currentShopOrderNo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = getCartTotal();
  const deliveryFee = deliveryMethod === "해외배송" ? 12000 : deliveryMethod === "국내배송" ? 3000 : 0;
  const finalTotal = total + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
        <main className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-semibold text-black mb-8">
            Payment
          </h1>
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-12 text-center">
            <p className="text-zinc-600 mb-6">
              Your cart is empty
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8">
        <Link href=".." className="inline-flex items-center gap-2 text-zinc-700 hover:text-black transition-colors mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="font-medium">Back</span>
        </Link>
        <h1 className="text-3xl font-semibold text-black mb-8">
          Payment
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-1 lg:order-1">
            <h2 className="text-xl font-semibold text-black mb-4">
              Order Summary
            </h2>
            <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.option || "default"}`}
                    className="flex justify-between items-start gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-black">
                        {item.productName}
                      </h3>
                      {item.option && (
                        <p className="text-sm text-zinc-600">
                          {item.option}
                        </p>
                      )}
                      <p className="text-sm text-zinc-600">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-base font-medium text-black">
                      {formatKRW(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Subtotal</span>
                  <span className="text-black">{formatKRW(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Delivery Fee</span>
                  <span className="text-black">
                    {deliveryFee === 0 ? "Free" : formatKRW(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-zinc-200">
                  <span className="text-black">Total</span>
                  <span className="text-black">{formatKRW(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="order-2 lg:order-2">
            <h2 className="text-xl font-semibold text-black mb-4">
              Delivery Information
            </h2>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
              {/* Name */}
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-black mb-2"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="홍길동"
                  required
                />
              </div>
              {/* Email */}
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-black mb-2"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="honggildong@gmail.com"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="mb-6">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-black mb-2"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              {/* Delivery Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-2">
                  Delivery Method <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {(["국내배송", "해외배송", "직접수령"] as DeliveryMethod[]).map((method) => (
                    <label
                      key={method}
                      className="flex items-center gap-3 p-3 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={method}
                        checked={deliveryMethod === method}
                        onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                        className="w-4 h-4 text-black"
                      />
                      <span className="text-black">{method}</span>
                      {method === "해외배송" && (
                        <span className="ml-auto text-sm text-zinc-600">
                          +{formatKRW(12000)}
                        </span>
                      )}
                      {method === "국내배송" && (
                        <span className="ml-auto text-sm text-zinc-600">
                          +{formatKRW(3000)}
                        </span>
                      )}
                      {method === "직접수령" && (
                        <span className="ml-auto text-sm text-zinc-600">
                          무료
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Address */}
              {deliveryMethod !== "직접수령" && (
                <div className="mb-6 space-y-4">
                  {/* Only show address search for domestic delivery */}
                  {deliveryMethod === "국내배송" && (
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        주소 검색
                      </label>
                      <AddressSearch
                        onSelectAddress={handleAddressSelect}
                        apiKey={JUSO_API_KEY}
                      />
                    </div>
                  )}

                  {/* Show postal code field when address is selected or for international shipping */}
                  {(zipCode || deliveryMethod === "해외배송") && (
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        우편번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        readOnly={deliveryMethod === "국내배송"}
                        disabled={deliveryMethod === "국내배송"}
                        className={`w-full px-4 py-2 border border-zinc-300 rounded-md text-black ${
                          deliveryMethod === "국내배송"
                            ? "bg-zinc-100"
                            : "bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                        }`}
                        placeholder={deliveryMethod === "해외배송" ? "우편번호를 입력하세요" : ""}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-black mb-2"
                    >
                      도로명 주소 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      readOnly={deliveryMethod === "국내배송"}
                      disabled={deliveryMethod === "국내배송"}
                      className={`w-full px-4 py-2 border border-zinc-300 rounded-md text-black ${
                        deliveryMethod === "국내배송"
                          ? "bg-zinc-100"
                          : "bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      }`}
                      placeholder={deliveryMethod === "국내배송" ? "주소 검색 버튼을 클릭하세요" : "주소를 입력하세요"}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="addressDetail"
                      className="block text-sm font-medium text-black mb-2"
                    >
                      상세 주소
                    </label>
                    <input
                      type="text"
                      id="addressDetail"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      placeholder="상세 주소를 입력하세요 (예: 101동 101호)"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 bg-black text-white rounded-md font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : "Complete Payment"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
