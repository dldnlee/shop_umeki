"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";

export default function FloatingCartButton() {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    // Initialize cart count on mount (number of unique items, not total quantity)
    setItemCount(getCart().length);

    // Listen for cart updates
    const handleCartUpdate = () => {
      setItemCount(getCart().length);
    };

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

  return (
    <Link
      href="/cart"
      className="fixed bottom-6 right-6 bg-black dark:bg-white text-white dark:text-black rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200 z-50"
      aria-label="View cart"
    >
      <div className="relative">
        {/* Shopping Cart Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
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

        {/* Item Count Badge */}
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </div>
    </Link>
  );
}
