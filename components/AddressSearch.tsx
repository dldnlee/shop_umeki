"use client";

import { useState } from "react";

type AddressResult = {
  roadFullAddr: string;
  roadAddrPart1: string;
  roadAddrPart2: string;
  jibunAddr: string;
  zipNo: string;
  bdNm: string;
  admCd: string;
  rnMgtSn: string;
  bdKdcd: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  liNm: string;
  rn: string;
  udrtYn: string;
  buldMnnm: number;
  buldSlno: number;
  mtYn: string;
  lnbrMnnm: number;
  lnbrSlno: number;
  emdNo: string;
};

type AddressSearchProps = {
  onSelectAddress: (address: string, zipCode: string) => void;
  apiKey: string;
};

export function AddressSearch({ onSelectAddress, apiKey }: AddressSearchProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setError("검색어를 입력해주세요");
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      // Use the Search API endpoint
      const response = await fetch(
        `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${apiKey}&currentPage=1&countPerPage=10&keyword=${encodeURIComponent(
          searchKeyword
        )}&resultType=json`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Juso API response:", data);

      if (data.results.common.errorCode !== "0") {
        setError(data.results.common.errorMessage || "주소 검색에 실패했습니다");
        setResults([]);
      } else {
        const juso = data.results.juso || [];
        setResults(juso);
        setShowResults(true);

        if (juso.length === 0) {
          setError("검색 결과가 없습니다");
        }
      }
    } catch (err) {
      console.error("Address search error:", err);
      setError("주소 검색 중 오류가 발생했습니다");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAddress = (result: AddressResult) => {
    const fullAddress = result.roadAddrPart1;
    onSelectAddress(fullAddress, result.zipNo);
    setShowResults(false);
    setSearchKeyword("");
    setResults([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
          placeholder="도로명 또는 지번 주소를 입력하세요"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-zinc-700 dark:bg-zinc-600 text-white rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isSearching ? "검색중..." : "주소 검색"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectAddress(result)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 transition-colors"
            >
              <p className="text-sm font-medium text-black dark:text-white">
                {result.roadAddrPart1}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                (지번) {result.jibunAddr}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                우편번호: {result.zipNo}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
