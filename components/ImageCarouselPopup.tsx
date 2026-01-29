"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

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
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleImageClick = () => {
    const currentImage = images[currentIndex];
    if (currentImage?.link_url) {
      window.open(currentImage.link_url, "_blank");
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

  const currentImage = images[currentIndex];

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

        {/* Image container */}
        <div
          className={`relative w-full aspect-square ${currentImage.link_url ? "cursor-pointer" : ""}`}
          onClick={handleImageClick}
        >
          <Image
            src={currentImage.image_url}
            alt={currentImage.title || "Popup image"}
            fill
            className="object-contain rounded-t-lg"
            priority
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Image title overlay */}
          {currentImage.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white text-center font-medium">{currentImage.title}</p>
            </div>
          )}
        </div>

        {/* Dots indicator */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 py-3 bg-gray-50">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}

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
