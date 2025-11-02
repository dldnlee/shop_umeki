'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Product } from '@/models';
import { addToCart } from '@/lib/cart';
import { formatKRW } from '@/lib/utils';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs, FreeMode } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [selectedOption, setSelectedOption] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  // Update selected option when product changes
  useEffect(() => {
    if (product?.options?.[0]) {
      setSelectedOption(product.options[0]);
    }
  }, [product]);

  // Reset quantity when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      productName: product.name,
      price: product.price,
      option: selectedOption,
      quantity,
      slug: product.id.toString(),
    });
    alert(`Added ${quantity}x ${product.name} (${selectedOption}) to cart!`);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative my-4 sm:my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-3 right-3 sm:top-4 sm:right-4 float-right z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full shadow-md flex items-center justify-center text-xl sm:text-2xl text-black transition-colors"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="text-black">
          {/* Product Image Gallery */}
          <div className="w-full">
            {product.image_urls && product.image_urls.length > 0 ? (
              <div className="space-y-2 sm:space-y-4 p-2 sm:p-4">
                {/* Main Swiper */}
                <Swiper
                  modules={[Navigation, Pagination, Thumbs]}
                  navigation
                  pagination={{ clickable: true }}
                  thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                  className="w-full h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden"
                  spaceBetween={10}
                >
                  {product.image_urls.map((url, index) => (
                    <SwiperSlide key={index}>
                      <div className="relative w-full h-full bg-gray-100">
                        <Image
                          src={url}
                          alt={`${product.name} - Image ${index + 1}`}
                          fill
                          className="object-contain"
                          priority={index === 0}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Thumbnail Swiper */}
                {product.image_urls.length > 1 && (
                  <Swiper
                    onSwiper={setThumbsSwiper}
                    modules={[Thumbs, FreeMode]}
                    watchSlidesProgress
                    freeMode
                    slidesPerView={4}
                    spaceBetween={8}
                    className="w-full h-16 sm:h-20 md:h-24"
                    breakpoints={{
                      640: {
                        slidesPerView: 5,
                        spaceBetween: 10,
                      },
                      768: {
                        slidesPerView: 6,
                        spaceBetween: 10,
                      },
                    }}
                  >
                    {product.image_urls.map((url, index) => (
                      <SwiperSlide key={index} className="cursor-pointer">
                        <div className="relative w-full h-full rounded-md overflow-hidden border-2 border-[#8DCFDD] hover:border-black transition-colors">
                          <Image
                            src={url}
                            alt={`${product.name} - Thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>
            ) : (
              <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-100 flex items-center justify-center text-zinc-400">
                <span className="select-none text-base sm:text-lg">No Images Available</span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="p-4 sm:p-6 md:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-black mb-2">
              {product.name}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-4 sm:mb-6">
              {formatKRW(product.price)}
            </p>

            {/* Option Dropdown */}
            {product.options && product.options.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <label
                  htmlFor="option-select"
                  className="block text-xs sm:text-sm font-medium text-black mb-2"
                >
                  Select Option
                </label>
                <select
                  id="option-select"
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 bg-white border border-zinc-300 rounded-md text-sm sm:text-base text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {product.options.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-xs sm:text-sm font-medium text-black mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#8DCFDD] text-white text-sm sm:text-base font-semibold hover:bg-[#7BBFCF] transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="text-lg sm:text-xl font-medium text-black min-w-[3ch] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#8DCFDD] text-white text-sm sm:text-base font-semibold hover:bg-[#7BBFCF] transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="w-full py-2.5 px-4 sm:py-3 sm:px-6 bg-[#8DCFDD] text-white rounded-md font-medium text-base sm:text-lg hover:opacity-90 transition-opacity"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
