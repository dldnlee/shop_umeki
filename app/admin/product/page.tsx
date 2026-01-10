'use client';

import { supabase } from "@/lib/supabase";
import { Product, Inventory } from "@/models";
import { useEffect, useState } from "react";
import { getInventoryByOptions } from "@/lib/inventory";
import Image from "next/image";

interface ProductFormData {
  name: string;
  eng_name: string;
  price: number;
  image_urls: string[];
  inventory: Inventory;
  display_order: number;
  is_active: boolean;
  malltail_item_code: string;
}

const defaultFormData: ProductFormData = {
  name: '',
  eng_name: '',
  price: 0,
  image_urls: [],
  inventory: {},
  display_order: 0,
  is_active: true,
  malltail_item_code: '',
};

export default function AdminProductPage() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingInventory, setEditingInventory] = useState<{ [productId: number]: Inventory | number }>({});
  const [savingProduct, setSavingProduct] = useState<{ [productId: number]: boolean }>({});

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [formLoading, setFormLoading] = useState(false);

  // New option input state
  const [newOptionName, setNewOptionName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

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

  const handleToggleActive = async (productId: number, currentStatus: boolean) => {
    try {
      setSavingProduct(prev => ({ ...prev, [productId]: true }));

      const { error } = await supabase
        .from('umeki_products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, is_active: !currentStatus }
          : p
      ));
    } catch (error) {
      console.error('Error toggling product status:', error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setSavingProduct(prev => ({ ...prev, [productId]: false }));
    }
  };

  const openAddModal = () => {
    setFormData(defaultFormData);
    setNewOptionName('');
    setNewImageUrl('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      eng_name: product.eng_name || '',
      price: product.price,
      image_urls: product.image_urls || [],
      inventory: typeof product.inventory === 'object' ? product.inventory : { default: product.inventory as number },
      display_order: product.display_order,
      is_active: product.is_active,
      malltail_item_code: product.malltail_item_code || '',
    });
    setNewOptionName('');
    setNewImageUrl('');
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    setFormData(defaultFormData);
  };

  const handleFormChange = (field: keyof ProductFormData, value: string | number | boolean | string[] | Inventory) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInventoryFormChange = (option: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [option]: numValue
      }
    }));
  };

  const addInventoryOption = () => {
    if (!newOptionName.trim()) return;
    setFormData(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [newOptionName.trim()]: 0
      }
    }));
    setNewOptionName('');
  };

  const removeInventoryOption = (option: string) => {
    setFormData(prev => {
      const newInventory = { ...prev.inventory };
      delete newInventory[option];
      return { ...prev, inventory: newInventory };
    });
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      image_urls: [...prev.image_urls, newImageUrl.trim()]
    }));
    setNewImageUrl('');
  };

  const removeImageUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const handleAddProduct = async () => {
    if (!formData.name.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    setFormLoading(true);
    try {
      const { data, error } = await supabase
        .from('umeki_products')
        .insert({
          name: formData.name,
          eng_name: formData.eng_name || null,
          price: formData.price,
          image_urls: formData.image_urls,
          inventory: Object.keys(formData.inventory).length > 0 ? formData.inventory : { default: 0 },
          display_order: formData.display_order,
          is_active: formData.is_active,
          malltail_item_code: formData.malltail_item_code || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setProducts(prev => [...prev, data as Product]);
      setEditingInventory(prev => ({
        ...prev,
        [data.id]: data.inventory
      }));

      closeModals();
      alert('제품이 추가되었습니다.');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('제품 추가에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !formData.name.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('umeki_products')
        .update({
          name: formData.name,
          eng_name: formData.eng_name || null,
          price: formData.price,
          image_urls: formData.image_urls,
          inventory: Object.keys(formData.inventory).length > 0 ? formData.inventory : { default: 0 },
          display_order: formData.display_order,
          is_active: formData.is_active,
          malltail_item_code: formData.malltail_item_code || null,
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: formData.name,
              eng_name: formData.eng_name,
              price: formData.price,
              image_urls: formData.image_urls,
              inventory: formData.inventory,
              display_order: formData.display_order,
              is_active: formData.is_active,
              malltail_item_code: formData.malltail_item_code,
            }
          : p
      ));
      setEditingInventory(prev => ({
        ...prev,
        [editingProduct.id]: formData.inventory
      }));

      closeModals();
      alert('제품이 수정되었습니다.');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('제품 수정에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`"${productName}" 제품을 삭제하시겠습니까?\n\n주의: 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setSavingProduct(prev => ({ ...prev, [productId]: true }));

      const { error } = await supabase
        .from('umeki_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // Remove from local state
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('제품이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('제품 삭제에 실패했습니다. 연관된 주문이 있을 수 있습니다.');
    } finally {
      setSavingProduct(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">제품 관리</h1>
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">제품 관리</h1>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 제품 추가
          </button>
        </div>

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
                <div
                  key={product.id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow border ${
                    product.is_active ? 'border-gray-300' : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="p-4">
                    {/* Product Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-3 flex-1">
                        {product.image_urls && product.image_urls.length > 0 && (
                          <div className="relative w-16 h-16 shrink-0">
                            <Image
                              src={product.image_urls[0]}
                              alt={product.name}
                              fill
                              className="object-cover rounded border border-gray-200"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{product.name}</h3>
                            {!product.is_active && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded">
                                비활성
                              </span>
                            )}
                          </div>
                          {product.eng_name && (
                            <p className="text-xs text-gray-500">{product.eng_name}</p>
                          )}
                          <p className="text-xs text-gray-600 mt-0.5">
                            가격: {product.price.toLocaleString('ko-KR')}원 | 순서: {product.display_order}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Active Toggle */}
                        <button
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          disabled={savingProduct[product.id]}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            product.is_active ? 'bg-green-500' : 'bg-gray-300'
                          } disabled:opacity-50`}
                          title={product.is_active ? '판매중 (클릭하여 비활성화)' : '비활성 (클릭하여 활성화)'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              product.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(product)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                        >
                          편집
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          disabled={savingProduct[product.id]}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          삭제
                        </button>

                        {isEdited && (
                          <button
                            onClick={() => handleSaveInventory(product.id)}
                            disabled={savingProduct[product.id]}
                            className="px-4 py-1.5 bg-orange-600 text-white text-sm font-semibold rounded hover:bg-orange-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {savingProduct[product.id] ? '저장중...' : '재고 저장'}
                          </button>
                        )}
                      </div>
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

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {isAddModalOpen ? '새 제품 추가' : '제품 편집'}
              </h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="제품명을 입력하세요"
                />
              </div>

              {/* English Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  영문명
                </label>
                <input
                  type="text"
                  value={formData.eng_name}
                  onChange={(e) => handleFormChange('eng_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="English name"
                />
              </div>

              {/* Price and Display Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가격 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleFormChange('price', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    표시 순서
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => handleFormChange('display_order', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Malltail Item Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Malltail 상품 코드
                </label>
                <input
                  type="text"
                  value={formData.malltail_item_code}
                  onChange={(e) => handleFormChange('malltail_item_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Malltail item code"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  판매 상태
                </label>
                <button
                  type="button"
                  onClick={() => handleFormChange('is_active', !formData.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${formData.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.is_active ? '판매중' : '비활성'}
                </span>
              </div>

              {/* Image URLs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL
                </label>
                <div className="space-y-2">
                  {formData.image_urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative w-12 h-12 shrink-0 bg-gray-100 rounded overflow-hidden">
                        <Image
                          src={url}
                          alt={`Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <input
                        type="text"
                        value={url}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="이미지 URL을 입력하세요"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                    />
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>

              {/* Inventory Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  재고 옵션
                </label>
                <div className="space-y-2">
                  {Object.entries(formData.inventory).map(([option, quantity]) => (
                    <div key={option} className="flex items-center gap-2">
                      <span className="min-w-20 text-sm font-medium text-gray-700">
                        {option === 'default' ? '기본' : option}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => handleInventoryFormChange(option, e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {option !== 'default' && (
                        <button
                          type="button"
                          onClick={() => removeInventoryOption(option)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <input
                      type="text"
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="새 옵션명 (예: S, M, L)"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInventoryOption())}
                    />
                    <button
                      type="button"
                      onClick={addInventoryOption}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      옵션 추가
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={isAddModalOpen ? handleAddProduct : handleUpdateProduct}
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? '저장중...' : (isAddModalOpen ? '추가' : '저장')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
