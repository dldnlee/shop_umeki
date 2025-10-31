"use client";

import { addToCart } from "@/lib/cart";

type AddToCartButtonProps = {
  productId: number;
  productName: string;
  price: number;
};

export function AddToCartButton({
  productId,
  productName,
  price,
  quantity,
  option
}: AddToCartButtonProps) {
  const handleAddToCart = () => {
    addToCart({
      productId,
      productName,
      price,
      quantity: 1,
    });
    alert(`Added ${productName} to cart!`);
  };

  return (
    <button
      onClick={handleAddToCart}
      className="rounded-md bg-foreground px-3 py-1 text-white text-sm hover:opacity-90 dark:bg-zinc-200 dark:text-black"
    >
      장바구니에 담기
    </button>
  );
}
