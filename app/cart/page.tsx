"use client";

import { useState, useEffect } from "react";
import { getCart, removeFromCart, updateCartItemQuantity, clearCart, getCartTotal, type CartItem } from "@/lib/cart";
import { formatKRW, formatUSD } from "@/lib/utils";
import Link from "next/link";

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getCart());

  useEffect(() => {
    // Listen for cart updates
    const handleCartUpdate = (event: CustomEvent) => {
      setCartItems(event.detail);
    };

    window.addEventListener("cartUpdated", handleCartUpdate as EventListener);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate as EventListener);
    };
  }, []);

  const handleQuantityChange = (productId: number, newQuantity: number, option?: string) => {
    updateCartItemQuantity(productId, newQuantity, option);
  };

  const handleRemoveItem = (productId: number, option?: string) => {
    removeFromCart(productId, option);
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      clearCart();
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
        <main className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-semibold text-black dark:text-white mb-8">
            Shopping Cart
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

  const total = getCartTotal();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-black dark:text-white">
            Shopping Cart
          </h1>
          <button
            onClick={handleClearCart}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Clear Cart
          </button>
        </div>

        <div className="space-y-4">
          {cartItems.map((item) => (
            <div
              key={`${item.productId}-${item.option || "default"}`}
              className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                    {item.productName}
                  </h3>
                  {item.option && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      Option: {item.option}
                    </p>
                  )}
                  <p className="text-base font-medium text-black dark:text-white">
                    {formatKRW(item.price)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item.productId,
                          item.quantity - 1,
                          item.option
                        )
                      }
                      className="w-8 h-8 rounded-md bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="text-base font-medium text-black dark:text-white min-w-[2ch] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item.productId,
                          item.quantity + 1,
                          item.option
                        )
                      }
                      className="w-8 h-8 rounded-md bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Item Subtotal */}
                  <div className="text-right min-w-[100px]">
                    <p className="text-lg font-semibold text-black dark:text-white">
                      {formatKRW(item.price * item.quantity)}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.productId, item.option)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    aria-label="Remove item"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="mt-8 bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xl font-semibold text-black dark:text-white">
              Total
            </span>
            <span className="text-2xl font-bold text-black dark:text-white">
              {formatKRW(total)}
            </span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="flex-1 py-3 px-6 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-md font-medium text-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Continue Shopping
            </Link>
            <Link href="/payment" className="flex-1 py-3 px-6 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium hover:opacity-90 transition-opacity">
              Checkout
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}