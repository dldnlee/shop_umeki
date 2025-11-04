'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { formatKRW } from '@/lib/utils';
import { Product } from '@/models';
import ProductModal from './ProductModal';
import { useTab } from './TabProvider';

interface MainPageTabsProps {
  products: Product[];
}

export default function MainPageTabs({ products }: MainPageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeTab } = useTab();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle URL state on mount and when URL changes
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId) {
      const product = products.find(p => p.id.toString() === productId);
      if (product) {
        setSelectedProduct(product);
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(false);
    }
  }, [searchParams, products]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    // Update URL without page reload
    router.push(`/?product=${product.id}`, { scroll: false });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Remove product from URL
    router.push('/', { scroll: false });
    setTimeout(() => setSelectedProduct(null), 300); // Clear after animation
  };

  return (
    <div className='pb-40'>
      {activeTab === 'goods' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="text-black">
            <img src="/goods_info.jpeg" alt="Fanmeeting info" className='w-full' />
            {/* Add fanmeeting information here */}
          </div>
        </div>
        // <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          /* {products.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProductClick(p)}
              className="rounded-lg bg-white shadow-md hover:scale-103 transition-all overflow-hidden hover:shadow-lg text-left cursor-pointer"
            >
              <div className="relative aspect-square bg-[#9CE5F4]">
                {p.image_urls && p.image_urls.length > 0 ? (
                  <Image
                    src={p.image_urls[0]}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400">
                    <span className="select-none text-xs sm:text-sm">No Image</span>
                  </div>
                )}
              </div>
              <div className="p-2 sm:p-3 md:p-4">
                <h3 className="text-xs sm:text-sm md:text-base font-medium text-black line-clamp-2">
                  {p.name}
                </h3>
                <div className="mt-2 sm:mt-3 md:mt-4 flex items-center justify-between">
                  <span className="text-sm sm:text-base md:text-lg font-semibold text-black">
                    {formatKRW(p.price)}
                  </span>
                </div>
              </div>
            </button>
          ))} */
        /* </section> */
      )}

      {activeTab === 'fanmeeting' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="text-black">
            <img src="/fanmeeting_info.jpg" alt="Fanmeeting info" className='w-full' />
            {/* Add fanmeeting information here */}
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
