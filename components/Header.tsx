"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import { useCartModal } from "@/components/CartModalProvider";

export default function Header() {
  const [itemCount, setItemCount] = useState(0);
  const { openCart } = useCartModal();


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
        </div>
      </div>
    </header>
  );
}
