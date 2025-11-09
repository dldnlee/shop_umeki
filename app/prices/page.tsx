import { supabase } from "@/lib/supabase";
import { Product } from "@/models";

// Format KRW currency
function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

export default async function PricesPage() {
  // Fetch products from Supabase
  const { data: products, error } = await supabase
    .from('umeki_products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
  }

  const productList = (products || []) as Product[];

  return (
    <div className="min-h-screen bg-[#8DCFDD] font-sans text-foreground">
      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Product Prices</h1>

          {productList.length === 0 ? (
            <p className="text-gray-600">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {productList.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Product Image */}
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <img
                        src={product.image_urls[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-2 sm:p-3">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-800 mb-2 line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="space-y-2">
                      <div className="font-bold text-base sm:text-lg text-gray-800">
                        {formatKRW(product.price)}
                      </div>

                      {product.options && product.options.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {product.options.slice(0, 3).map((option, idx) => (
                            <span
                              key={idx}
                              className="inline-block bg-gray-200 rounded px-1.5 py-0.5 text-xs"
                            >
                              {option}
                            </span>
                          ))}
                          {product.options.length > 3 && (
                            <span className="inline-block text-gray-500 text-xs">
                              +{product.options.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-semibold">Total Products:</span>
              <span className="text-lg font-bold">{productList.length}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
