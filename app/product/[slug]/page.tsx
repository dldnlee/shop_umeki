"use client";

import { useState, use } from "react";
import { mockProducts } from "@/mock_data";
import { addToCart } from "@/lib/cart";
import { formatKRW } from "@/lib/utils";
import Link from "next/link";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const product = mockProducts[slug];
  const [selectedOption, setSelectedOption] = useState(product?.options[0] || "");
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Product not found</p>
      </div>
    );
  }

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-foreground">
      <main className="max-w-4xl mx-auto p-8">
        <Link href="..">
          {'<'} Back
        </Link>
        <div className="bg-white dark:bg-[#0b0b0b] rounded-lg border border-black/6 shadow-sm overflow-hidden">
          {/* Product Image */}
          <div className="w-full h-96 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-zinc-400">
            <span className="select-none text-lg">Product Image</span>
          </div>

          {/* Product Details */}
          <div className="p-8">
            <h1 className="text-3xl font-semibold text-black dark:text-white mb-2">
              {product.name}
            </h1>

            <p className="text-2xl font-bold text-black dark:text-white mb-6">
              {formatKRW(product.price)}
            </p>

            <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              {product.description}
            </p>

            {/* Option Dropdown */}
            {
              product.options.length > 0 && 
              <div className="mb-6">
                <label
                  htmlFor="option-select"
                  className="block text-sm font-medium text-black dark:text-white mb-2"
                >
                  Select Option
                </label>
                <select
                  id="option-select"
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {product.options.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            }


            {/* Quantity Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="text-xl font-medium text-black dark:text-white min-w-[3ch] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="w-full py-3 px-6 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium text-lg hover:opacity-90 transition-opacity"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
