"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Script from "next/script";

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

// Extend Window interface to include PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        style?: {
          layout?: string;
          color?: string;
          shape?: string;
          label?: string;
        };
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError?: (err: unknown) => void;
      }) => {
        render: (container: string | HTMLElement) => Promise<void>;
      };
    };
  }
}

const DELIVERY_FEE_KRW = 18000;
const DELIVERY_FEE_USD = "12.30"; // Fixed conversion for consistency
const DELIVERY_FEE_JPY = "1900"; // Fixed conversion for consistency

export default function InternationalDeliveryPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "JPY">("USD");
  const [sdkReady, setSdkReady] = useState(false);
  const [buttonRendered, setButtonRendered] = useState(false);

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

        const orderWithItems = {
          ...orderData,
          items: itemsData || [],
        };
        setOrder(orderWithItems);
      } catch (err) {
        console.error("Exception while fetching order:", err);
        setError("주문 정보를 불러오는 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Initialize PayPal buttons when SDK is ready and order is loaded
  useEffect(() => {
    if (!sdkReady || !window.paypal || !order || order.delivery_fee_payment || buttonRendered) {
      return;
    }

    const initializePayPalButtons = async () => {
      try {
        const container = document.getElementById("paypal-button-container");
        if (!container) {
          console.error("PayPal button container not found");
          return;
        }

        // Clear container
        container.innerHTML = "";

        const amount = selectedCurrency === "USD" ? DELIVERY_FEE_USD : DELIVERY_FEE_JPY;

        await window.paypal!.Buttons({
          style: {
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "pay",
          },
          createOrder: async () => {
            try {
              const response = await fetch("/api/payment/paypal/create-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  amount: amount,
                  currency: selectedCurrency,
                  orderId: `DELIVERY_${orderId}`,
                  items: [
                    {
                      name: "International Delivery Fee",
                      description: `Shipping fee for order ${orderId}`,
                      quantity: "1",
                      unit_amount: {
                        currency_code: selectedCurrency,
                        value: amount,
                      },
                      category: "PHYSICAL_GOODS",
                    },
                  ],
                }),
              });

              const data = await response.json();

              if (!data.success || !data.orderId) {
                throw new Error(data.message || "Failed to create order");
              }

              return data.orderId;
            } catch (error) {
              console.error("Error creating PayPal order:", error);
              alert("결제 주문 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
              throw error;
            }
          },
          onApprove: async (data) => {
            setProcessing(true);
            try {
              // Capture payment
              const captureResponse = await fetch("/api/payment/paypal/capture-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  orderId: data.orderID,
                }),
              });

              const captureData = await captureResponse.json();

              if (!captureData.success) {
                throw new Error(captureData.message || "Failed to capture payment");
              }

              // Extract the actual order ID from the originalOrderId (format: DELIVERY_<orderId>)
              // const actualOrderId = captureData.originalOrderId?.replace('DELIVERY_', '') || orderId;

              // Update delivery_fee_payment to TRUE
              console.log("The order ID is: ", orderId);
              const updateResponse = await fetch(`/api/payment/delivery-fee/${orderId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  paymentId: captureData.paymentId,
                  status: captureData.status,
                }),
              });

              if (updateResponse.ok) {
                setShowSuccessModal(true);
                setOrder({ ...order, delivery_fee_payment: true });
              } else {
                const errorData = await updateResponse.json();
                console.error("Database update failed:", errorData);
                alert(`결제 처리 중 오류가 발생했습니다: ${errorData.error || "알 수 없는 오류"}`);
              }
            } catch (error) {
              console.error("Payment processing error:", error);
              alert("결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
            } finally {
              setProcessing(false);
            }
          },
          onCancel: () => {
            console.log("Payment cancelled by user");
            setProcessing(false);
          },
          onError: (err) => {
            console.error("PayPal error:", err);
            if (err && typeof err === "object" && "message" in err) {
              const errorMessage = (err as { message: string }).message;
              if (!errorMessage.includes("Window closed") && !errorMessage.includes("cancelled")) {
                alert("결제 중 오류가 발생했습니다. 다시 시도해주세요.");
              }
            }
            setProcessing(false);
          },
        }).render(container);

        setButtonRendered(true);
      } catch (error) {
        console.error("Error initializing PayPal buttons:", error);
      }
    };

    initializePayPalButtons();
  }, [sdkReady, order, selectedCurrency, orderId, buttonRendered]);

  // Reset button rendered state when currency changes
  useEffect(() => {
    setButtonRendered(false);
    setSdkReady(false);
  }, [selectedCurrency]);

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

  if (!clientId) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">PayPal Client ID가 설정되지 않았습니다.</p>
          <p className="text-sm text-zinc-600 mt-2">
            환경 변수에 NEXT_PUBLIC_PAYPAL_CLIENT_ID를 설정해주세요.
          </p>
        </div>
      </div>
    );
  }

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
    <>
      {/* Load PayPal SDK */}
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${selectedCurrency}&intent=capture&components=buttons`}
        onLoad={() => {
          console.log("PayPal SDK loaded successfully");
          setSdkReady(true);
        }}
        onError={() => {
          console.error("Failed to load PayPal SDK");
          setError("PayPal SDK를 불러오는데 실패했습니다.");
        }}
      />

      <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
        <main className="max-w-4xl mx-auto p-8 pt-24">
          {/* Currency Selection at the top */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-semibold text-black">Delivery Fee Payment</h1>

              {/* Payment Status Badge */}
              <div
                className={`
                  px-6 py-3 rounded-lg font-semibold text-lg shadow-md
                  ${order.delivery_fee_payment
                    ? 'bg-green-500/50 border-2 border-green-500 text-white'
                    : 'bg-red-500/50 border-2 border-red-500 text-white'}
                `}
              >
                {order.delivery_fee_payment ? 'Paid' : 'Not Paid'}
              </div>
            </div>
            {/* <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
              <label className="block text-sm font-medium text-zinc-700 mb-3">
                결제 통화 선택
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedCurrency("USD")}
                  disabled={processing || order.delivery_fee_payment}
                  className={`px-4 py-3 rounded-md border-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedCurrency === "USD"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  <div className="text-lg font-semibold">USD</div>
                  <div className="text-sm">${DELIVERY_FEE_USD}</div>
                </button>
                <button
                  onClick={() => setSelectedCurrency("JPY")}
                  disabled={processing || order.delivery_fee_payment}
                  className={`px-4 py-3 rounded-md border-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedCurrency === "JPY"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  <div className="text-lg font-semibold">JPY</div>
                  <div className="text-sm">¥{DELIVERY_FEE_JPY}</div>
                </button>
              </div>
            </div> */}
            
          </div>

          <div className="space-y-6">
            {/* Order Info Card */}
            <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-black mb-4">주문 정보</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Order Id</span>
                  <span className="font-mono font-medium text-black">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Order Date</span>
                  <span className="text-black">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Customer Name</span>
                  <span className="text-black">{order.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Customer Email</span>
                  <span className="text-black">{order.email}</span>
                </div>
              </div>
            </div>


            {/* Delivery Fee Payment Card */}
            <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-black mb-4">Payment</h2>

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
                    Payment Complete!
                  </h3>
                  <p className="text-zinc-600">Delivery Fee has been paid.</p>
                </div>
              ) : (
                <div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600">Delivery Fee (KRW)</span>
                      <span className="font-semibold text-black">
                        {formatCurrency(DELIVERY_FEE_KRW)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600">Delivery Fee (USD)</span>
                      <span className="font-semibold text-black">${DELIVERY_FEE_USD}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600">Delivery Fee (JPY)</span>
                      <span className="font-semibold text-black">¥{DELIVERY_FEE_JPY}</span>
                    </div>
                  </div>

                  {/* <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      PayPal을 통해 배송비를 결제해주세요. 결제는 {selectedCurrency}로
                      진행됩니다.
                    </p>
                  </div> */}

                  {processing && (
                    <div className="text-center py-4 mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                      <p className="text-zinc-600">Processing...</p>
                    </div>
                  )}

                  {/* PayPal Button Container */}
                  {!processing && (
                    <div className="mt-4">
                      {!sdkReady ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                          <p className="text-zinc-600">Retrieving PayPal Button...</p>
                        </div>
                      ) : (
                        <div id="paypal-button-container"></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Order Items Card */}
            <div className="bg-white rounded-lg border border-black/6 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-black mb-4">Order</h2>
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
                        <p className="text-sm text-zinc-600 mb-1">Option: {item.option}</p>
                      )}
                      <p className="text-sm text-zinc-600">Qty: {item.quantity}</p>
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
                  <span className="text-lg font-semibold text-black">Total Paid Amount</span>
                  <span className="text-2xl font-bold text-black">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
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
              <h2 className="text-2xl font-semibold text-black mb-2">Payment Confirmed!</h2>
              <p className="text-zinc-600 mb-6">
                Your Payment has been Confirmed
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Proceed
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
