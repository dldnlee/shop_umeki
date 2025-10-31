"use client";

import { useState, useEffect } from "react";
import { getCart, getCartTotal, type CartItem } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import Link from "next/link";
import { AddressSearchPopup } from "@/components/AddressSearchPopup";

type DeliveryMethod = "국내배송" | "해외배송" | "직접수령";

// Replace this with your actual API key
const JUSO_API_KEY = process.env.NEXT_PUBLIC_JUSO_API_KEY || "YOUR_API_KEY_HERE";

export default function PaymentPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getCart());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("국내배송");

  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent) => {
      setCartItems(event.detail);
    };

    window.addEventListener("cartUpdated", handleCartUpdate as EventListener);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate as EventListener);
    };
  }, []);

  const handleAddressSelect = (
    selectedAddress: string,
    selectedZipCode: string,
    detailAddr?: string
  ) => {
    setAddress(selectedAddress);
    setZipCode(selectedZipCode);
    if (detailAddr) {
      setAddressDetail(detailAddr);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      alert("이름을 입력해주세요");
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

    // Process payment
    const fullAddress = addressDetail
      ? `${address}, ${addressDetail}`
      : address;

    console.log("Processing payment:", {
      name,
      phone,
      address: fullAddress,
      zipCode,
      deliveryMethod,
      items: cartItems,
      total: getCartTotal(),
    });

    alert("결제가 완료되었습니다!");
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
                  placeholder="Enter your name"
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
                      주소 검색 <span className="text-red-500">*</span>
                    </label>
                    <AddressSearchPopup
                      onSelectAddress={handleAddressSelect}
                      apiKey={JUSO_API_KEY}
                    />
                  </div>

                  {zipCode && (
                    <div>
                      <label className="block text-sm font-medium text-black dark:text-white mb-2">
                        우편번호
                      </label>
                      <input
                        type="text"
                        value={zipCode}
                        readOnly
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
                className="w-full py-3 px-6 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium text-lg hover:opacity-90 transition-opacity"
              >
                Complete Payment
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
