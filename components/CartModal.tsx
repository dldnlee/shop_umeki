"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCart, removeFromCart, updateCartItemQuantity, clearCart, getCartTotal, type CartItem } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load cart from localStorage when modal opens
      const currentCart = getCart();
      setCartItems(currentCart);
    }
  }, [isOpen]);

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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const total = getCartTotal();

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 float-right z-10 w-10 h-10 bg-white hover:bg-gray-100 rounded-full shadow-md flex items-center justify-center text-3xl text-black transition-colors"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-semibold text-black">
              Shopping Cart
            </h1>
          </div>

          {/* Empty Cart State */}
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-600 mb-6">
                Your cart is empty
              </p>
              <button
                onClick={onClose}
                className="inline-block px-6 py-3 bg-[#8DCFDD] text-white rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4 mb-8">
                {cartItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.option || "default"}`}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-black mb-1">
                          {item.productName}
                        </h3>
                        {item.option && (
                          <p className="text-sm text-gray-600 mb-2">
                            Option: {item.option}
                          </p>
                        )}
                        <p className="text-base font-medium text-black">
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
                            className="w-8 h-8 rounded-md bg-[#8DCFDD] text-white font-semibold hover:bg-[#7BBFCF] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="text-base font-medium text-black min-w-[2ch] text-center">
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
                            className="w-8 h-8 rounded-md bg-[#8DCFDD] text-white font-semibold hover:bg-[#7BBFCF] transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Subtotal */}
                        <div className="text-right min-w-[100px]">
                          <p className="text-lg font-semibold text-black">
                            {formatKRW(item.price * item.quantity)}
                          </p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.productId, item.option)}
                          className="text-red-600 hover:text-red-700 transition-colors"
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
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xl font-semibold text-black">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-black">
                    {formatKRW(total)}
                  </span>
                </div>
                <div className="flex gap-4">
                  <Link
                    href="/payment"
                    onClick={onClose}
                    className="flex-1 py-3 px-6 bg-[#8DCFDD] text-white rounded-md font-medium hover:opacity-90 transition-opacity text-center"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
