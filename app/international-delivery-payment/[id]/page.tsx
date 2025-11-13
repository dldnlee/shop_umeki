"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  option?: string | null;
  quantity: number;
  total_price: number;
  product?: {
    id: string;
    name: string;
    price: number;
  };
};

type Order = {
  id: string;
  name: string;
  email: string;
  phone_num?: string | null;
  address?: string | null;
  delivery_method: string;
  order_status?: string;
  created_at: string;
  delivery_fee_payment: boolean;
  total_amount: number;
};

type OrderWithItems = Order & {
  items: OrderItem[];
};

const DELIVERY_FEE_KRW = 15000;
const DELIVERY_FEE_USD = (DELIVERY_FEE_KRW * 0.00068).toFixed(2); // 1 KRW = 0.00068 USD
const DELIVERY_FEE_JPY = Math.round(DELIVERY_FEE_KRW * 0.11); // 1 KRW = 0.11 JPY

function PaymentContent({ onCurrencyChange }: { onCurrencyChange: (currency: "USD" | "JPY") => void }) {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "JPY">("USD");

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError("주문번호가 유효하지 않습니다");
        setLoading(false);
        return;
      }

      try {
        // Fetch order from umeki_orders_hypetown
        const { data: orderData, error: orderError } = await supabase
          .from("umeki_orders_hypetown")
          .select("*")
          .eq("id", orderId)
          .single();

        if (orderError || !orderData) {
          setError("주문을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        // Fetch order items with product details
        const { data: itemsData, error: itemsError } = await supabase
          .from("umeki_order_items_hypetown")
          .select(`
            id,
            order_id,
            product_id,
            option,
            quantity,
            total_price,
            product:umeki_products(id, name, price)
          `)
          .eq("order_id", orderId);

        if (itemsError) {
          console.error("Error fetching items:", itemsError);
        }

        setOrder({
          ...orderData,
          items: itemsData || [],
        });
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-zinc-600">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
        <main className="max-w-2xl mx-auto p-8 pt-24">
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-8 md:p-12 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-black mb-4">
              주문을 찾을 수 없습니다
            </h1>
            <p className="text-zinc-600 mb-8">{error}</p>

            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Success state - display order details
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8 pt-24">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-zinc-600 hover:text-black transition-colors mb-4 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            돌아가기
          </button>
          <h1 className="text-3xl font-semibold text-black">국제 배송비 결제</h1>
        </div>

        <div className="space-y-6">
          {/* Order Info Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">주문 정보</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">주문번호</span>
                <span className="font-mono font-medium text-black">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">주문일시</span>
                <span className="text-black">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">고객명</span>
                <span className="text-black">{order.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">이메일</span>
                <span className="text-black">{order.email}</span>
              </div>
            </div>
          </div>

          {/* Order Items Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">주문 상품</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start pb-4 border-b border-zinc-200 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-black mb-1">
                      {item.product?.name || `상품 #${item.product_id}`}
                    </p>
                    {item.option && (
                      <p className="text-sm text-zinc-600 mb-1">옵션: {item.option}</p>
                    )}
                    <p className="text-sm text-zinc-600">수량: {item.quantity}개</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-black">
                      {formatCurrency(item.total_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Amount */}
            <div className="mt-6 pt-6 border-t border-zinc-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-black">상품 총액</span>
                <span className="text-2xl font-bold text-black">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Fee Payment Card */}
          <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-black mb-4">배송비 결제</h2>

            {order.delivery_fee_payment ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-12 h-12 text-green-600"
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
                <h3 className="text-lg font-semibold text-black mb-2">
                  배송비 결제 완료
                </h3>
                <p className="text-zinc-600">
                  배송비가 이미 결제되었습니다.
                </p>
              </div>
            ) : (
              <div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600">배송비 (KRW)</span>
                    <span className="font-semibold text-black">
                      {formatCurrency(DELIVERY_FEE_KRW)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600">배송비 (USD)</span>
                    <span className="font-semibold text-black">
                      ${DELIVERY_FEE_USD}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600">배송비 (JPY)</span>
                    <span className="font-semibold text-black">
                      ¥{DELIVERY_FEE_JPY}
                    </span>
                  </div>
                </div>

                {/* Currency Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-700 mb-3">
                    결제 통화 선택
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSelectedCurrency("USD");
                        onCurrencyChange("USD");
                      }}
                      className={`px-4 py-3 rounded-md border-2 font-medium transition-all ${
                        selectedCurrency === "USD"
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <div className="text-lg font-semibold">USD</div>
                      <div className="text-sm">${DELIVERY_FEE_USD}</div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCurrency("JPY");
                        onCurrencyChange("JPY");
                      }}
                      className={`px-4 py-3 rounded-md border-2 font-medium transition-all ${
                        selectedCurrency === "JPY"
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <div className="text-lg font-semibold">JPY</div>
                      <div className="text-sm">¥{DELIVERY_FEE_JPY}</div>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    PayPal을 통해 배송비를 결제해주세요. 결제는 {selectedCurrency}로 진행됩니다.
                  </p>
                </div>

                {processing && (
                  <div className="text-center py-4 mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-zinc-600">결제 처리 중...</p>
                  </div>
                )}

                {/* PayPal Button */}
                {!processing && (
                  <div className="mt-4" key={selectedCurrency}>
                    <PayPalButtons
                      style={{
                        layout: "vertical",
                        color: "blue",
                        shape: "rect",
                        label: "pay",
                      }}
                      createOrder={(_data, actions) => {
                        const amount = selectedCurrency === "USD" ? DELIVERY_FEE_USD : DELIVERY_FEE_JPY.toString();
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              reference_id: `ORDER_${orderId}`,
                              description: `International Delivery Fee`,
                              custom_id: orderId,
                              soft_descriptor: "UMEKI_DELIVERY",
                              amount: {
                                currency_code: selectedCurrency,
                                value: amount,
                                breakdown: {
                                  item_total: {
                                    currency_code: selectedCurrency,
                                    value: amount
                                  }
                                }
                              },
                              items: [
                                {
                                  name: "International Delivery Fee",
                                  description: `Shipping fee for order ${orderId}`,
                                  quantity: "1",
                                  unit_amount: {
                                    currency_code: selectedCurrency,
                                    value: amount
                                  },
                                  category: "PHYSICAL_GOODS"
                                }
                              ]
                            },
                          ],
                          application_context: {
                            brand_name: "UMEKI Shop",
                            locale: "en-US",
                            shipping_preference: "NO_SHIPPING",
                            user_action: "PAY_NOW",
                            return_url: `${window.location.origin}/international-delivery-payment/${orderId}`,
                            cancel_url: `${window.location.origin}/international-delivery-payment/${orderId}`
                          }
                        });
                      }}
                      onApprove={async (_data, actions) => {
                        setProcessing(true);
                        try {
                          if (!actions.order) {
                            throw new Error("PayPal order actions not available");
                          }

                          const details = await actions.order.capture();
                          console.log("Payment completed:", details);

                          // Update delivery_fee_payment to TRUE
                          const response = await fetch(`/api/payment/delivery-fee/${orderId}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              paymentId: details.id,
                              status: details.status,
                            }),
                          });

                          if (response.ok) {
                            setShowSuccessModal(true);
                            // Update local state
                            setOrder({ ...order, delivery_fee_payment: true });
                          } else {
                            const errorData = await response.json();
                            alert(`결제 처리 중 오류가 발생했습니다: ${errorData.error || "알 수 없는 오류"}`);
                          }
                        } catch (error) {
                          console.error("Payment processing error:", error);
                          alert("결제 처리 중 오류가 발생했습니다.");
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      onError={(err) => {
                        console.error("PayPal error:", err);
                        alert("결제 중 오류가 발생했습니다. 다시 시도해주세요.");
                        setProcessing(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-green-600"
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
            <h2 className="text-2xl font-semibold text-black mb-2">
              결제 완료!
            </h2>
            <p className="text-zinc-600 mb-6">
              배송비 결제가 성공적으로 완료되었습니다.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InternationalDeliveryPaymentPage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const [currency, setCurrency] = useState<"USD" | "JPY">("USD");

  if (!clientId) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">PayPal Client ID가 설정되지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: currency,
        intent: "capture",
      }}
      key={currency} // Force remount when currency changes
    >
      <PaymentContent onCurrencyChange={setCurrency} />
    </PayPalScriptProvider>
  );
}
