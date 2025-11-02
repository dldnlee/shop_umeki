"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCart } from "@/lib/cart";
import { useCartModal } from "@/components/CartModalProvider";

export default function Header() {
  const [itemCount, setItemCount] = useState(0);
  const { openCart } = useCartModal();
  const pathname = usePathname();

  // Hide header on payment pages
  const shouldHideHeader = pathname?.startsWith('/payment');

  useEffect(() => {
    // Listen for cart updates
    const handleCartUpdate = () => {
      setItemCount(getCart().length);
    };

    // Initialize cart count on mount
    handleCartUpdate();

    window.addEventListener("cartUpdated", handleCartUpdate);

    // Also check on storage changes (in case of updates from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "umeki_cart") {
        setItemCount(getCart().length);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Don't render header on payment pages
  if (shouldHideHeader) {
    return null;
  }

  return (
    <header className="fixed top-0 z-40 bg-black/20 backdrop-blur-2xl border-b border-white/20 w-full flex flex-col items-center py-2 sm:py-3">
      <div className="max-w-6xl w-full">
        <div className="flex items-center justify-between px-3 sm:px-8">
          {/* Logo/Brand */}
          <Link href="/" className=" sm:text-xl md:text-2xl font-semibold text-white transition-opacity">
            {"유메키 팬미팅 <YOU MAKE IT>"}
          </Link>

          {/* View Order Button */}
          <Link
            href="/order"
            className="text-white border border-white/30 rounded-full px-4 py-2 text-sm font-medium hover:bg-white/10 transition-all duration-200 whitespace-nowrap"
            aria-label="View order"
          >
            주문 조회
          </Link>

          {/* Cart Button
          <button
            onClick={openCart}
            className="relative text-white border rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center hover:scale-105 transition-all duration-200"
            aria-label="View cart"
          >
            Shopping Cart Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>

            Item Count Badge
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button> */}
        </div>
      </div>
    </header>
  );
}
