"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import BottomTabs from "@/components/BottomTabs";
import { CartModalProvider } from "@/components/CartModalProvider";
import { TabProvider } from "@/components/TabProvider";

const POPUP_STORAGE_KEY = "homePopupDismissed";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if popup was dismissed today
    const dismissedDate = localStorage.getItem(POPUP_STORAGE_KEY);
    const today = new Date().toDateString();

    if (dismissedDate !== today) {
      // Use setTimeout to avoid state update during render
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClosePopup = () => {
    if (dontShowAgain) {
      const today = new Date().toDateString();
      localStorage.setItem(POPUP_STORAGE_KEY, today);
    }
    setShowPopup(false);
  };

  return (
    <TabProvider>
      <CartModalProvider>
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        {children}
        <BottomTabs />

        {/* Popup Modal */}
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              {/* Close button */}
              <button
                onClick={handleClosePopup}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Popup content */}
              <div className="mb-6 max-">
                <h2 className="text-md md:text-lg font-bold mb-4">Important Notice / お知らせ / 중요 공지</h2>

                <div className="space-y-4 text-sm max-h-70 overflow-y-auto">
                  {/* Korean */}
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-gray-800 mb-2">🇰🇷 한국어</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li className="text-yellow-600">후드집업 구매 시 배송까지 약 2주 정도 소요됩니다.</li>
                      <li>일본인 고객님께서는 배송 시 11자리 전화번호를 제공해 주셔야 합니다.</li>
                      <li>주문 후 배송 시작까지 최대 일주일이 걸릴 수 있습니다.</li>
                      <li>환불 요청시 개봉영상을 첨부해주시기 바랍니다.</li>
                    </ul>
                  </div>

                  {/* Japanese */}
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-gray-800 mb-2">🇯🇵 日本語</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li className="text-yellow-600">フードジップアップをご購入の場合、配送まで約2週間ほどお時間をいただいております。</li>
                      <li>日本のお客様は配送時に11桁の電話番号をご提供ください。</li>
                      <li>ご注文後、韓国から発送されるまで最大1週間かかる場合がございます。</li>
                      <li>返金を申請される際は、開封動画の添付をお願いいたします</li>
                    </ul>
                  </div>

                  {/* English */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">🇺🇸 English</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li className="text-yellow-600">Please note that hoodie zip-up orders may take approximately 2 weeks for delivery.</li>
                      <li>Japanese customers must provide an 11-digit phone number for delivery.</li>
                      <li>After placing your order, it may take up to one week for your order to be sent from Korea.</li>
                      <li>Please attach an unboxing video when requesting a refund.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Don't show again checkbox */}
              <div className="flex items-center justify-between border-t pt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Don&apos;t show again today
                  </span>
                </label>

                <button
                  onClick={handleClosePopup}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </CartModalProvider>
    </TabProvider>
  );
}
