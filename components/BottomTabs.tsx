"use client";

import { usePathname } from "next/navigation";
import { useTab } from "@/components/TabProvider";
import { useRef, useEffect, useState } from "react";

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useTab();
  const pathname = usePathname();
  const fanmeetingRef = useRef<HTMLButtonElement>(null);
  const goodsRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
  });

  // Only show tabs on home page
  const isHomePage = pathname === '/';

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
        className={`bg-[#8DCFDD] ${activeTab === 'fanmeeting' ? 'bg-[#8DCFDD] text-white' : 'bg-white text-black'} px-8 py-3 sm:px-10 sm:py-3 rounded-full text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap w-[200px]`}
      >
        {activeTab === 'fanmeeting' ? '티케팅 하기' : '구매하기'}
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
          className={`relative z-10 px-4 py-2 sm:px-6 sm:py-2.5 font-medium text-sm sm:text-base transition-colors duration-300 rounded-full whitespace-nowrap ${
            activeTab === 'fanmeeting'
              ? 'text-black'
              : 'text-white hover:text-white/80'
          }`}
        >
          팬미팅 정보
        </button>
        <button
          ref={goodsRef}
          onClick={() => setActiveTab('goods')}
          className={`relative z-10 px-4 py-2 sm:px-6 sm:py-2.5 font-medium text-sm sm:text-base transition-colors duration-300 rounded-full whitespace-nowrap ${
            activeTab === 'goods'
              ? 'text-black'
              : 'text-white hover:text-white/80'
          }`}
        >
          굿즈 정보
        </button>
      </div>
    </div>
  );
}
