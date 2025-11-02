"use client";

import { usePathname } from "next/navigation";
import { useTab } from "@/components/TabProvider";

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useTab();
  const pathname = usePathname();

  // Only show tabs on home page
  const isHomePage = pathname === '/';

  if (!isHomePage) {
    return null;
  }

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
      <div className="flex gap-2 rounded-full bg-black/20 backdrop-blur-xl shadow-lg transition-all p-1.5 sm:p-2">
        <button
          onClick={() => setActiveTab('fanmeeting')}
          className={`px-4 py-2 sm:px-6 sm:py-2.5 font-medium text-sm sm:text-base transition-all rounded-full whitespace-nowrap ${
            activeTab === 'fanmeeting'
              ? 'text-black bg-white shadow-md'
              : 'text-white hover:text-white/80 hover:bg-white/10'
          }`}
        >
          팬미팅 정보
        </button>
        <button
          onClick={() => setActiveTab('goods')}
          className={`px-4 py-2 sm:px-6 sm:py-2.5 font-medium text-sm sm:text-base transition-all rounded-full whitespace-nowrap ${
            activeTab === 'goods'
              ? 'text-black bg-white shadow-md'
              : 'text-white hover:text-white/80 hover:bg-white/10'
          }`}
        >
          굿즈 정보
        </button>
      </div>
    </div>
  );
}
