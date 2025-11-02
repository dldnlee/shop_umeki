"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTab } from "@/components/TabProvider";
import { useCartModal } from "@/components/CartModalProvider";
import { useRef, useEffect, useState } from "react";

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useTab();
  const pathname = usePathname();
  const router = useRouter();
  const { openCart } = useCartModal();
  const fanmeetingRef = useRef<HTMLButtonElement>(null);
  const goodsRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
  });

  // Only show tabs on home page
  const isHomePage = pathname === '/';

  // Handle floating action button click
  const handleActionButtonClick = () => {
    if (activeTab === 'fanmeeting') {
      // Redirect to fanmeeting URL - update this URL as needed
      window.open('https://www.hypetown.kr/event/mguchc1l-z86g');
    } else {
      // Open cart modal for goods tab
      openCart();
    }
  };

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeRef = activeTab === 'fanmeeting' ? fanmeetingRef : goodsRef;
    if (activeRef.current && containerRef.current) {
      const buttonRect = activeRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const left = buttonRect.left - containerRect.left;

      setIndicatorStyle({
        width: buttonRect.width,
        left: left,
      });
    }
  }, [activeTab]);

  if (!isHomePage) {
    return null;
  }

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
      {/* Floating Action Button */}
      <button
        onClick={handleActionButtonClick}
        className={`bg-[#8DCFDD] ${activeTab === 'fanmeeting' ? 'bg-[#8DCFDD] text-white' : 'bg-white text-black'} px-8 py-3 sm:px-10 sm:py-3 rounded-full text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap w-[200px] flex items-center justify-center gap-2`}
      >
        {activeTab === 'fanmeeting' ? (
          <>
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
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            티케팅 하기
          </>
        ) : (
          <>
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
            구매하기
          </>
        )}
      </button>

      {/* Bottom Tabs */}
      <div ref={containerRef} className="relative flex gap-2 rounded-full bg-black/20 backdrop-blur-xl shadow-lg p-1.5 sm:p-2">
        {/* Sliding background indicator */}
        <div
          className="absolute bg-white rounded-full shadow-md transition-all duration-300 ease-out"
          style={{
            width: `${indicatorStyle.width}px`,
            height: `calc(100% - 0.75rem)`,
            top: '0.375rem',
            left: `${indicatorStyle.left}px`,
          }}
        />

        <button
          ref={fanmeetingRef}
          onClick={() => setActiveTab('fanmeeting')}
          className={`relative z-10 px-4 py-2 sm:px-6 sm:py-2.5 font-medium text-sm sm:text-base transition-colors duration-300 rounded-full whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'fanmeeting'
              ? 'text-black'
              : 'text-white hover:text-white/80'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
          팬미팅 정보
        </button>
        <button
          ref={goodsRef}
          onClick={() => setActiveTab('goods')}
          className={`relative z-10 px-4 py-2 sm:px-6 sm:py-2.5 font-medium text-sm sm:text-base transition-colors duration-300 rounded-full whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'goods'
              ? 'text-black'
              : 'text-white hover:text-white/80'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          굿즈 정보
        </button>
      </div>
    </div>
  );
}
