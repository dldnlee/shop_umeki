"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/models";
import { addToCart } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Thumbs, FreeMode } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "swiper/css/free-mode";

interface ProductClientProps {
  product: Product;
  slug: string;
}

export default function ProductClient({ product, slug }: ProductClientProps) {
  const [selectedOption, setSelectedOption] = useState(product?.options?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

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
      slug,
    });
    alert(`Added ${quantity}x ${product.name} (${selectedOption}) to cart!`);
  };

  return (
    <div className="bg-white text-black rounded-lg border border-black/6 shadow-sm overflow-hidden">
      {/* Product Image Gallery */}
      <div className="w-full">
        {product.image_urls && product.image_urls.length > 0 ? (
          <div className="space-y-4 p-4">
            {/* Main Swiper */}
            <Swiper
              modules={[Navigation, Pagination, Thumbs]}
              navigation
              pagination={{ clickable: true }}
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              className="w-full h-96 rounded-lg overflow-hidden"
              spaceBetween={10}
            >
              {product.image_urls.map((url, index) => (
                <SwiperSlide key={index}>
                  <div className="relative w-full h-full bg-gray-100 ">
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
                spaceBetween={10}
                className="w-full h-24"
                breakpoints={{
                  640: {
                    slidesPerView: 5,
                  },
                  768: {
                    slidesPerView: 6,
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
          <div className="w-full h-96 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-zinc-400">
            <span className="select-none text-lg">No Images Available</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-8">
        <h1 className="text-3xl font-semibold text-black mb-2">
          {product.name}
        </h1>

        <p className="text-2xl font-bold text-black mb-6">
          {formatKRW(product.price)}
        </p>

        {/* Option Dropdown */}
        {product.options && product.options.length > 0 && (
          <div className="mb-6">
            <label
              htmlFor="option-select"
              className="block text-sm font-medium text-black mb-2"
            >
              Select Option
            </label>
            <select
              id="option-select"
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-zinc-300  rounded-md text-black focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
        <div className="mb-8">
          <label className="block text-sm font-medium text-black mb-2">
            Quantity
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="w-10 h-10 rounded-md bg-[#8DCFDD] text-white font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="text-xl font-medium text-black min-w-[3ch] text-center">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="w-10 h-10 rounded-md bg-[#8DCFDD] text-white dark:text-white font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="w-full py-3 px-6 bg-[#8DCFDD] text-white rounded-md font-medium text-lg hover:opacity-90 transition-opacity"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
