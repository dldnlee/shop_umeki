"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type HypeTownOrder = {
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

/**
 * International Delivery Payment Search Page
 *
 * Allows users to search for HypeTown orders by email address
 * to access their delivery fee payment page
 */
export default function InternationalDeliveryPaymentSearchPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<HypeTownOrder[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    // Clear any previous errors and results
    setError("");
    setLoading(true);
    setHasSearched(false);

    try {
      // Search for orders with international delivery (해외배송) by email
      const { data: ordersData, error: ordersError } = await supabase
        .from("umeki_orders_hypetown")
        .select("*")
        .ilike("email", `%${email.trim()}%`)
        .eq("delivery_method", "해외배송")
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        setError("An error occurred while searching for orders. Please try again.");
        setOrders([]);
      } else {
        setOrders(ordersData || []);
        setHasSearched(true);
      }
    } catch (err) {
      console.error("Exception while searching orders:", err);
      setError("An unexpected error occurred. Please try again.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/international-delivery-payment/${orderId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8 pt-24">
        <div className="bg-white rounded-lg border border-black/6 shadow-sm p-8 md:p-12">
          {/* Title */}
          <h1 className="text-3xl font-semibold text-black mb-2">
            International Delivery Payment
          </h1>
          <p className="text-zinc-600 mb-8">
            Enter your email address to find your orders and pay for international delivery fees
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-6 mb-8">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-black mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(""); // Clear error when typing
                }}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-black placeholder:text-zinc-400"
                disabled={loading}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search Orders"}
            </button>
          </form>

          {/* Search Results */}
          {hasSearched && (
            <div className="mt-8 pt-8 border-t border-zinc-200">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-12 h-12 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">
                    No orders found
                  </h3>
                  <p className="text-zinc-600">
                    We couldn&apos;t find any international delivery orders with this email address.
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4">
                    Your Orders ({orders.length})
                  </h2>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => handleOrderClick(order.id)}
                        className="w-full text-left bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg p-6 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-zinc-600 mb-1">Order Date</p>
                            <p className="font-medium text-black">{formatDate(order.created_at)}</p>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              order.delivery_fee_payment
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.delivery_fee_payment ? "Paid" : "Not Paid"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-600 mb-1">Customer Name</p>
                            <p className="text-black font-medium">{order.name}</p>
                          </div>
                          <div>
                            <p className="text-zinc-600 mb-1">Total Amount</p>
                            <p className="text-black font-medium">{formatCurrency(order.total_amount)}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-300 flex items-center justify-between">
                          <p className="text-sm text-zinc-600">
                            Order ID: <span className="font-mono text-black">{order.id.slice(0, 8)}...</span>
                          </p>
                          <div className="flex items-center gap-2 text-black">
                            <span className="text-sm font-medium">View Details</span>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-zinc-200">
            <h3 className="text-sm font-semibold text-black mb-4">
              Need help?
            </h3>
            <div className="space-y-3 text-sm text-zinc-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black">1</span>
                </div>
                <p className="text-left">Use the email address you provided when placing your order</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black">2</span>
                </div>
                <p className="text-left">Click on an order to view details and make payment</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-black">3</span>
                </div>
                <p className="text-left">For assistance, please contact customer service</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
