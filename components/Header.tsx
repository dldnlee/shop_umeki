"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTab } from "@/components/TabProvider";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { activeTab, setActiveTab } = useTab();
  const fanmeetingRef = useRef<HTMLButtonElement>(null);
  const goodsRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    left: 0,
  });

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


  return (
    <header className="fixed top-0 z-40 bg-black/20 backdrop-blur-2xl border-b border-white/20 w-full flex flex-col items-center py-2 sm:py-3">
      <div className="max-w-6xl w-full">
        <div className="flex items-center justify-center px-3 sm:px-8 gap-4">
          {/* Logo/Brand - Left Section */}
          <div className="flex-1 flex justify-start">
            <Link href="/" className="text-xs sm:text-xl md:text-2xl font-semibold text-white transition-opacity">
              <p>유메키 팬미팅</p>
              <p>{"<YOU MAKE IT>"}</p>
            </Link>
          </div>

          {/* Tab Navigation - Center Section */}
          <div className="flex-1 flex justify-center">
            <div ref={containerRef} className="relative flex gap-2 rounded-full bg-black/30 backdrop-blur-xl p-1.5">
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
              className={`relative z-10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-xs sm:text-sm transition-colors duration-300 rounded-full whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'fanmeeting'
                  ? 'text-black'
                  : 'text-white hover:text-white/80'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-4 sm:w-4"
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
              <span className="hidden sm:inline">팬미팅 정보</span>
            </button>
            <button
              ref={goodsRef}
              onClick={() => setActiveTab('goods')}
              className={`relative z-10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-xs sm:text-sm transition-colors duration-300 rounded-full whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'goods'
                  ? 'text-black'
                  : 'text-white hover:text-white/80'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-4 sm:w-4"
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
              <span className="hidden sm:inline">굿즈 정보</span>
            </button>
            </div>
          </div>

          {/* Hamburger Menu Button - Right Section */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/20 text-white hover:bg-black/30 transition-all duration-200"
              aria-label="Toggle menu"
            >
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
