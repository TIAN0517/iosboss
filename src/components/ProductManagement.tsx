'use client'

import { useState, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSInput } from '@/components/ui/ios-input'
import { IOSModal } from '@/components/ui/ios-modal'
import { IOSSelect } from '@/components/ui/ios-select'
import { triggerHaptic } from '@/lib/ios-utils'
import { Plus, Edit, Trash2, Image, Star, Eye, EyeOff } from 'lucide-react'

interface Category {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

interface Product {
  id: string
  name: string
  code: string | null
  price: number
  cost: number
  capacity: string | null
  unit: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  isFeatured: boolean
  rating: number
  sales: number
  sortOrder: number
  categoryId: string
  category: Category
  inventory: {
    quantity: number
    minStock: number
  } | null
}

interface ProductManagementProps {
  onClose?: () => void
}

export function ProductManagement({ onClose }: ProductManagementProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [search, setSearch] = useState('')

  // 表單狀態
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    cost: '',
    capacity: '',
    unit: '個',
    description: '',
    imageUrl: '',
    isFeatured: false,
    sortOrder: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/shop/categories'),
      ])
      if (productsRes.ok) {
        setProducts(await productsRes.json())
      }
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    triggerHaptic('light')

    if (!form.name || !form.categoryId || !form.price) {
      alert('請填寫必填欄位')
      return
    }

    try {
      const url = editingProduct
        ? '/api/shop/products'
        : '/api/shop/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct ? { id: editingProduct.id, ...form } : form),
      })

      if (res.ok) {
        fetchData()
        closeModal()
      } else {
        alert('操作失敗')
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      alert('操作失敗')
    }
  }

  const handleDelete = async (product: Product) => {
    triggerHaptic('medium')
    if (!confirm(`確定要刪除「${product.name}」嗎？`)) return

    try {
      const res = await fetch(`/api/shop/products?id=${product.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchData()
      } else {
        alert('刪除失敗')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('刪除失敗')
    }
  }

  const openModal = (product?: Product) => {
    triggerHaptic('light')
    if (product) {
      setEditingProduct(product)
      setForm({
        name: product.name,
        categoryId: product.categoryId,
        price: product.price.toString(),
        cost: product.cost.toString(),
        capacity: product.capacity || '',
        unit: product.unit,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        isFeatured: product.isFeatured,
        sortOrder: product.sortOrder,
      })
    } else {
      setEditingProduct(null)
      setForm({
        name: '',
        categoryId: categories[0]?.id || '',
        price: '',
        cost: '',
        capacity: '',
        unit: '個',
        description: '',
        imageUrl: '',
        isFeatured: false,
        sortOrder: 0,
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="p-4 text-center text-gray-500">載入中...</div>
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">產品管理</h1>
          <p className="text-gray-500">管理商城商品</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => openModal()}>
            <Plus size={20} className="mr-1" />
            新增產品
          </IOSButton>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <IOSInput
          placeholder="搜尋產品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <IOSCard>
          <IOSCardContent className="p-4">
            <div className="text-2xl font-bold">{products.length}</div>
            <div className="text-gray-500 text-sm">總產品數</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {products.filter(p => p.isActive).length}
            </div>
            <div className="text-gray-500 text-sm">上架中</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="p-4">
            <div className="text-2xl font-bold text-orange-500">
              {products.filter(p => p.isFeatured).length}
            </div>
            <div className="text-gray-500 text-sm">精選商品</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">
              {products.filter(p => (p.inventory?.quantity || 0) <= 0).length}
            </div>
            <div className="text-gray-500 text-sm">庫存不足</div>
          </IOSCardContent>
        </IOSCard>
      </div>

      {/* Products Table */}
      <IOSCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-600">產品</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">分類</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">價格</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">庫存</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">狀態</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <Image size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{product.category?.name || '-'}</td>
                  <td className="p-3">
                    <div className="font-medium">${product.price}</div>
                    {product.cost > 0 && (
                      <div className="text-xs text-gray-500">成本: ${product.cost}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={product.inventory?.quantity ? '' : 'text-red-500'}>
                      {product.inventory?.quantity || 0}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {product.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          上架
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          下架
                        </span>
                      )}
                      {product.isFeatured && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                          <Star size={12} /> 精選
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <IOSButton
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(product)}
                      >
                        <Edit size={16} />
                      </IOSButton>
                      <IOSButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        className="text-red-500"
                      >
                        <Trash2 size={16} />
                      </IOSButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IOSCard>

      {/* Modal */}
      <IOSModal
        open={showModal}
        onClose={closeModal}
        title={editingProduct ? '編輯產品' : '新增產品'}
        size="lg"
      >
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 產品名稱 */}
          <div>
            <label className="block text-sm font-medium mb-1">產品名稱 *</label>
            <IOSInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="輸入產品名稱"
            />
          </div>

          {/* 分類 */}
          <div>
            <label className="block text-sm font-medium mb-1">分類 *</label>
            <IOSSelect
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">選擇分類</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </IOSSelect>
          </div>

          {/* 價格 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">售價 *</label>
              <IOSInput
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">成本</label>
              <IOSInput
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* 容量和單位 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">容量規格</label>
              <IOSInput
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="例如: 20公斤"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">單位</label>
              <IOSSelect
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="個">個</option>
                <option value="公斤">公斤</option>
                <option value="桶">桶</option>
                <option value="組">組</option>
              </IOSSelect>
            </div>
          </div>

          {/* 圖片網址 */}
          <div>
            <label className="block text-sm font-medium mb-1">產品圖片</label>
            <IOSInput
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            {form.imageUrl && (
              <div className="mt-2">
                <img
                  src={form.imageUrl}
                  alt="預覽"
                  className="w-24 h-24 object-cover rounded border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1">產品描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 border rounded-lg"
              rows={3}
              placeholder="輸入產品描述..."
            />
          </div>

          {/* 精選開關 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isFeatured" className="flex items-center gap-1">
              <Star size={16} className="text-orange-500" />
              設為精選商品（首頁優先顯示）
            </label>
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-medium mb-1">排序</label>
            <IOSInput
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <IOSButton variant="secondary" onClick={closeModal}>
            取消
          </IOSButton>
          <IOSButton onClick={handleSubmit}>
            {editingProduct ? '儲存' : '新增'}
          </IOSButton>
        </div>
      </IOSModal>
    </div>
  )
}
