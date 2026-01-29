'use client';

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

interface PopupImage {
  id: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface PopupFormData {
  image_url: string;
  title: string;
  link_url: string;
  display_order: number;
  is_active: boolean;
}

const defaultFormData: PopupFormData = {
  image_url: '',
  title: '',
  link_url: '',
  display_order: 0,
  is_active: true,
};

export default function AdminPopupPage() {
  const [loading, setLoading] = useState(false);
  const [popupImages, setPopupImages] = useState<PopupImage[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupImage | null>(null);
  const [formData, setFormData] = useState<PopupFormData>(defaultFormData);
  const [formLoading, setFormLoading] = useState(false);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPopupImages();
  }, []);

  const fetchPopupImages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/popup', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch popup images');
      }

      const data = await response.json();
      setPopupImages(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setSavingId(id);

      const popup = popupImages.find(p => p.id === id);
      if (!popup) return;

      const response = await fetch('/api/admin/popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          image_url: popup.image_url,
          title: popup.title,
          link_url: popup.link_url,
          display_order: popup.display_order,
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setPopupImages(prev => prev.map(p =>
        p.id === id ? { ...p, is_active: !currentStatus } : p
      ));
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const openAddModal = () => {
    setFormData({
      ...defaultFormData,
      display_order: popupImages.length,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (popup: PopupImage) => {
    setEditingPopup(popup);
    setFormData({
      image_url: popup.image_url,
      title: popup.title || '',
      link_url: popup.link_url || '',
      display_order: popup.display_order,
      is_active: popup.is_active,
    });
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingPopup(null);
    setFormData(defaultFormData);
  };

  const handleFormChange = (field: keyof PopupFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    try {
      // Upload via API route (server-side handles Supabase storage)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/popup/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update form data with the new URL
      setFormData(prev => ({ ...prev, image_url: result.url }));
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleAddPopup = async () => {
    if (!formData.image_url.trim()) {
      alert('이미지 URL을 입력해주세요.');
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch('/api/admin/popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image_url: formData.image_url,
          title: formData.title || null,
          link_url: formData.link_url || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) throw new Error('Failed to add popup');

      const data = await response.json();
      setPopupImages(prev => [...prev, data as PopupImage]);
      closeModals();
      alert('팝업 이미지가 추가되었습니다.');
    } catch (error) {
      console.error('Error adding popup:', error);
      alert('팝업 이미지 추가에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdatePopup = async () => {
    if (!editingPopup || !formData.image_url.trim()) {
      alert('이미지 URL을 입력해주세요.');
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch('/api/admin/popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingPopup.id,
          image_url: formData.image_url,
          title: formData.title || null,
          link_url: formData.link_url || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) throw new Error('Failed to update popup');

      setPopupImages(prev => prev.map(p =>
        p.id === editingPopup.id
          ? {
              ...p,
              image_url: formData.image_url,
              title: formData.title || null,
              link_url: formData.link_url || null,
              display_order: formData.display_order,
              is_active: formData.is_active,
            }
          : p
      ));

      closeModals();
      alert('팝업 이미지가 수정되었습니다.');
    } catch (error) {
      console.error('Error updating popup:', error);
      alert('팝업 이미지 수정에 실패했습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePopup = async (id: string) => {
    if (!confirm('이 팝업 이미지를 삭제하시겠습니까?\n\n주의: 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      setSavingId(id);

      const response = await fetch(`/api/admin/popup?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setPopupImages(prev => prev.filter(p => p.id !== id));
      alert('팝업 이미지가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting popup:', error);
      alert('팝업 이미지 삭제에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleMoveOrder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = popupImages.findIndex(p => p.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= popupImages.length) return;

    const newImages = [...popupImages];
    const temp = newImages[currentIndex];
    newImages[currentIndex] = newImages[newIndex];
    newImages[newIndex] = temp;

    try {
      setSavingId(id);

      // Update both items in parallel via API
      await Promise.all(
        newImages.map((img, idx) =>
          fetch('/api/admin/popup', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: img.id,
              image_url: img.image_url,
              title: img.title,
              link_url: img.link_url,
              display_order: idx,
              is_active: img.is_active,
            }),
          })
        )
      );

      setPopupImages(newImages.map((img, idx) => ({ ...img, display_order: idx })));
    } catch (error) {
      console.error('Error updating order:', error);
      alert('순서 변경에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">팝업 이미지 관리</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">팝업 이미지를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">팝업 이미지 관리</h1>
            <p className="text-sm text-gray-600 mt-1">홈페이지 캐러셀 팝업에 표시되는 이미지를 관리합니다.</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            이미지 추가
          </button>
        </div>

        {popupImages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-sm">등록된 팝업 이미지가 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">위의 &quot;이미지 추가&quot; 버튼을 클릭하여 추가하세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {popupImages.map((popup, index) => (
              <div
                key={popup.id}
                className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow border ${
                  popup.is_active ? 'border-gray-300' : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Image preview */}
                    <div className="relative w-24 h-24 shrink-0 bg-gray-100 rounded overflow-hidden">
                      <Image
                        src={popup.image_url}
                        alt={popup.title || 'Popup image'}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                        {popup.title && (
                          <h3 className="text-base font-bold text-gray-900 truncate">{popup.title}</h3>
                        )}
                        {!popup.is_active && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded">
                            비활성
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{popup.image_url}</p>
                      {popup.link_url && (
                        <p className="text-xs text-blue-600 mt-1 truncate">
                          링크: {popup.link_url}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Move order buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveOrder(popup.id, 'up')}
                          disabled={index === 0 || savingId === popup.id}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="위로 이동"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveOrder(popup.id, 'down')}
                          disabled={index === popupImages.length - 1 || savingId === popup.id}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="아래로 이동"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleActive(popup.id, popup.is_active)}
                        disabled={savingId === popup.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          popup.is_active ? 'bg-green-500' : 'bg-gray-300'
                        } disabled:opacity-50`}
                        title={popup.is_active ? '활성 (클릭하여 비활성화)' : '비활성 (클릭하여 활성화)'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            popup.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(popup)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                      >
                        편집
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeletePopup(popup.id)}
                        disabled={savingId === popup.id}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {isAddModalOpen ? '팝업 이미지 추가' : '팝업 이미지 편집'}
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
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 <span className="text-red-500">*</span>
                </label>

                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-sm text-gray-600">업로드 중...</p>
                    </div>
                  ) : formData.image_url ? (
                    <div className="relative w-full aspect-square max-w-xs mx-auto bg-gray-100 rounded overflow-hidden">
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        fill
                        className="object-contain"
                        onError={() => {}}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-sm font-medium">클릭하여 변경</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-600 mb-1">클릭하거나 이미지를 드래그하세요</p>
                      <p className="text-xs text-gray-400">JPEG, PNG, GIF, WebP (최대 5MB)</p>
                    </div>
                  )}
                </div>

                {/* URL input fallback */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-xs text-gray-400">또는 URL 직접 입력</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => handleFormChange('image_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 (선택)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="팝업 제목 (이미지 하단에 표시됨)"
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 URL (선택)
                </label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => handleFormChange('link_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com (클릭시 이동할 URL)"
                />
              </div>

              {/* Display Order */}
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
                <p className="text-xs text-gray-500 mt-1">숫자가 작을수록 먼저 표시됩니다.</p>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  활성 상태
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
                  {formData.is_active ? '활성' : '비활성'}
                </span>
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
                onClick={isAddModalOpen ? handleAddPopup : handleUpdatePopup}
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
