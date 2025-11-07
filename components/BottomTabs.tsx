"use client";

import { useTab } from "@/components/TabProvider";
import { useCartModal } from "@/components/CartModalProvider";
import Link from "next/link";

export default function BottomTabs() {
  const { activeTab } = useTab();
  const { openCart } = useCartModal();

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

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
      {/* Floating Action Button */}
      <button
        onClick={handleActionButtonClick}
        className={`${activeTab === 'fanmeeting' ? 'bg-[#8DCFDD] text-white' : 'bg-white text-black'} px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2`}
      >
        {activeTab === 'fanmeeting' ? (
          <>
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
            티케팅 하기
          </>
        ) : (
          <>
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
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            구매하기
          </>
        )}
      </button>
      {/* Additional Link button (only visible when not fanmeeting) */}
      {activeTab !== "fanmeeting" && (
        <a
          target="_blank"
          href="https://hypetown.kr/event/mhollwh1-3dti"
          className="px-6 bg-black text-white py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2"
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
              d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c2.5 2.5 4 6.5 4 10s-1.5 7.5-4 10m0-20c-2.5 2.5-4 6.5-4 10s1.5 7.5 4 10"
            />
          </svg>
          For Foreign Customers
        </a>
      )}
    </div>
  );
}
