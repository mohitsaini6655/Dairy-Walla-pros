import { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Package, Eye, EyeOff, Search, SlidersHorizontal, Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { MobileHeader } from '../../components/layout/MobileHeader';
import {
  dairyCategoryOptions,
  getAllowedBusinessLines,
  getCategoryEmoji,
  getProductQuantityText,
  iceCreamCategoryOptions,
  inferBusinessLineFromCategory,
  toDistributorType,
} from '../../utils/businessLine';
import type { BusinessLine, KnownProductCategory, Product, ProductCategory } from '../../types';
import { apiClient } from '../../lib/apiClient';

function getProductVisual(category?: string) {
  const text = String(category || '').toLowerCase();
  if (text.includes('cone')) return { emoji: '🍦', bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d' };
  if (text.includes('ice cream') || text.includes('icecream') || text.includes('kulfi') || text.includes('cup') || text.includes('family pack')) {
    return { emoji: '🍨', bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca' };
  }
  if (text.includes('bar')) return { emoji: '🍫', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' };
  if (text.includes('milk')) return { emoji: '🥛', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' };
  if (text.includes('paneer') || text.includes('cheese')) return { emoji: '🧀', bg: '#fffbeb', border: '#fde68a', text: '#92400e' };
  if (text.includes('curd') || text.includes('dahi') || text.includes('yogurt') || text.includes('yoghurt')) return { emoji: '🥣', bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' };
  if (text.includes('butter') || text.includes('ghee')) return { emoji: '🧈', bg: '#fefce8', border: '#fef08a', text: '#854d0e' };
  if (text.includes('lassi') || text.includes('chaas') || text.includes('cream')) return { emoji: '🥤', bg: '#ecfdf5', border: '#bbf7d0', text: '#047857' };
  return { emoji: '📦', bg: '#f9fafb', border: '#e5e7eb', text: '#4b5563' };
}

const categoryOrder: KnownProductCategory[] = ['milk', 'paneer', 'curd', 'butter', 'ghee', 'other'];

const popularBrands = ['Amul', 'Mother Dairy', 'Saras', 'Parag', 'Ananda', 'Sudha', 'Nandini', 'Nestle'];
const manualCategoryValue = '__manual_category__';
const manualBrandValue = '__manual_brand__';

interface ProductFormData {
  name: string;
  brand: string;
  category: ProductCategory;
  businessLine: BusinessLine;
  quantity: string;
  price: string;
  available: boolean;
  imageUrl?: string;
  stockQuantity?: string;
  showStock?: boolean;
}

const defaultForm: ProductFormData = {
  name: '',
  brand: popularBrands[0],
  category: 'milk',
  businessLine: 'dairy',
  quantity: '',
  price: '',
  available: true,
  imageUrl: '',
  stockQuantity: '',
  showStock: false,
};

const normalizeCategory = (value: string): ProductCategory =>
  (value.trim().toLowerCase().replace(/\s+/g, ' ') || 'other') as ProductCategory;
const normalizeBrand = (value: string) => value.trim().toLowerCase();

const formatCategoryLabel = (category: string): string =>
  category.replace(/\b\w/g, char => char.toUpperCase());

const compareCategories = (a: string, b: string): number => {
  const indexA = categoryOrder.indexOf(a as KnownProductCategory);
  const indexB = categoryOrder.indexOf(b as KnownProductCategory);
  const isKnownA = indexA >= 0;
  const isKnownB = indexB >= 0;
  if (isKnownA && isKnownB) return indexA - indexB;
  if (isKnownA) return -1;
  if (isKnownB) return 1;
  return a.localeCompare(b);
};

export function CatalogPage() {
  const { user } = useAuthStore();
  const { products, distributorProfiles, addProduct, updateProduct, deleteProduct } = useAppStore();
  const { show } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filterCat, setFilterCat] = useState<ProductCategory | 'all'>('all');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>('milk');
  const [manualCategory, setManualCategory] = useState('');
  const [selectedBrandOption, setSelectedBrandOption] = useState<string>(popularBrands[0]);
  const [manualBrand, setManualBrand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'hidden' | 'outofstock'>('all');
  const [filterLine, setFilterLine] = useState<'all' | BusinessLine>('all');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsSearch, setSuggestionsSearch] = useState('');
  const [suggestionsLineFilter, setSuggestionsLineFilter] = useState<'all' | BusinessLine>('all');
  const [suggestionsCategoryFilter, setSuggestionsCategoryFilter] = useState<string>('all');

  const profile = distributorProfiles.find(dp => dp.userId === user?.id);
  const distributorType = toDistributorType(profile?.distributorType);
  const allowedBusinessLines = getAllowedBusinessLines(distributorType);
  const defaultBusinessLine: BusinessLine = allowedBusinessLines[0] || 'dairy';
  const myProducts = useMemo(
    () =>
      products
        .filter(product => product.distributorId === profile?.id)
        .map(product => ({
          ...product,
          businessLine: inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine),
        }))
        .filter(product => allowedBusinessLines.includes(product.businessLine as BusinessLine)),
    [products, profile?.id, allowedBusinessLines]
  );

  const filterCategories = useMemo(
    () => {
      const lineFilteredProducts = myProducts.filter(p => filterLine === 'all' || p.businessLine === filterLine);
      return Array.from(new Set(lineFilteredProducts.map(product => normalizeCategory(String(product.category)))))
        .sort(compareCategories);
    },
    [myProducts, filterLine]
  );

  const filterBrands = useMemo(
    () =>
      Array.from(
        new Set(
          myProducts
            .map(product => product.brand?.trim())
            .filter((brand): brand is string => Boolean(brand))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [myProducts]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return myProducts.filter(product => {
      const category = normalizeCategory(String(product.category));
      const productLine = inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
      const matchCategory = filterCat === 'all' || category === filterCat;
      const matchLine = filterLine === 'all' || filterLine === productLine;
      const matchBrand = filterBrand === 'all' || product.brand.trim().toLowerCase() === filterBrand.toLowerCase();
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'available' && product.available) ||
        (filterStatus === 'hidden' && !product.available) ||
        (filterStatus === 'outofstock' && product.showStock && (product.stockQuantity || 0) <= 0);
      const matchSearch =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        category.toLowerCase().includes(normalizedQuery) ||
        getProductQuantityText(product.quantity, product.unit).toLowerCase().includes(normalizedQuery);
      return matchCategory && matchLine && matchBrand && matchStatus && matchSearch;
    });
  }, [myProducts, searchQuery, filterCat, filterLine, filterBrand, filterStatus]);

  const preferredBrand = useMemo(() => {
    const companyBrand = String(profile?.company ?? '').trim();
    if (companyBrand) return companyBrand;
    const firstBrand = myProducts.find(product => product.brand?.trim())?.brand?.trim();
    return firstBrand || '';
  }, [profile?.company, myProducts]);

  const groupedProducts = useMemo(() => {
    if (!preferredBrand) {
      return { main: filteredProducts, more: [] as Product[] };
    }
    const normalizedPreferred = normalizeBrand(preferredBrand);
    const main = filteredProducts.filter(product => normalizeBrand(product.brand || '') === normalizedPreferred);
    const more = filteredProducts.filter(product => normalizeBrand(product.brand || '') !== normalizedPreferred);
    if (main.length === 0) {
      return { main: filteredProducts, more: [] as Product[] };
    }
    return { main, more };
  }, [filteredProducts, preferredBrand]);

  const hasBrandSplit = groupedProducts.more.length > 0;

  const visibleSuggestionsForCategories = useMemo(() => {
    return suggestions.filter(item => {
      if (distributorType !== 'dual') {
        return item.businessLine === defaultBusinessLine;
      }
      return suggestionsLineFilter === 'all' || item.businessLine === suggestionsLineFilter;
    });
  }, [suggestions, distributorType, defaultBusinessLine, suggestionsLineFilter]);

  const suggestionsCategories = useMemo(() => {
    const cats = Array.from(new Set(visibleSuggestionsForCategories.map(item => normalizeCategory(String(item.category || 'other')))));
    return ['all', ...cats].sort(compareCategories);
  }, [visibleSuggestionsForCategories]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    filterCat !== 'all' ||
    filterBrand !== 'all' ||
    filterStatus !== 'all' ||
    filterLine !== 'all';

  const mainSectionTitle = preferredBrand
    ? `${preferredBrand} Main Products`
    : 'Main Products';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCat('all');
    setFilterBrand('all');
    setFilterStatus('all');
    setFilterLine('all');
  };

  const categoryOptionsForForm =
    form.businessLine === 'icecream' ? iceCreamCategoryOptions : dairyCategoryOptions;
  const selectedCategoryForPreview = normalizeCategory(
    selectedCategoryOption === manualCategoryValue ? manualCategory : String(form.category || 'other')
  );

  const resetFormForAdd = () => {
    const normalizedPreferredBrand = normalizeBrand(preferredBrand);
    const matchedDefaultBrand =
      popularBrands.find(brand => normalizeBrand(brand) === normalizedPreferredBrand) ||
      popularBrands[0];
    const useManualBrand = Boolean(preferredBrand) && normalizeBrand(matchedDefaultBrand) !== normalizedPreferredBrand;
    const defaultBrandValue = useManualBrand ? preferredBrand : matchedDefaultBrand;

    setEditingProduct(null);
    setForm({
      ...defaultForm,
      businessLine: defaultBusinessLine,
      category: defaultBusinessLine === 'icecream' ? 'ice cream' : 'milk',
      brand: defaultBrandValue,
      imageUrl: '',
    });
    setImageFile(null);
    setSelectedCategoryOption(defaultBusinessLine === 'icecream' ? 'ice cream' : 'milk');
    setManualCategory('');
    setSelectedBrandOption(useManualBrand ? manualBrandValue : matchedDefaultBrand);
    setManualBrand(useManualBrand ? preferredBrand : '');
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    const normalizedCategory = normalizeCategory(String(product.category));
    const productLine = inferBusinessLineFromCategory(normalizedCategory, product.businessLine);
    const categoryOptions = productLine === 'icecream' ? iceCreamCategoryOptions : dairyCategoryOptions;
    const matchedBrand =
      popularBrands.find(brand => brand.toLowerCase() === product.brand.trim().toLowerCase()) || null;
    const categoryIsKnown = (categoryOptions as readonly string[]).includes(normalizedCategory);
    const quantityText = getProductQuantityText(product.quantity, product.unit);

    setEditingProduct(product);
    setForm({
      name: product.name,
      brand: product.brand,
      category: normalizedCategory,
      businessLine: productLine,
      quantity: quantityText === '-' ? '' : quantityText,
      price: String(product.price),
      available: product.available,
      imageUrl: product.imageUrl || '',
      stockQuantity: product.stockQuantity !== undefined && product.stockQuantity !== null ? String(product.stockQuantity) : '',
      showStock: product.showStock || false,
    });
    setImageFile(null);

    setSelectedCategoryOption(categoryIsKnown ? normalizedCategory : manualCategoryValue);
    setManualCategory(categoryIsKnown ? '' : String(product.category).trim());
    setSelectedBrandOption(matchedBrand || manualBrandValue);
    setManualBrand(matchedBrand ? '' : product.brand.trim());
    setModalOpen(true);
  };

  const handleCategoryOptionChange = (value: string) => {
    setSelectedCategoryOption(value);
    if (value === manualCategoryValue) {
      setForm(current => ({ ...current, category: normalizeCategory(manualCategory) }));
      return;
    }
    setForm(current => ({ ...current, category: normalizeCategory(value) }));
  };


  const handleBrandOptionChange = (value: string) => {
    setSelectedBrandOption(value);
    if (value === manualBrandValue) {
      setForm(current => ({ ...current, brand: manualBrand.trim() }));
      return;
    }
    setForm(current => ({ ...current, brand: value }));
  };

  const handleSave = async () => {
    if (!profile) {
      show('Distributor profile not found', 'error');
      return;
    }

    const resolvedCategorySource =
      selectedCategoryOption === manualCategoryValue ? manualCategory : selectedCategoryOption;
    const resolvedCategory = normalizeCategory(resolvedCategorySource);
    const resolvedBusinessLine = inferBusinessLineFromCategory(resolvedCategory, form.businessLine);
    const resolvedBrand =
      selectedBrandOption === manualBrandValue ? manualBrand.trim() : selectedBrandOption.trim();
    const name = form.name.trim();
    const quantity = form.quantity.trim();
    const price = Number(form.price);

    if (!name || !resolvedBrand || !quantity || !form.price.trim()) {
      show('Please fill all required fields', 'error');
      return;
    }
    if (selectedCategoryOption === manualCategoryValue && !manualCategory.trim()) {
      show('Please enter custom category name', 'error');
      return;
    }
    if (selectedBrandOption === manualBrandValue && !manualBrand.trim()) {
      show('Please enter custom brand name', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      show('Please enter a valid price', 'error');
      return;
    }
    if (!allowedBusinessLines.includes(resolvedBusinessLine)) {
      show('Selected product line is not allowed for your distributor type.', 'error');
      return;
    }

    const payload: Omit<Product, 'id'> = {
      distributorId: profile.id,
      name,
      brand: resolvedBrand,
      category: resolvedCategory,
      businessLine: resolvedBusinessLine,
      unit: quantity,
      quantity,
      price,
      available: form.available,
    };
    if (resolvedBusinessLine === 'icecream') {
      if (form.stockQuantity) payload.stockQuantity = Number(form.stockQuantity);
      if (form.showStock !== undefined) payload.showStock = form.showStock;
    }
    if (form.imageUrl) payload.imageUrl = form.imageUrl;

    if (imageFile) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', 'dairy_products');
        formData.append('cloud_name', 'drmcpl540');

        const uploadRes = await fetch('https://api.cloudinary.com/v1_1/drmcpl540/image/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          payload.imageUrl = uploadData.secure_url;
        }
      } catch (err) {
        console.error('Image upload failed', err);
      } finally {
        setUploadingImage(false);
      }
    }

    const success = editingProduct
      ? await updateProduct(editingProduct.id, payload)
      : await addProduct(payload);

    if (!success) {
      show('Product save failed. Please try again.', 'error');
      return;
    }

    show(editingProduct ? 'Product updated' : 'Product added');
    setModalOpen(false);
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data } = await apiClient.get('/products/suggestions');
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch product suggestions', e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const openSuggestions = () => {
    setSuggestionsOpen(true);
    setSuggestionsSearch('');
    setSuggestionsCategoryFilter('all');
    void fetchSuggestions();
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setEditingProduct(null);
    setImageFile(null);
    setSuggestionsOpen(false);

    const presetBrand = popularBrands.find(brand => normalizeBrand(brand) === normalizeBrand(suggestion.brand || ''));
    const isManualBrand = !presetBrand && Boolean(suggestion.brand);

    const productLine = suggestion.businessLine as BusinessLine;
    const catOptions = productLine === 'icecream' ? iceCreamCategoryOptions : dairyCategoryOptions;
    const isPresetCat = (catOptions as readonly string[]).includes(suggestion.category);

    setForm({
      name: suggestion.name || '',
      brand: suggestion.brand || '',
      category: suggestion.category || '',
      businessLine: productLine,
      quantity: suggestion.unit || '',
      price: String(suggestion.price || ''),
      available: true,
      imageUrl: suggestion.imageUrl || '',
      stockQuantity: suggestion.stockQuantity ? String(suggestion.stockQuantity) : '',
      showStock: suggestion.showStock === true,
    });
    setSelectedCategoryOption(isPresetCat ? suggestion.category : manualCategoryValue);
    setManualCategory(isPresetCat ? '' : suggestion.category || '');
    setSelectedBrandOption(isManualBrand ? manualBrandValue : (suggestion.brand || popularBrands[0]));
    setManualBrand(isManualBrand ? suggestion.brand : '');
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const success = await deleteProduct(id);
    if (!success) {
      show('Delete failed. Please try again.', 'error');
      return;
    }
    show('Product deleted', 'error');
  };

  const toggleAvailability = async (product: Product) => {
    const success = await updateProduct(product.id, { available: !product.available });
    if (!success) {
      show('Availability update failed', 'error');
      return;
    }
    show(product.available ? `${product.name} marked unavailable` : `${product.name} is now available`);
  };

  const renderMobileCards = (items: Product[]) => (
    <div className="space-y-3">
      {items.map(product => (
        <div key={product.id} className={`card p-4 ${!product.available ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{getCategoryEmoji(String(product.category))}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</div>
                  <div className="text-xs text-gray-500">
                    {product.brand} · {getProductQuantityText(product.quantity, product.unit)}
                  </div>
                  <div className="font-bold text-green-600 mt-1">₹{product.price}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => void handleDelete(product.id, product.name)}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge bg-gray-100 text-gray-600 text-xs">
                  {formatCategoryLabel(String(product.category))}
                </span>
                <span className="badge bg-blue-50 text-blue-700 text-xs">
                  {inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine) === 'icecream'
                    ? 'Ice Cream'
                    : 'Dairy'}
                </span>
                <button
                  onClick={() => void toggleAvailability(product)}
                  className={`badge cursor-pointer text-xs ${product.available ? 'badge-green' : 'badge-gray'}`}
                >
                  {product.available ? '● Available' : '○ Hidden'}
                </button>
                {product.showStock && (product.stockQuantity || 0) <= 0 && (
                  <span className="badge bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDesktopTable = (items: Product[]) => (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Brand</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map(product => (
            <tr
              key={product.id}
              className={`hover:bg-gray-50 transition-colors ${!product.available ? 'opacity-50' : ''}`}
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded-md object-cover" />
                  ) : (
                    <span className="text-lg">{getCategoryEmoji(String(product.category))}</span>
                  )}
                  <span className="text-sm font-medium text-gray-900">{product.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{product.brand}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5 items-start">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-gray-100 text-gray-600">
                      {formatCategoryLabel(String(product.category))}
                    </span>
                    <span className="badge bg-blue-50 text-blue-700">
                      {inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine) === 'icecream'
                        ? 'Ice Cream'
                        : 'Dairy'}
                    </span>
                  </div>
                  {product.showStock && (product.stockQuantity || 0) <= 0 && (
                    <span className="badge bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                      Out of Stock
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{getProductQuantityText(product.quantity, product.unit)}</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">₹{product.price}</td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => void toggleAvailability(product)}
                  className={`badge ${product.available ? 'badge-green' : 'badge-gray'} cursor-pointer hover:opacity-80`}
                >
                  {product.available ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                  {product.available ? 'Available' : 'Hidden'}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <button onClick={() => openEdit(product)} className="btn-ghost p-1.5">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDelete(product.id, product.name)}
                    className="btn-ghost p-1.5 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <MobileHeader title="Product Catalog" subtitle={`${myProducts.length} products`} />

      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {myProducts.length} products · {myProducts.filter(product => product.available).length} available
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1.5" onClick={openSuggestions}>
            <Sparkles className="w-4 h-4" /> Suggestions
          </button>
          <button className="btn-primary flex items-center gap-1.5" onClick={resetFormForAdd}>
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="md:hidden flex justify-end gap-2 mb-4">
        <button className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5" onClick={openSuggestions}>
          <Sparkles className="w-3.5 h-3.5" /> Suggestions
        </button>
        <button className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5" onClick={resetFormForAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {/* Rank Widget */}
      <div className="bg-gradient-to-r from-amber-100 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between mb-5 shadow-sm animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="bg-amber-200 p-2.5 rounded-full text-amber-700 shadow-inner">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Global Rank</h3>
            <p className="text-2xl font-extrabold text-gray-900">#4</p>
          </div>
        </div>
        <div className="text-right">
          <button className="text-xs font-semibold bg-white/50 border border-amber-200 text-amber-700/70 px-3 py-1.5 rounded-md cursor-not-allowed" disabled>
            Leaderboard coming soon 🚀
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            filterCat === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        {filterCategories.map(category => (
          <button
            key={category}
            onClick={() => setFilterCat(category)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterCat === category
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {getCategoryEmoji(category)} {formatCategoryLabel(category)}
          </button>
        ))}
      </div>

      <div className="card p-3 md:p-4 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by product, brand, quantity, category..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
          {distributorType === 'dual' ? (
            <select
              className="input"
              value={filterLine}
              onChange={event => {
                setFilterLine(event.target.value as 'all' | BusinessLine);
                setFilterCat('all');
              }}
            >
              <option value="all">All Sections</option>
              <option value="dairy">Dairy Products</option>
              <option value="icecream">Ice Cream</option>
            </select>
          ) : (
            <div className="input bg-gray-50 text-gray-500 flex items-center">
              Section: {defaultBusinessLine === 'icecream' ? 'Ice Cream' : 'Dairy Products'}
            </div>
          )}

          <select className="input" value={filterBrand} onChange={event => setFilterBrand(event.target.value)}>
            <option value="all">All Brands</option>
            {filterBrands.map(brand => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={filterStatus}
            onChange={event => setFilterStatus(event.target.value as 'all' | 'available' | 'hidden' | 'outofstock')}
          >
            <option value="all">All Status</option>
            <option value="available">Available Only</option>
            <option value="hidden">Hidden Only</option>
            <option value="outofstock">Out of Stock</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Reset Filters
          </button>
        </div>
        {preferredBrand && (
          <div className="mt-2 text-xs text-gray-500">
            Main Products are based on your primary brand: <span className="font-semibold text-gray-700">{preferredBrand}</span>.
            Other brands appear in <span className="font-semibold text-gray-700">More Products</span>.
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title={hasActiveFilters ? 'No products match your filters' : 'No products yet'}
          description={hasActiveFilters ? 'Try changing filters or search query.' : 'Add your first product to get started'}
          action={
            <div className="flex gap-3 justify-center">
              {!hasActiveFilters && (
                <button className="btn-secondary flex items-center gap-1.5" onClick={openSuggestions}>
                  <Sparkles className="w-4 h-4" /> Suggestions
                </button>
              )}
              <button className="btn-primary flex items-center gap-1.5" onClick={resetFormForAdd}>
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
          }
        />
      ) : (
        <>
          <div className="md:hidden space-y-4">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800">{mainSectionTitle}</h3>
                <span className="text-xs text-gray-500">{groupedProducts.main.length} items</span>
              </div>
              {renderMobileCards(groupedProducts.main)}
            </section>

            {hasBrandSplit && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">More Products</h3>
                  <span className="text-xs text-gray-500">{groupedProducts.more.length} items</span>
                </div>
                {renderMobileCards(groupedProducts.more)}
              </section>
            )}
          </div>

          <div className="hidden md:block space-y-5">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800">{mainSectionTitle}</h3>
                <span className="text-xs text-gray-500">{groupedProducts.main.length} items</span>
              </div>
              {renderDesktopTable(groupedProducts.main)}
            </section>

            {hasBrandSplit && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">More Products</h3>
                  <span className="text-xs text-gray-500">{groupedProducts.more.length} items</span>
                </div>
                {renderDesktopTable(groupedProducts.more)}
              </section>
            )}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}>
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
              ) : form.imageUrl ? (
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-gray-400">{getCategoryEmoji(String(selectedCategoryForPreview))}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Product Image</label>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {(imageFile || form.imageUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setForm(f => ({ ...f, imageUrl: '' }));
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Remove Image"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name</label>
              <input
                className="input"
                placeholder="e.g. Full Cream Milk"
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div>
              <label className="label">Brand</label>
              <select
                className="input"
                value={selectedBrandOption}
                onChange={event => handleBrandOptionChange(event.target.value)}
              >
                {popularBrands.map(brand => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
                <option value={manualBrandValue}>Manual (type your own)</option>
              </select>
              {selectedBrandOption === manualBrandValue && (
                <input
                  className="input mt-2"
                  placeholder="Enter brand name"
                  value={manualBrand}
                  onChange={event => {
                    const value = event.target.value;
                    setManualBrand(value);
                    setForm(current => ({ ...current, brand: value.trim() }));
                  }}
                />
              )}
            </div>

            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={selectedCategoryOption}
                onChange={event => handleCategoryOptionChange(event.target.value)}
              >
                {categoryOptionsForForm.map(category => (
                  <option key={category} value={category}>
                    {getCategoryEmoji(category)} {formatCategoryLabel(category)}
                  </option>
                ))}
                <option value={manualCategoryValue}>Manual (type your own)</option>
              </select>
              {selectedCategoryOption === manualCategoryValue && (
                <input
                  className="input mt-2"
                  placeholder="Enter category name"
                  value={manualCategory}
                  onChange={event => {
                    const value = event.target.value;
                    setManualCategory(value);
                    setForm(current => ({ ...current, category: normalizeCategory(value) }));
                  }}
                />
              )}
            </div>


            <div>
              <label className="label">Quantity / Pack Size</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 500ml, 1, 1.5, half crate"
                value={form.quantity}
                onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">You can enter text, integer, or float values.</p>
            </div>
            <div>
              <label className="label">Price (₹)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.price}
                onChange={event => setForm(current => ({ ...current, price: event.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setForm(current => ({ ...current, available: !current.available }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.available ? 'bg-brand-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.available ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">Available for ordering</span>
          </div>

          {inferBusinessLineFromCategory(normalizeCategory(form.category === manualCategoryValue ? manualCategory : form.category), form.businessLine) === 'icecream' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="label">Stock Quantity</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={form.stockQuantity || ''}
                  onChange={e => setForm(current => ({ ...current, stockQuantity: e.target.value }))}
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setForm(current => ({ ...current, showStock: !current.showStock }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.showStock ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        form.showStock ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">Show to Shopkeeper</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={() => void handleSave()} disabled={uploadingImage}>
              {uploadingImage ? 'Uploading Image...' : editingProduct ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={suggestionsOpen} onClose={() => setSuggestionsOpen(false)} title="Select Suggestion">
        <div className="space-y-4 max-h-[80vh] flex flex-col">
          <p className="text-sm text-gray-500">
            Click any product to add it to your catalog
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suggestions..."
              className="input pl-9 w-full"
              value={suggestionsSearch}
              onChange={e => setSuggestionsSearch(e.target.value)}
            />
          </div>

          {distributorType === 'dual' && (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg text-sm">
              <button
                type="button"
                className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
                  suggestionsLineFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => {
                  setSuggestionsLineFilter('all');
                  setSuggestionsCategoryFilter('all');
                }}
              >
                All 📦
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
                  suggestionsLineFilter === 'dairy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => {
                  setSuggestionsLineFilter('dairy');
                  setSuggestionsCategoryFilter('all');
                }}
              >
                Dairy 🥛
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
                  suggestionsLineFilter === 'icecream' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => {
                  setSuggestionsLineFilter('icecream');
                  setSuggestionsCategoryFilter('all');
                }}
              >
                Ice Cream 🍦
              </button>
            </div>
          )}

          {suggestionsCategories.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-gray-100 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSuggestionsCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  suggestionsCategoryFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              {suggestionsCategories.filter(cat => cat !== 'all').map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSuggestionsCategoryFilter(category)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    suggestionsCategoryFilter === category
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {getCategoryEmoji(category)} {formatCategoryLabel(category)}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 pr-1 max-h-[50vh]">
            {loadingSuggestions ? (
              <div className="py-8 text-center text-gray-500">Loading suggestions...</div>
            ) : suggestions.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No suggestions available</div>
            ) : (
              suggestions
                .filter(item => {
                  const query = suggestionsSearch.toLowerCase().trim();
                  if (distributorType !== 'dual' && item.businessLine !== defaultBusinessLine) {
                    return false;
                  }
                  if (distributorType === 'dual' && suggestionsLineFilter !== 'all' && item.businessLine !== suggestionsLineFilter) {
                    return false;
                  }
                  const itemCat = normalizeCategory(String(item.category || 'other'));
                  if (suggestionsCategoryFilter !== 'all' && itemCat !== suggestionsCategoryFilter) {
                    return false;
                  }
                  return !query || [item.name, item.brand, item.category].some(val => String(val || '').toLowerCase().includes(query));
                })
                .map((item, idx) => {
                  const productVisual = getProductVisual(item.category || item.name);
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors px-2 rounded-lg"
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center border flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: productVisual.bg, borderColor: productVisual.border }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{productVisual.emoji}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.brand} · {item.unit || 'Qty'} · {item.businessLine === 'icecream' ? 'Ice Cream 🍦' : 'Dairy 🥛'}
                        </div>
                        <div className="text-xs text-green-600 font-medium mt-0.5">₹{item.price}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
