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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative my-4 sm:my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-3 right-3 sm:top-4 sm:right-4 float-right z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full shadow-md flex items-center justify-center text-2xl sm:text-3xl text-black transition-colors"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-black">
              Shopping Cart
            </h1>
          </div>

          {/* Empty Cart State */}
          {cartItems.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-zinc-600 mb-4 sm:mb-6">
                Your cart is empty
              </p>
              <button
                onClick={onClose}
                className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-[#8DCFDD] text-white rounded-md text-sm sm:text-base font-medium hover:opacity-90 transition-opacity"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {cartItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.option || "default"}`}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 md:p-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 w-full sm:w-auto">
                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-black mb-1">
                          {item.productName}
                        </h3>
                        {item.option && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
                            Option: {item.option}
                          </p>
                        )}
                        <p className="text-sm sm:text-base font-medium text-black">
                          {formatKRW(item.price)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.productId,
                                item.quantity - 1,
                                item.option
                              )
                            }
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#8DCFDD] text-white text-sm sm:text-base font-semibold hover:bg-[#7BBFCF] transition-colors"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="text-sm sm:text-base font-medium text-black min-w-[2ch] text-center">
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
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#8DCFDD] text-white text-sm sm:text-base font-semibold hover:bg-[#7BBFCF] transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Subtotal */}
                        <div className="text-right min-w-[80px] sm:min-w-[100px]">
                          <p className="text-sm sm:text-base md:text-lg font-semibold text-black">
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
                            className="h-4 w-4 sm:h-5 sm:w-5"
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
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <span className="text-base sm:text-lg md:text-xl font-semibold text-black">
                    Total
                  </span>
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-black">
                    {formatKRW(total)}
                  </span>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <Link
                    href="/payment"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 sm:py-3 sm:px-6 bg-[#8DCFDD] text-white rounded-md text-sm sm:text-base font-medium hover:opacity-90 transition-opacity text-center"
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
