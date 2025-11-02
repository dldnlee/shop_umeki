"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCart } from "@/lib/cart";
import { useCartModal } from "@/components/CartModalProvider";
import { useTab } from "@/components/TabProvider";

export default function Header() {
  const [itemCount, setItemCount] = useState(0);
  const { openCart } = useCartModal();
  const { activeTab, setActiveTab } = useTab();
  const pathname = usePathname();

  // Only show tabs on home page
  const isHomePage = pathname === '/';

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
    <header className="sticky top-0 z-40 bg-[#8DCFDD] border-b border-white/20 w-full flex flex-col items-center py-3">
      <div className="max-w-6xl w-full pt-4">
        <div className="flex items-center justify-between mb-4 px-8">
          {/* Logo/Brand */}
          <Link href="/" className="text-2xl font-semibold text-black hover:opacity-80 transition-opacity">
            유메키 팬미팅
          </Link>

          {/* Cart Button */}
          <button
            onClick={openCart}
            className="relative text-white border rounded-full w-12 h-12 flex items-center justify-center hover:scale-105 transition-all duration-200"
            aria-label="View cart"
          >
            {/* Shopping Cart Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Navigation - Only show on home page */}
        {isHomePage && (
          <div className="flex gap-2 rounded-full border-2 border-gray-200 transition-all p-2 mx-4">
            <button
              onClick={() => setActiveTab('fanmeeting')}
              className={`px-6 py-2 font-medium text-lg transition-all rounded-full w-full ${
                activeTab === 'fanmeeting'
                  ? 'text-black bg-white'
                  : 'text-black/60 hover:text-black/80'
              }`}
            >
              팬미팅 정보
            </button>
            <button
              onClick={() => setActiveTab('goods')}
              className={`px-6 py-3 font-medium text-lg transition-all rounded-full w-full ${
                activeTab === 'goods'
                  ? 'text-black bg-white'
                  : 'text-black/60 hover:text-black/80'
              }`}
            >
              굿즈 정보
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
