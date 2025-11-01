"use client";

import { useState, useEffect } from "react";
import { getCart, getCartTotal, clearCart, type CartItem } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import Link from "next/link";
import { AddressSearch } from "@/components/AddressSearch";
import { createOrder } from "@/lib/orders";

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

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate as EventListener);
    };
  }, []);

  const requestPayment = async () => {
    try {
      // setPaying(true);
      // setPayResult(null);
      const deviceType = typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'pc';
      const webpayPath = 'https://pgapi.easypay.co.kr/api/ep9/trades/webpay';
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const shopOrderNo = `${yyyy}${mm}${dd}${Math.floor(Math.random()*1e9)}`;
      const webpayRes = await fetch(webpayPath, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Charset': 'UTF-8'
        },
        body: JSON.stringify({
          mallId: "GD003712",
          shopOrderNo: shopOrderNo,
          amount: total,
          payMethodTypeCode: 11,
          currency: "00",
          returnUrl: "http://localhost:3000/payment",
          deviceTypeCode: deviceType,
          clientTypeCode: "00",
          orderInfo: {
            goodsName: "굿즈",
          }
        }),
      });
      const webpayData = await webpayRes.json();
      if (!webpayRes.ok || webpayData?.resCd !== '0000' || !webpayData?.authPageUrl) {
        throw new Error(webpayData?.resMsg || 'webpay_failed');
      }
      
      // open payment in popup, fallback to redirect if blocked
      const features = 'width=600,height=680,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';
      const win = typeof window !== 'undefined' ? window.open(webpayData.authPageUrl as string, 'easypay_payment', features) : null;
      if (!win) {
        window.location.href = webpayData.authPageUrl as string;
        return;
      }
    } catch (e : any) {
      alert(`결제창 요청 실패: ${e?.message || e}`);
    }
    return;
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
      requestPayment();
      // Prepare address string (combine all address fields)
      const fullAddress = deliveryMethod !== "직접수령"
        ? `[${zipCode}] ${address} ${addressDetail}`.trim()
        : null;

      // Create order in database
      const orderData = {
        name: name,
        email: email,
        phone_num: phone,
        address: fullAddress,
        delivery_method: deliveryMethod,
        total_amount: finalTotal,
        easy_pay_id: null,
      };

      const result = await createOrder(orderData, cartItems);

      if (result.success) {
        // Clear cart after successful order
        // clearCart();

        alert(`결제가 완료되었습니다!\n주문번호: ${result.data?.order.id}`);

        // Optionally redirect to order confirmation page
        // window.location.href = `/order/${result.data?.order.id}`;
      } else {
        const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
          ? String(result.error.message)
          : "주문 생성 중 오류가 발생했습니다";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = getCartTotal();
  const deliveryFee = deliveryMethod === "해외배송" ? 12000 : deliveryMethod === "국내배송" ? 3000 : 0;
  const finalTotal = total + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
        <main className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-semibold text-black dark:text-white mb-8">
            Payment
          </h1>
          <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Your cart is empty
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8">
        <Link href="..">
          {'< Back'}
        </Link>
        <h1 className="text-3xl font-semibold text-black dark:text-white mb-8">
          Payment
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
              Order Summary
            </h2>
            <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-6">
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.option || "default"}`}
                    className="flex justify-between items-start gap-4"
                  >
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-black dark:text-white">
                        {item.productName}
                      </h3>
                      {item.option && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.option}
                        </p>
                      )}
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-base font-medium text-black dark:text-white">
                      {formatKRW(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
                  <span className="text-black dark:text-white">{formatKRW(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Delivery Fee</span>
                  <span className="text-black dark:text-white">
                    {deliveryFee === 0 ? "Free" : formatKRW(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-black dark:text-white">Total</span>
                  <span className="text-black dark:text-white">{formatKRW(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="order-1 lg:order-2">
            <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
              Delivery Information
            </h2>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-6">
              {/* Name */}
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-black dark:text-white mb-2"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="홍길동"
                  required
                />
              </div>
              {/* Email */}
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-black dark:text-white mb-2"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="honggildong@gmail.com"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="mb-6">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-black dark:text-white mb-2"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              {/* Delivery Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Delivery Method <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {(["국내배송", "해외배송", "직접수령"] as DeliveryMethod[]).map((method) => (
                    <label
                      key={method}
                      className="flex items-center gap-3 p-3 rounded-md border border-zinc-300 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={method}
                        checked={deliveryMethod === method}
                        onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                        className="w-4 h-4 text-black dark:text-white"
                      />
                      <span className="text-black dark:text-white">{method}</span>
                      {method === "해외배송" && (
                        <span className="ml-auto text-sm text-zinc-600 dark:text-zinc-400">
                          +{formatKRW(12000)}
                        </span>
                      )}
                      {method === "국내배송" && (
                        <span className="ml-auto text-sm text-zinc-600 dark:text-zinc-400">
                          +{formatKRW(3000)}
                        </span>
                      )}
                      {method === "직접수령" && (
                        <span className="ml-auto text-sm text-zinc-600 dark:text-zinc-400">
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
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-2">
                      주소 검색
                    </label>
                    <AddressSearch
                      onSelectAddress={handleAddressSelect}
                      apiKey={JUSO_API_KEY}
                    />
                  </div>

                  {zipCode && (
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white mb-2">
                        우편번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={zipCode}
                        readOnly
                        disabled
                        className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-black dark:text-white mb-2"
                    >
                      도로명 주소 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={address}
                      readOnly
                      disabled
                      className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white"
                      placeholder="주소 검색 버튼을 클릭하세요"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="addressDetail"
                      className="block text-sm font-medium text-black dark:text-white mb-2"
                    >
                      상세 주소
                    </label>
                    <input
                      type="text"
                      id="addressDetail"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      placeholder="상세 주소를 입력하세요 (예: 101동 101호)"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
