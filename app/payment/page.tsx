"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCart, getCartTotal, updateCartDeliveryMethod, type CartItem, type DeliveryMethod } from "@/lib/cart";
import { formatKRW, generateUUID } from "@/lib/utils";
import Link from "next/link";
import { AddressSearch } from "@/components/AddressSearch";
import { loadScript } from "@paypal/paypal-js";
import TossPaymentWidget from "@/components/TossPaymentWidget";
import { sendDiscordMessage } from "@/lib/discord";

type PaymentMethod = "paypal" | "toss";
type PayPalCurrency = "USD" | "JPY";

// Replace this with your actual API key
const JUSO_API_KEY = process.env.NEXT_PUBLIC_JUSO_API_KEY || "YOUR_API_KEY_HERE";
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

// Payment method display mapping
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  // { value: "card", label: "신용카드" },
  { value: "toss", label: "간편결제" },
  { value: "paypal", label: "PayPal" },
];

// Currency conversion rates (KRW to other currencies)
const CONVERSION_RATES = {
  USD: 0.00077, // 1 KRW ≈ 0.00077 USD (approximately 1300 KRW = 1 USD)
  JPY: 0.11,    // 1 KRW ≈ 0.11 JPY (approximately 9 KRW = 1 JPY)
};

export default function PaymentPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("국내배송");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("toss");
  const [paypalCurrency, setPaypalCurrency] = useState<PayPalCurrency>("USD");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isFormValid, setIsFormValid] = useState(false);
  const [orderId, setOrderId] = useState("");
  const paypalRenderingRef = useRef(false);


  // Initialize delivery method for cart items on mount
  useEffect(() => {
    const currentCart = getCart();
    if (currentCart.length > 0 && !currentCart[0].deliveryMethod) {
      updateCartDeliveryMethod(deliveryMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setOrderId(generateUUID());
  }, []); // Only run once on mount

  // Check form validity whenever relevant fields change
  useEffect(() => {
    const checkValidity = () => {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        return false;
      }
      if (deliveryMethod !== "팬미팅현장수령" && !address.trim()) {
        return false;
      }
      if (deliveryMethod === "해외배송" && (!country.trim() || !state.trim() || !city.trim())) {
        return false;
      }
      if (!agreedToTerms) {
        return false;
      }
      return true;
    };

    setIsFormValid(checkValidity());
  }, [name, email, phone, address, country, state, city, deliveryMethod, agreedToTerms]);

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

  // Calculate totals (needed by multiple functions)
  const total = getCartTotal();
  const deliveryFee = deliveryMethod === "해외배송" ? 18000 : deliveryMethod === "국내배송" ? 3000 : 0;
  const finalTotal = total + deliveryFee;

  // Currency conversion helper
  const convertKRWToCurrency = useCallback((krwAmount: number, targetCurrency: PayPalCurrency): number => {
    if (targetCurrency === "USD") {
      // Convert to USD cents
      return Math.round(krwAmount * CONVERSION_RATES.USD * 100);
    } else {
      // Convert to JPY (whole number, no decimals)
      return Math.round(krwAmount * CONVERSION_RATES.JPY);
    }
  }, []);

  // PayPal initialization function
  const initializePayPalButtons = useCallback(async () => {
    if (paymentMethod !== "paypal" || !PAYPAL_CLIENT_ID) return;

    // Prevent concurrent rendering
    if (paypalRenderingRef.current) {
      console.log('PayPal buttons already rendering, skipping');
      return;
    }

    // Check if container exists and is in the DOM
    const container = document.getElementById('paypal-button-container');
    if (!container || !container.isConnected) {
      console.warn('PayPal button container not found or not in DOM');
      return;
    }

    // Only clear if there are existing children
    if (container.children.length > 0) {
      container.innerHTML = ''; // Clear previous buttons
    }

    paypalRenderingRef.current = true;

    try {
      // Load PayPal SDK using @paypal/paypal-js
      const paypal = await loadScript({
        clientId: PAYPAL_CLIENT_ID,
        currency: paypalCurrency,
      });

      if (!paypal || !paypal.Buttons) {
        console.error('PayPal SDK failed to load');
        paypalRenderingRef.current = false;
        return;
      }

      // Render PayPal buttons
      paypal.Buttons({
        // Create order on client side and server side
        createOrder: async () => {
          try {
            // Generate unique order ID
            const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Call backend to create order with currency conversion
            const response = await fetch('/api/payment/paypal/create-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: convertKRWToCurrency(finalTotal, paypalCurrency),
                currency: paypalCurrency,
                orderId: orderId,
                shippingFee: convertKRWToCurrency(deliveryFee, paypalCurrency),
                items: cartItems.map(item => ({
                  name: item.productName,
                  sku: item.productId,
                  quantity: String(item.quantity),
                  unit_amount: {
                    currency_code: paypalCurrency,
                    value: String(convertKRWToCurrency(item.price, paypalCurrency))
                  }
                }))
              }),
            });

            const data = await response.json();
            if (!data.success) {
              throw new Error(data.message || 'Order creation failed');
            }

            // Store PayPal order ID for later use
            sessionStorage.setItem('paypalOrderId', data.orderId);
            return data.orderId;
          } catch (error) {
            console.error('PayPal order creation error:', error);
            throw error;
          }
        },

        // Handle order approval
        onApprove: async (data: { orderID: string }) => {
          try {
            const paypalOrderId = data.orderID;

            // Validate form fields
            if (!name.trim()) {
              alert("이름을 입력해주세요");
              return;
            }
            if (!email.trim()) {
              alert("이메일을 입력해주세요");
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

            // Capture payment
            const captureResponse = await fetch('/api/payment/paypal/capture-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: paypalOrderId
              }),
            });

            const captureData = await captureResponse.json();
            if (!captureData.success) {
              throw new Error(captureData.message || 'Payment capture failed');
            }

            // Prepare address string (legacy field for backward compatibility)
            const fullAddress = deliveryMethod !== "팬미팅현장수령"
              ? `[${zipCode}] ${address} ${addressDetail}`.trim()
              : null;

            // Idempotency check: If order already exists with this paypal_id, use existing order
            const paypalPaymentId = captureData.paymentId || paypalOrderId;
            const { supabase } = await import('@/lib/supabase');
            const { data: existingOrder } = await supabase
              .from("umeki_orders")
              .select("id")
              .eq("paypal_id", paypalPaymentId)
              .single();

            let result;
            if (existingOrder) {
              console.log('Order already exists for paypal_id:', paypalPaymentId);
              result = { success: true, data: { order: existingOrder, items: [] } };
            } else {
              // Create order in database
              const orderData = {
                name: name,
                email: email,
                phone_num: phone,
                address: fullAddress,
                country_code: deliveryMethod === "해외배송" ? country : null,
                state: deliveryMethod === "해외배송" ? state : null,
                city: deliveryMethod === "해외배송" ? city : null,
                postal_code: deliveryMethod !== "팬미팅현장수령" ? zipCode : null,
                address_line_1: deliveryMethod !== "팬미팅현장수령" ? address : null,
                address_line_2: deliveryMethod !== "팬미팅현장수령" ? addressDetail : null,
                delivery_method: deliveryMethod,
                payment_method: 'paypal' as PaymentMethod,
                total_amount: finalTotal,
                paypal_id: paypalPaymentId,
              };

              const { createOrder } = await import('@/lib/orders');
              result = await createOrder(orderData, cartItems);

              if (!result.success) {
                const errorMessage = result.error && typeof result.error === 'object' && 'message' in result.error
                  ? String(result.error.message)
                  : "주문 생성 중 오류가 발생했습니다";
                throw new Error(errorMessage);
              }
            }

            // Deduct inventory after successful order creation
            try {
              const inventoryResponse = await fetch('/api/inventory/deduct', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  cartItems: cartItems,
                }),
              });

              const inventoryData = await inventoryResponse.json();
              if (!inventoryData.success) {
                console.error('Failed to deduct inventory:', inventoryData.error);
                // Don't fail the order if inventory deduction fails, just log it
              }
            } catch (inventoryError) {
              console.error('Error deducting inventory:', inventoryError);
              // Don't fail the order if inventory deduction fails
            }

            // Send PayPal payment confirmation email
            if (result.data?.order && result.data?.items) {
              try {
                const orderDate = new Date(result.data.order.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                await fetch('/api/email/send-order-confirmation', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: result.data.order.id,
                    customerName: result.data.order.name,
                    customerEmail: result.data.order.email,
                    orderDate: orderDate,
                    items: result.data.items.map((item) => {
                      // Find the corresponding cart item by matching product_id and option
                      const cartItem = cartItems.find((ci: CartItem) =>
                        ci.productId === item.product_id &&
                        (ci.option || null) === (item.option || null)
                      );
                      return {
                        productName: cartItem?.productName || 'Unknown Product',
                        productOption: item.option,
                        quantity: item.quantity,
                        totalPrice: item.total_price,
                      };
                    }),
                    totalAmount: result.data.order.total_amount,
                    deliveryMethod: result.data.order.delivery_method,
                    address: result.data.order.address,
                    phoneNum: result.data.order.phone_num,
                  }),
                });
              } catch (emailError) {
                console.error('Email send error:', emailError);
                // Don't fail order if email fails
              }
            }

            // Send Discord notification for new orders
            if (result.data?.order && !existingOrder) {
              try {
                const items = cartItems.map((item) =>
                  `- ${item.productName}${item.option ? ` (${item.option})` : ''} x${item.quantity} - ${formatKRW(item.price * item.quantity)}`
                ).join('\n') || 'No items';

                const message = `🛒 **새로운 주문이 들어왔습니다!**\n\n` +
                  `**주문번호:** ${result.data.order.id}\n` +
                  `**결제 수단:** PayPal\n` +
                  `**총 금액:** ${formatKRW(finalTotal)}\n\n` +
                  `**고객 정보:**\n` +
                  `- 이름: ${name || 'N/A'}\n` +
                  `- 이메일: ${email || 'N/A'}\n` +
                  `- 전화번호: ${phone || 'N/A'}\n\n` +
                  `**주문 상품:**\n${items}\n\n` +
                  `**주문 시간:** ${new Date().toLocaleString('ko-KR')}`;

                await sendDiscordMessage({ message });
              } catch (discordError) {
                console.error('Discord notification error:', discordError);
                // Don't fail order if Discord notification fails
              }
            }

            // Clear cart and session
            const { clearCart } = await import('@/lib/cart');
            clearCart();
            sessionStorage.removeItem('paypalOrderId');

            // Redirect to complete page
            window.location.href = `/payment/complete?orderId=${result.data?.order.id}`;

          } catch (error) {
            console.error('PayPal approval error:', error);
            alert(error instanceof Error ? error.message : 'PayPal 결제 처리 중 오류가 발생했습니다.');
          }
        },

        // Handle errors
        onError: (error: unknown) => {
          console.error('PayPal error:', error);
          const errorMessage = (error as { message?: string })?.message || '결제 중 오류가 발생했습니다.';
          alert(`PayPal 오류: ${errorMessage}`);
        },

        // Handle cancellation
        onCancel: () => {
          console.log('PayPal payment cancelled');
          sessionStorage.removeItem('paypalOrderId');
        },
      }).render('#paypal-button-container')
        .then(() => {
          console.log('PayPal buttons rendered successfully');
          paypalRenderingRef.current = false;
        })
        .catch((err: unknown) => {
          console.error('PayPal button render error:', err);
          paypalRenderingRef.current = false;
        });
    } catch (error) {
      console.error('PayPal initialization error:', error);
      paypalRenderingRef.current = false;
    }
  }, [paymentMethod, paypalCurrency, finalTotal, cartItems, name, email, phone, address, zipCode, addressDetail, country, state, city, deliveryMethod, agreedToTerms, convertKRWToCurrency, deliveryFee]);

  // Initialize PayPal buttons when payment method or currency changes
  useEffect(() => {
    if (paymentMethod === 'paypal') {
      initializePayPalButtons();
    } else {
      // Reset rendering flag when switching away from PayPal
      paypalRenderingRef.current = false;
    }
  }, [paymentMethod, paypalCurrency, initializePayPalButtons]);

  const handleAddressSelect = (
    selectedAddress: string,
    selectedZipCode: string
  ) => {
    setAddress(selectedAddress);
    setZipCode(selectedZipCode);
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
      <main className="max-w-4xl mx-auto p-4">
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

        <div className="grid grid-cols-1 gap-8">
          {/* Order Summary */}
          <div className="order-1">
            <h2 className="text-xl font-semibold text-black mb-4">
              Order Summary
            </h2>
            <div className="bg-white rounded-lg border border-black/6 shadow-sm p-5">
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
            <div className="bg-white rounded-lg border border-black/6 shadow-sm p-5">
              {/* Name */}
              <div className="mb-6">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-black mb-2"
                >
                  이름 (Name) <span className="text-red-500">*</span>
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
                  이메일 (Email) <span className="text-red-500">*</span>
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
                  전화번호 (Phone Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="01012345678"
                  required
                />
              </div>

              {/* Delivery Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-2">
                  배송 수단 (Delivery Method) <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {(["국내배송", "해외배송"] as DeliveryMethod[]).map((method) => (
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
                              +{formatKRW(18000)}
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
                            * 현장에서 직접 수령합니다.
                          </p>
                        )}
                        {method === "국내배송" && (
                          <p className="text-xs text-zinc-600 mt-1">
                            * 이벤트 일정 전 배송이 보장되지 않습니다.
                          </p>
                        )}
                        {method === "해외배송" && (
                          <p className="text-xs text-zinc-600 mt-1">
                            * 이벤트 일정 전 배송이 보장되지 않습니다.
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {/* Warning for shipping options */}
                {/* {(deliveryMethod === "국내배송" || deliveryMethod === "해외배송") && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className="text-sm text-amber-800">
                      택배 수령 시 팬미팅 일정 전에 전에 수령하기 어렵습니다.
                    </p>
                  </div>
                )} */}
              </div>

              {/* Country Selection for International Shipping */}
              {deliveryMethod === "해외배송" && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label
                      htmlFor="country"
                      className="block text-sm font-medium text-black mb-2"
                    >
                      국가 (Country) <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      required
                    >
                      <option value="">Select Country</option>
                    <option value="GT">Guatemala</option>
                    <option value="GE">Georgia</option>
                    <option value="GR">Greece</option>
                    <option value="NG">Nigeria</option>
                    <option value="NL">Netherlands</option>
                    <option value="AN">Netherlands Antilles</option>
                    <option value="NP">Nepal</option>
                    <option value="NO">Norway</option>
                    <option value="NZ">New Zealand</option>
                    <option value="NE">Niger</option>
                    <option value="TW">Taiwan</option>
                    <option value="DK">Denmark</option>
                    <option value="DO">Dominican Republic</option>
                    <option value="DE">Germany</option>
                    <option value="LA">Laos</option>
                    <option value="LV">Latvia</option>
                    <option value="RU">Russia</option>
                    <option value="LS">Lesotho</option>
                    <option value="RO">Romania</option>
                    <option value="RW">Rwanda</option>
                    <option value="LU">Luxembourg</option>
                    <option value="MK">Macedonia</option>
                    <option value="MY">Malaysia</option>
                    <option value="MX">Mexico</option>
                    <option value="MA">Morocco</option>
                    <option value="MU">Mauritius</option>
                    <option value="MZ">Mozambique</option>
                    <option value="MV">Maldives</option>
                    <option value="MT">Malta</option>
                    <option value="MN">Mongolia</option>
                    <option value="US">United States</option>
                    <option value="MM">Myanmar</option>
                    <option value="BH">Bahrain</option>
                    <option value="BD">Bangladesh</option>
                    <option value="BJ">Benin</option>
                    <option value="VN">Vietnam</option>
                    <option value="BE">Belgium</option>
                    <option value="BY">Belarus</option>
                    <option value="BA">Bosnia and Herzegovina</option>
                    <option value="BW">Botswana</option>
                    <option value="BT">Bhutan</option>
                    <option value="BG">Bulgaria</option>
                    <option value="BR">Brazil</option>
                    <option value="BN">Brunei</option>
                    <option value="BF">Burkina Faso</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="CY">Cyprus</option>
                    <option value="SN">Senegal</option>
                    <option value="LK">Sri Lanka</option>
                    <option value="SE">Sweden</option>
                    <option value="CH">Switzerland</option>
                    <option value="ES">Spain</option>
                    <option value="SK">Slovakia</option>
                    <option value="SI">Slovenia</option>
                    <option value="SY">Syria</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="AM">Armenia</option>
                    <option value="AR">Argentina</option>
                    <option value="IS">Iceland</option>
                    <option value="HT">Haiti</option>
                    <option value="IE">Ireland</option>
                    <option value="AZ">Azerbaijan</option>
                    <option value="AL">Albania</option>
                    <option value="DZ">Algeria</option>
                    <option value="AO">Angola</option>
                    <option value="ER">Eritrea</option>
                    <option value="EE">Estonia</option>
                    <option value="EC">Ecuador</option>
                    <option value="GB">United Kingdom</option>
                    <option value="YE">Yemen</option>
                    <option value="OM">Oman</option>
                    <option value="AT">Austria</option>
                    <option value="JO">Jordan</option>
                    <option value="UZ">Uzbekistan</option>
                    <option value="UA">Ukraine</option>
                    <option value="ET">Ethiopia</option>
                    <option value="IR">Iran</option>
                    <option value="IL">Israel</option>
                    <option value="EG">Egypt</option>
                    <option value="IT">Italy</option>
                    <option value="IN">India</option>
                    <option value="ID">Indonesia</option>
                    <option value="JP">Japan</option>
                    <option value="ZM">Zambia</option>
                    <option value="CN">China</option>
                    <option value="MO">Macau</option>
                    <option value="DJ">Djibouti</option>
                    <option value="CZ">Czech Republic</option>
                    <option value="CL">Chile</option>
                    <option value="CV">Cape Verde</option>
                    <option value="KZ">Kazakhstan</option>
                    <option value="QA">Qatar</option>
                    <option value="KH">Cambodia</option>
                    <option value="CA">Canada</option>
                    <option value="KE">Kenya</option>
                    <option value="CR">Costa Rica</option>
                    <option value="CI">Ivory Coast</option>
                    <option value="CG">Congo</option>
                    <option value="CU">Cuba</option>
                    <option value="HR">Croatia</option>
                    <option value="TZ">Tanzania</option>
                    <option value="TH">Thailand</option>
                    <option value="TR">Turkey</option>
                    <option value="TG">Togo</option>
                    <option value="TN">Tunisia</option>
                    <option value="PA">Panama</option>
                    <option value="PK">Pakistan</option>
                    <option value="PE">Peru</option>
                    <option value="PT">Portugal</option>
                    <option value="PL">Poland</option>
                    <option value="FR">France</option>
                    <option value="FJ">Fiji</option>
                    <option value="FI">Finland</option>
                    <option value="PH">Philippines</option>
                    <option value="HU">Hungary</option>
                    <option value="AU">Australia</option>
                    <option value="HK">Hong Kong</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-black mb-2"
                  >
                    주/도 (State/Province) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    placeholder="예: California, Ontario"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-black mb-2"
                  >
                    도시 (City) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-zinc-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    placeholder="예: Los Angeles, Toronto"
                    required
                  />
                </div>
              </div>
              )}

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
                        우편번호 (Postal Code) <span className="text-red-500">*</span>
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
                      도로명 주소 (Address Line 1) <span className="text-red-500">*</span>
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
                      상세 주소 (Address Line 2)
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

              {/* Payment Logic */}
              {!isFormValid && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    결제를 진행하려면 모든 필수 정보를 입력해주세요.
                  </p>
                </div>
              )}

              {isFormValid && (
                <div>
                  {/* Payment Method */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-black mb-2">
                      결제 수단 (Payment Method) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <label
                          key={method.value}
                          className="flex items-center gap-3 p-3 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors w-full"
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.value}
                            checked={paymentMethod === method.value}
                            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                            className="w-4 h-4 text-black"
                          />
                          <span className="text-black">{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                {/* Toss Widget, or PayPal Buttons */}
                {paymentMethod === "toss" ? (
                  <>
                    {/* Toss Payment Widget */}
                      <TossPaymentWidget
                        amount={finalTotal}
                        orderId={`${orderId}`}
                        orderName={cartItems.length === 1
                          ? cartItems[0].productName
                          : `${cartItems[0].productName} 외 ${cartItems.length - 1}건`}
                        customerEmail={email}
                        customerName={name}
                        customerMobilePhone={phone}
                        successUrl={window.location.origin + "/toss/success"}
                        failUrl={window.location.origin + "/toss/fail"}
                        enableCoupon={false}
                        onReady={() => console.log("Toss payment widget ready")}
                        onError={(error) => {
                          console.error("Toss payment error:", error);
                          alert(`결제 위젯 오류: ${error.message}`);
                        }}
                        onBeforePaymentRequest={() => {
                          // Prepare address string (legacy field for backward compatibility)
                          const fullAddress = deliveryMethod !== "팬미팅현장수령"
                            ? `[${zipCode}] ${address} ${addressDetail}`.trim()
                            : null;
                          // Prepare order data to be used after payment confirmation
                          const orderData = {
                            id: orderId,
                            name: name,
                            email: email,
                            phone_num: phone,
                            address: fullAddress,
                            country_code: deliveryMethod === "해외배송" ? country : null,
                            state: deliveryMethod === "해외배송" ? state : null,
                            city: deliveryMethod === "해외배송" ? city : null,
                            postal_code: deliveryMethod !== "팬미팅현장수령" ? zipCode : null,
                            address_line_1: deliveryMethod !== "팬미팅현장수령" ? address : null,
                            address_line_2: deliveryMethod !== "팬미팅현장수령" ? addressDetail : null,
                            delivery_method: deliveryMethod,
                            total_amount: finalTotal,
                          };
                          // Store in both sessionStorage and localStorage for reliability
                          // Toss redirects can sometimes lose sessionStorage data
                          const pendingOrderData = JSON.stringify({
                            orderData,
                            cartItems
                          });
                          sessionStorage.setItem('pendingTossOrder', pendingOrderData);
                          localStorage.setItem('pendingTossOrder', pendingOrderData);
                          console.log('Order data stored for Toss payment');
                        }}
                      />
                  </>
                ) : (
                  <>
                    {/* Currency Selection for PayPal */}
                    <div className={`mb-4`}>
                      <label className="block text-sm font-medium text-black mb-2">
                        PayPal 결제 통화 선택 <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors">
                          <input
                            type="radio"
                            name="paypalCurrency"
                            value="USD"
                            checked={paypalCurrency === "USD"}
                            onChange={(e) => setPaypalCurrency(e.target.value as PayPalCurrency)}
                            className="w-4 h-4 text-black"
                          />
                          <div className="flex-1">
                            <span className="text-black font-medium">USD (미국 달러)</span>
                            <p className="text-xs text-zinc-600 mt-1">
                              예상 금액: ${(finalTotal * CONVERSION_RATES.USD).toFixed(2)}
                            </p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-md border border-zinc-300 cursor-pointer hover:bg-zinc-50 transition-colors">
                          <input
                            type="radio"
                            name="paypalCurrency"
                            value="JPY"
                            checked={paypalCurrency === "JPY"}
                            onChange={(e) => setPaypalCurrency(e.target.value as PayPalCurrency)}
                            className="w-4 h-4 text-black"
                          />
                          <div className="flex-1">
                            <span className="text-black font-medium">JPY (일본 엔화)</span>
                            <p className="text-xs text-zinc-600 mt-1">
                              예상 금액: ¥{Math.round(finalTotal * CONVERSION_RATES.JPY).toLocaleString()}
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        PayPal로 결제하려면 아래 &quot;Pay with PayPal&quot; 버튼을 클릭하세요.
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        * 환율은 자동으로 변환되며, 실제 결제 금액은 PayPal 환율에 따라 달라질 수 있습니다.
                      </p>
                    </div>
                    {PAYPAL_CLIENT_ID ? (
                      <div id="paypal-button-container" className="w-full flex"></div>
                    ) : (
                      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          Paypal is not setup properly. Please contact customer support
                        </p>
                      </div>
                    )}
                  </>
                )}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
