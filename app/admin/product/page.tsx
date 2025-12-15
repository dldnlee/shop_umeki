'use client';

import { supabase } from "@/lib/supabase";
import { Product, Inventory } from "@/models";
import { useEffect, useState } from "react";
import { getInventoryByOptions } from "@/lib/inventory";

export default function AdminProductPage() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingInventory, setEditingInventory] = useState<{ [productId: number]: Inventory | number }>({});
  const [savingProduct, setSavingProduct] = useState<{ [productId: number]: boolean }>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('umeki_products')
        .select('*')
        .order('display_order');

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts((data || []) as Product[]);
        // Initialize editing state
        const initialEditing: { [productId: number]: Inventory | number } = {};
        (data || []).forEach((product: Product) => {
          initialEditing[product.id] = product.inventory;
        });
        setEditingInventory(initialEditing);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryChange = (productId: number, option: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingInventory(prev => {
      const current = prev[productId];
      if (typeof current === 'number') {
        // Simple product
        return { ...prev, [productId]: numValue };
      } else {
        // Product with options
        return {
          ...prev,
          [productId]: {
            ...current,
            [option]: numValue
          }
        };
      }
    });
  };

  const handleSaveInventory = async (productId: number) => {
    try {
      setSavingProduct(prev => ({ ...prev, [productId]: true }));

      const { error } = await supabase
        .from('umeki_products')
        .update({ inventory: editingInventory[productId] })
        .eq('id', productId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, inventory: editingInventory[productId] }
          : p
      ));

      alert('재고가 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('재고 업데이트에 실패했습니다.');
    } finally {
      setSavingProduct(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">제품 재고 관리</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">제품 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">제품 재고 관리</h1>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500 text-sm">등록된 제품이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const inventoryOptions = getInventoryByOptions(product);
              const isEdited = JSON.stringify(editingInventory[product.id]) !== JSON.stringify(product.inventory);

              return (
                <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-300">
                  <div className="p-4">
                    {/* Product Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-3 flex-1">
                        {product.image_urls && product.image_urls.length > 0 && (
                          <img
                            src={product.image_urls[0]}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded border border-gray-200 shrink-0"
                          />
                        )}
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{product.name}</h3>
                          <p className="text-xs text-gray-600 mt-0.5">
                            가격: {product.price.toLocaleString('ko-KR')}원
                          </p>
                        </div>
                      </div>
                      {isEdited && (
                        <button
                          onClick={() => handleSaveInventory(product.id)}
                          disabled={savingProduct[product.id]}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0"
                        >
                          {savingProduct[product.id] ? '저장중...' : '재고 저장'}
                        </button>
                      )}
                    </div>

                    {/* Inventory Options */}
                    <div className="border-t border-gray-200 pt-3">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">재고 관리</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {inventoryOptions.map(({ option, quantity }) => {
                          const editingValue = editingInventory[product.id];
                          const currentValue: number = typeof editingValue === 'number'
                            ? editingValue
                            : (editingValue as Inventory)?.[option] ?? 0;

                          return (
                            <div key={option} className="bg-gray-50 rounded p-2 border border-gray-200">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {option === 'default' ? '기본 재고' : option}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={currentValue.toString()}
                                onChange={(e) => handleInventoryChange(product.id, option, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                현재: {quantity}개
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}