"use client";

import { useEffect } from "react";

type AddressSearchPopupProps = {
  onSelectAddress: (
    address: string,
    zipCode: string,
    addressDetail?: string
  ) => void;
  apiKey: string;
};

// Declare global callback function type
declare global {
  interface Window {
    jusoCallBack?: (
      roadFullAddr: string,
      roadAddrPart1: string,
      addrDetail: string,
      roadAddrPart2: string,
      engAddr: string,
      jibunAddr: string,
      zipNo: string,
      admCd: string,
      rnMgtSn: string,
      bdMgtSn: string,
      detBdNmList: string,
      bdNm: string,
      bdKdcd: string,
      siNm: string,
      sggNm: string,
      emdNm: string,
      liNm: string,
      rn: string,
      udrtYn: string,
      buldMnnm: string,
      buldSlno: string,
      mtYn: string,
      lnbrMnnm: string,
      lnbrSlno: string,
      emdNo: string
    ) => void;
  }
}

export function AddressSearchPopup({
  onSelectAddress,
  apiKey,
}: AddressSearchPopupProps) {
  useEffect(() => {
    // Define the callback function that will be called from the popup
    window.jusoCallBack = function (
      _roadFullAddr: string,
      roadAddrPart1: string,
      addrDetail: string,
      _roadAddrPart2: string,
      _engAddr: string,
      _jibunAddr: string,
      zipNo: string,
      _admCd: string,
      _rnMgtSn: string,
      _bdMgtSn: string,
      _detBdNmList: string,
      _bdNm: string,
      _bdKdcd: string,
      _siNm: string,
      _sggNm: string,
      _emdNm: string,
      _liNm: string,
      _rn: string,
      _udrtYn: string,
      _buldMnnm: string,
      _buldSlno: string,
      _mtYn: string,
      _lnbrMnnm: string,
      _lnbrSlno: string,
      _emdNo: string
    ) {
      console.log("jusoCallBack called with:", {
        roadAddrPart1,
        zipNo,
        addrDetail,
      });

      // Use roadAddrPart1 for the main address
      onSelectAddress(roadAddrPart1, zipNo, addrDetail);
    };

    console.log("jusoCallBack registered on window");

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up jusoCallBack");
      if (window.jusoCallBack) {
        delete window.jusoCallBack;
      }
    };
  }, [onSelectAddress]);

  const openAddressPopup = () => {
    const width = 570;
    const height = 420;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Build the popup URL with confmKey parameter
    const popupUrl = `/juso-callback.html?confmKey=${encodeURIComponent(apiKey)}`;

    // Open popup window
    const popup = window.open(
      popupUrl,
      "addressPopup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      alert("팝업 차단을 해제해주세요.");
      return;
    }
  };

  return (
    <button
      type="button"
      onClick={openAddressPopup}
      className="w-full px-4 py-2 bg-zinc-700 dark:bg-zinc-600 text-white rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
    >
      주소 검색
    </button>
  );
}
