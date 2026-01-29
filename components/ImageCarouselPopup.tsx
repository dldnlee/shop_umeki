"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

interface PopupImage {
  id: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
  display_order: number;
}

interface ImageCarouselPopupProps {
  isOpen: boolean;
  onClose: () => void;
  dontShowAgain: boolean;
  onDontShowAgainChange: (value: boolean) => void;
}

export default function ImageCarouselPopup({
  isOpen,
  onClose,
  dontShowAgain,
  onDontShowAgainChange,
}: ImageCarouselPopupProps) {
  const [images, setImages] = useState<PopupImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("popup_images")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching popup images:", error);
      } else {
        setImages(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: PopupImage) => {
    if (image.link_url) {
      window.open(image.link_url, "_blank");
    }
  };

  // Close if no images
  useEffect(() => {
    if (!loading && images.length === 0 && isOpen) {
      onClose();
    }
  }, [loading, images.length, isOpen, onClose]);

  if (!isOpen || loading || images.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Swiper Carousel */}
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          spaceBetween={0}
          slidesPerView={1}
          className="rounded-t-lg"
        >
          {images.map((image) => (
            <SwiperSlide key={image.id}>
              <div
                className={`relative w-full aspect-square ${image.link_url ? "cursor-pointer" : ""}`}
                onClick={() => handleImageClick(image)}
              >
                <Image
                  src={image.image_url}
                  alt={image.title || "Popup image"}
                  fill
                  className="object-contain"
                  priority
                />

                {/* Image title overlay */}
                {image.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white text-center font-medium">{image.title}</p>
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Footer with checkbox */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onDontShowAgainChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">Don&apos;t show again today</span>
          </label>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
