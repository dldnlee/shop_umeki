"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getCart, addToCart, removeFromCart, getCartTotal } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import { Product } from "@/models";
import { supabase } from "@/lib/supabase";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProductSelection {
  [option: string]: number; // option -> quantity
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selections, setSelections] = useState<{ [productId: number]: ProductSelection }>({});
  const [loading, setLoading] = useState(true);

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  // Initialize selections from cart
  useEffect(() => {
    if (products.length > 0) {
      const cart = getCart();
      const newSelections: { [productId: number]: ProductSelection } = {};

      // Initialize all products with empty selections
      products.forEach(product => {
        newSelections[product.id] = {};
      });

      // Fill in selections from cart
      cart.forEach(item => {
        if (newSelections[item.productId]) {
          const option = item.option || 'default';
          newSelections[item.productId][option] = item.quantity;
        }
      });

      setSelections(newSelections);
    }
  }, [products]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('umeki_products')
        .select('*')
        .order('display_order')
        ;

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts((data || []) as Product[]);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOptionChange = (productId: number, option: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSelections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [option]: quantity
      }
    }));

    // Update cart
    if (quantity > 0) {
      addToCart({
        productId: product.id,
        productName: product.name,
        price: product.price,
        option: option === 'default' ? undefined : option,
        quantity: quantity,
        slug: product.id.toString()
      });
    } else {
      removeFromCart(product.id, option === 'default' ? undefined : option);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const total = getCartTotal();
  const cart = getCart();
  const hasItems = cart.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative my-2 sm:my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-2 right-2 sm:top-4 sm:right-4 float-right z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full shadow-md flex items-center justify-center text-2xl sm:text-3xl text-black transition-colors"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="p-3 sm:p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-black">
              Shopping Cart
            </h1>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-sm sm:text-base text-zinc-600">Loading products...</p>
            </div>
          ) : (
            <>
              {/* Products List - Compact Horizontal Layout */}
              <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-8">
                {products.map((product) => {
                  const productSelections = selections[product.id] || {};
                  const hasSelection = Object.values(productSelections).some(qty => qty > 0);

                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-md border transition-all ${
                        hasSelection ? 'border-[#8DCFDD] bg-[#8DCFDD]/5' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex gap-2 p-2">
                        {/* Small Product Image */}
                        <div className="relative w-14 h-14 sm:w-20 sm:h-20 shrink-0 bg-gray-100 rounded overflow-hidden">
                          {product.image_urls && product.image_urls.length > 0 ? (
                            <Image
                              src={product.image_urls[0]}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-zinc-400">
                              <span className="text-xs">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info & Controls */}
                        <div className="flex-1 min-w-0">
                          {/* Product Name & Price */}
                          <div className="mb-1.5">
                            <h3 className="text-xs sm:text-sm font-semibold text-black line-clamp-1 leading-tight">
                              {product.name}
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-black">
                              {formatKRW(product.price)}
                            </p>
                          </div>

                          {/* Options Selection - Compact */}
                          {product.options && product.options.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.options.map((option) => {
                                const quantity = productSelections[option] || 0;
                                return (
                                  <div key={option} className="flex items-center gap-0.5 bg-gray-50 rounded px-1 py-0.5 sm:px-1.5 sm:py-1">
                                    <span className="text-[10px] sm:text-xs text-gray-700 font-medium">
                                      {option}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        onClick={() => handleOptionChange(product.id, option, Math.max(0, quantity - 1))}
                                        className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-black text-xs font-semibold transition-colors flex items-center justify-center"
                                        aria-label="Decrease"
                                      >
                                        -
                                      </button>
                                      <span className="text-[10px] sm:text-xs font-medium text-black min-w-[1.5ch] text-center px-0.5">
                                        {quantity}
                                      </span>
                                      <button
                                        onClick={() => handleOptionChange(product.id, option, quantity + 1)}
                                        className="w-5 h-5 rounded bg-[#8DCFDD] hover:bg-[#7BBFCF] active:bg-[#6AAFBF] text-white text-xs font-semibold transition-colors flex items-center justify-center"
                                        aria-label="Increase"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            // No options - single quantity selector
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] sm:text-xs text-gray-700">Qty:</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOptionChange(product.id, 'default', Math.max(0, (productSelections['default'] || 0) - 1))}
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-black text-xs sm:text-sm font-semibold transition-colors"
                                  aria-label="Decrease"
                                >
                                  -
                                </button>
                                <span className="text-xs sm:text-sm font-medium text-black min-w-[2ch] text-center">
                                  {productSelections['default'] || 0}
                                </span>
                                <button
                                  onClick={() => handleOptionChange(product.id, 'default', (productSelections['default'] || 0) + 1)}
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-[#8DCFDD] hover:bg-[#7BBFCF] active:bg-[#6AAFBF] text-white text-xs sm:text-sm font-semibold transition-colors"
                                  aria-label="Increase"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Selection Indicator Pills */}
                          {hasSelection && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(productSelections)
                                .filter(([, qty]) => qty > 0)
                                .map(([option, qty]) => (
                                  <div
                                    key={option}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#8DCFDD] text-white rounded-full text-[10px] sm:text-xs font-medium"
                                  >
                                    <span>{option === 'default' ? 'Qty' : option}</span>
                                    <span className="font-bold">× {qty}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Summary - Fixed at bottom */}
              {hasItems && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-5 md:p-6 sticky bottom-0">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="text-sm sm:text-lg md:text-xl font-semibold text-black">
                      Total
                    </span>
                    <span className="text-base sm:text-xl md:text-2xl font-bold text-black">
                      {formatKRW(total)}
                    </span>
                  </div>
                  <Link
                    href="/payment"
                    onClick={onClose}
                    className="block w-full py-2 px-3 sm:py-3 sm:px-6 bg-[#8DCFDD] text-white rounded-md text-sm sm:text-base font-medium hover:opacity-90 active:opacity-80 transition-opacity text-center"
                  >
                    Checkout ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </Link>
                </div>
              )}

              {!hasItems && (
                <div className="text-center py-6 sm:py-12">
                  <p className="text-xs sm:text-base text-zinc-600 mb-4">
                    Select products and quantities to add to your cart
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
