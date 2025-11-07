"use client";

import { useState, useEffect } from "react";
import { getCart, getCartTotal, updateCartDeliveryMethod, type CartItem, type DeliveryMethod } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import Link from "next/link";
import { AddressSearch } from "@/components/AddressSearch";

type PaymentMethod = "card" | "paypal";

// Replace this with your actual API key
const JUSO_API_KEY = process.env.NEXT_PUBLIC_JUSO_API_KEY || "YOUR_API_KEY_HERE";

// Payment method display mapping
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "신용카드" },
  // { value: "paypal", label: "PayPal" },
];

export default function PaymentPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("팬미팅현장수령");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Initialize delivery method for cart items on mount
  useEffect(() => {
    const currentCart = getCart();
    if (currentCart.length > 0 && !currentCart[0].deliveryMethod) {
      updateCartDeliveryMethod(deliveryMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
              // Format order date
              const orderDate = new Date(result.data.order.created_at).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Send email via API route
              const emailRes = await fetch('/api/email/send-order-confirmation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
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
                }),
              });

              const emailData = await emailRes.json();
              if (emailData.success) {
                console.log('Order confirmation email sent successfully');
              } else {
                console.error('Failed to send email:', emailData.error);
              }
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

  const handlePayPalPayment = async (orderData: {
    name: string;
    email: string;
    phone_num: string;
    address: string | null;
    delivery_method: DeliveryMethod;
    payment_method: PaymentMethod;
    total_amount: number;
    easy_pay_id: string | null;
  }) => {
    try {
      // For PayPal, create order directly and go to complete page
      const { createOrder } = await import('@/lib/orders');
      const result = await createOrder(orderData, cartItems);

      if (!result.success) {
        const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
          ? String(result.error.message)
          : "주문 생성 중 오류가 발생했습니다";
        throw new Error(errorMessage);
      }

      // Send PayPal pending payment email
      if (result.data?.order && result.data?.items) {
        try {
          // Format order date
          const orderDate = new Date(result.data.order.created_at).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          // Send PayPal pending email via API route
          const emailRes = await fetch('/api/email/send-paypal-pending', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
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
              paypalEmail: 'tkay@grigoent.co.kr',
            }),
          });

          const emailData = await emailRes.json();
          if (emailData.success) {
            console.log('PayPal pending payment email sent successfully');
          } else {
            console.error('Failed to send email:', emailData.error);
          }
        } catch (emailError) {
          // Log email error but don't fail the order
          console.error('Failed to send PayPal pending payment email:', emailError);
        }
      }

      // Clear cart
      const { clearCart } = await import('@/lib/cart');
      clearCart();

      // Redirect to complete page
      window.location.href = `/payment/complete?orderId=${result.data?.order.id}`;
    } catch (error) {
      console.error('PayPal payment error:', error);
      throw error;
    }
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
    if (deliveryMethod !== "팬미팅현장수령" && !address.trim()) {
      alert("주소를 입력해주세요");
      return;
    }
    if (!agreedToTerms) {
      alert("개인정보 수집 및 이용, 결제 진행에 동의해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare address string (combine all address fields)
      const fullAddress = deliveryMethod !== "팬미팅현장수령"
        ? `[${zipCode}] ${address} ${addressDetail}`.trim()
        : null;

      // Prepare order data
      const orderData = {
        name: name,
        email: email,
        phone_num: phone,
        address: fullAddress,
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        total_amount: finalTotal,
        easy_pay_id: null,
      };

      // Route based on payment method
      if (paymentMethod === "paypal") {
        // PayPal: Create order directly and go to complete page
        await handlePayPalPayment(orderData);
      } else {
        // Card: Use Easy Pay flow
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
      }
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

  // Check if all required fields are filled
  const isFormValid = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      return false;
    }
    if (deliveryMethod !== "팬미팅현장수령" && !address.trim()) {
      return false;
    }
    if (!agreedToTerms) {
      return false;
    }
    return true;
  };

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
                  {(["팬미팅현장수령", "국내배송", "해외배송"] as DeliveryMethod[]).map((method) => (
                    <label
                      key={method}
                      className="flex items-start gap-3 p-3 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={method}
                        checked={deliveryMethod === method}
                        onChange={(e) => {
                          const newMethod = e.target.value as DeliveryMethod;
                          setDeliveryMethod(newMethod);
                          // Update all cart items with the selected delivery method
                          updateCartDeliveryMethod(newMethod);
                        }}
                        className="w-4 h-4 text-black mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-black">{method}</span>
                          {method === "팬미팅현장수령" && (
                            <span className="text-sm text-zinc-600">
                              무료
                            </span>
                          )}
                          {method === "해외배송" && (
                            <span className="text-sm text-zinc-600">
                              +{formatKRW(12000)}
                            </span>
                          )}
                          {method === "국내배송" && (
                            <span className="text-sm text-zinc-600">
                              +{formatKRW(3000)}
                            </span>
                          )}
                        </div>
                        {method === "팬미팅현장수령" && (
                          <p className="text-xs text-zinc-600 mt-1">
                            * 팬미팅 현장에서 직접 수령합니다.
                          </p>
                        )}
                        {method === "국내배송" && (
                          <p className="text-xs text-zinc-600 mt-1">
                            * 팬미팅 일정 전 배송이 보장되지 않습니다.
                          </p>
                        )}
                        {method === "해외배송" && (
                          <p className="text-xs text-zinc-600 mt-1">
                            * 팬미팅 일정 전 배송이 보장되지 않습니다.
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {/* Warning for shipping options */}
                {(deliveryMethod === "국내배송" || deliveryMethod === "해외배송") && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className="text-sm text-amber-800">
                      택배 수령 시 팬미팅 일정 전에 전에 수령하기 어렵습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Address */}
              {deliveryMethod !== "팬미팅현장수령" && (
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

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.value}
                      className="flex items-center gap-3 p-3 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-4 h-4 text-black"
                      />
                      {method.value === "card" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5 text-zinc-700"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5 text-zinc-700"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                        </svg>
                      )}
                      <span className="text-black">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 p-4 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-black rounded focus:ring-2 focus:ring-zinc-400"
                  />
                  <span className="text-sm text-black flex-1">
                    개인정보 수집 및 이용, 결제 진행에 동의합니다. <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
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
