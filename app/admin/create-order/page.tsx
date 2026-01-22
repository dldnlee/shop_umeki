'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Inventory } from '@/models';
import { createOrder } from '@/lib/orders';
import { CartItem, DeliveryMethod } from '@/lib/cart';
import { generateUUID } from '@/lib/utils';
import { AddressSearch } from '@/components/AddressSearch';

const JUSO_API_KEY = process.env.NEXT_PUBLIC_JUSO_API_KEY || '';

const COUNTRIES = [
  { code: 'JP', name: 'Japan' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GR', name: 'Greece' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AN', name: 'Netherlands Antilles' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NO', name: 'Norway' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NE', name: 'Niger' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'RU', name: 'Russia' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'RO', name: 'Romania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MK', name: 'Macedonia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MV', name: 'Maldives' },
  { code: 'MT', name: 'Malta' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'US', name: 'United States' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BJ', name: 'Benin' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'SN', name: 'Senegal' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'ES', name: 'Spain' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SY', name: 'Syria' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'IS', name: 'Iceland' },
  { code: 'HT', name: 'Haiti' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AO', name: 'Angola' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'YE', name: 'Yemen' },
  { code: 'OM', name: 'Oman' },
  { code: 'AT', name: 'Austria' },
  { code: 'JO', name: 'Jordan' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IL', name: 'Israel' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IT', name: 'Italy' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'CN', name: 'China' },
  { code: 'MO', name: 'Macau' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'CL', name: 'Chile' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CA', name: 'Canada' },
  { code: 'KE', name: 'Kenya' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: 'Ivory Coast' },
  { code: 'CG', name: 'Congo' },
  { code: 'CU', name: 'Cuba' },
  { code: 'HR', name: 'Croatia' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TG', name: 'Togo' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'PA', name: 'Panama' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PE', name: 'Peru' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'FR', name: 'France' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'PH', name: 'Philippines' },
  { code: 'HU', name: 'Hungary' },
  { code: 'AU', name: 'Australia' },
  { code: 'HK', name: 'Hong Kong' },
];

type OrderItem = {
  product: Product;
  option?: string;
  quantity: number;
};

export default function CreateOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Customer information
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('국내배송');

  // Address fields
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const handleAddressSelect = (selectedAddress: string, selectedZipCode: string) => {
    setAddress(selectedAddress);
    setPostalCode(selectedZipCode);
  };

  // Product selection modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('umeki_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('제품 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableInventory = (product: Product, option?: string): number => {
    if (typeof product.inventory === 'number') {
      return product.inventory;
    }
    if (option && product.inventory && typeof product.inventory === 'object') {
      return (product.inventory as Inventory)[option] || 0;
    }
    return 0;
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setSelectedOption(product.options?.[0] || '');
    setSelectedQuantity(1);
    setShowProductModal(true);
  };

  const addItemToOrder = () => {
    if (!selectedProduct) return;

    const existingIndex = orderItems.findIndex(
      item => item.product.id === selectedProduct.id && item.option === (selectedOption || undefined)
    );

    if (existingIndex > -1) {
      const newItems = [...orderItems];
      newItems[existingIndex].quantity += selectedQuantity;
      setOrderItems(newItems);
    } else {
      setOrderItems([
        ...orderItems,
        {
          product: selectedProduct,
          option: selectedOption || undefined,
          quantity: selectedQuantity,
        },
      ]);
    }

    setShowProductModal(false);
    setSelectedProduct(null);
    setSelectedOption('');
    setSelectedQuantity(1);
  };

  const removeItemFromOrder = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(index);
      return;
    }
    const newItems = [...orderItems];
    newItems[index].quantity = quantity;
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      alert('주문할 제품을 추가해주세요.');
      return;
    }

    if (!customerName || !customerEmail) {
      alert('고객 이름과 이메일은 필수입니다.');
      return;
    }

    setSubmitting(true);

    try {
      const orderId = generateUUID();
      const cartItems: CartItem[] = orderItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        option: item.option,
        quantity: item.quantity,
        deliveryMethod,
      }));

      // For domestic delivery, combine address fields into legacy address field
      const fullAddress = deliveryMethod === '국내배송' && address
        ? `[${postalCode}] ${address} ${addressDetail}`.trim()
        : deliveryMethod === '해외배송'
        ? `[${postalCode}] ${state} ${city} ${addressLine1} ${addressLine2}`.trim()
        : null;

      const result = await createOrder(
        {
          id: orderId,
          name: customerName,
          email: customerEmail,
          phone_num: customerPhone || null,
          delivery_method: deliveryMethod,
          payment_method: 'admin_created',
          total_amount: calculateTotal(),
          address: fullAddress,
          postal_code: postalCode || null,
          address_line_1: deliveryMethod === '국내배송' ? address : addressLine1 || null,
          address_line_2: deliveryMethod === '국내배송' ? addressDetail : addressLine2 || null,
          country_code: deliveryMethod === '해외배송' ? countryCode : null,
          city: city || null,
          state: state || null,
        },
        cartItems
      );

      if (result.success) {
        setSuccess(true);
        setCreatedOrderId(orderId);
        // Reset form
        setOrderItems([]);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setAddress('');
        setAddressDetail('');
        setPostalCode('');
        setAddressLine1('');
        setAddressLine2('');
        setCountryCode('');
        setCity('');
        setState('');
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('주문 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setCreatedOrderId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-green-800 mb-2">주문이 생성되었습니다!</h2>
          <p className="text-green-700 mb-4">
            주문 ID: <span className="font-mono font-bold">{createdOrderId}</span>
          </p>
          <button
            onClick={resetForm}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            새 주문 생성
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">주문생성</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Product Selection & Order Items */}
        <div className="space-y-6">
          {/* Product Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">제품 선택</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => openProductModal(product)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  {product.image_urls?.[0] && (
                    <img
                      src={product.image_urls[0]}
                      alt={product.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                  )}
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">₩{product.price.toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              주문 항목 ({orderItems.length}개)
            </h2>
            {orderItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">제품을 선택해주세요</p>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div
                    key={`${item.product.id}-${item.option}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      {item.option && (
                        <p className="text-sm text-gray-500">옵션: {item.option}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        ₩{item.product.price.toLocaleString()} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItemFromOrder(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-lg font-bold">
                    <span>총 금액:</span>
                    <span>₩{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer Information & Submit */}
        <div>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">고객 정보</h2>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Delivery Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배송 방법
              </label>
              <div className="flex flex-wrap gap-2">
                {(['국내배송', '해외배송', '팬미팅현장수령'] as DeliveryMethod[]).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setDeliveryMethod(method)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      deliveryMethod === method
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Address (only for delivery methods that need it) */}
            {deliveryMethod !== '팬미팅현장수령' && (
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900">배송 주소</h3>

                {deliveryMethod === '국내배송' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주소 검색
                      </label>
                      <AddressSearch
                        onSelectAddress={handleAddressSelect}
                        apiKey={JUSO_API_KEY}
                      />
                    </div>
                    {postalCode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          우편번호
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </div>
                    )}
                    {address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          도로명 주소
                        </label>
                        <input
                          type="text"
                          value={address}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        상세 주소
                      </label>
                      <input
                        type="text"
                        value={addressDetail}
                        onChange={e => setAddressDetail(e.target.value)}
                        placeholder="상세 주소를 입력하세요 (예: 101동 101호)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 (Country)
                      </label>
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Country</option>
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        우편번호
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시/도
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={e => setState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주소 1
                      </label>
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={e => setAddressLine1(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주소 2
                      </label>
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={e => setAddressLine2(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || orderItems.length === 0}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                submitting || orderItems.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  생성 중...
                </span>
              ) : (
                `주문 생성 (₩${calculateTotal().toLocaleString()})`
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedProduct.name}</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedProduct.image_urls?.[0] && (
              <img
                src={selectedProduct.image_urls[0]}
                alt={selectedProduct.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <p className="text-xl font-bold text-gray-900 mb-4">
              ₩{selectedProduct.price.toLocaleString()}
            </p>

            {/* Option Selection */}
            {selectedProduct.options && selectedProduct.options.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  옵션 선택
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.options.map(option => {
                    const available = getAvailableInventory(selectedProduct, option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        disabled={available === 0}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          selectedOption === option
                            ? 'bg-blue-500 text-white border-blue-500'
                            : available === 0
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {option} {available === 0 && '(품절)'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 text-xl"
                >
                  -
                </button>
                <span className="w-12 text-center text-xl font-semibold">{selectedQuantity}</span>
                <button
                  type="button"
                  onClick={() => setSelectedQuantity(selectedQuantity + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 text-xl"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={addItemToOrder}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              추가 (₩{(selectedProduct.price * selectedQuantity).toLocaleString()})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
