import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, AlertTriangle, Plus, Minus, Search, Repeat, ArrowLeft, ChevronRight, Store, Package } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { useToast } from '../../components/ui/Toast';
import { useTranslation } from '../../utils/i18n';
import {
  businessLineLabel,
  getAllowedBusinessLines,
  getCategoryEmoji,
  getProductQuantityText,
  inferBusinessLineFromCategory,
  toDistributorType,
} from '../../utils/businessLine';
import type { Product, ProductCategory } from '../../types';

const normalizeCategory = (value: string): ProductCategory =>
  (value.trim().toLowerCase().replace(/\s+/g, ' ') || 'other') as ProductCategory;

function ProductCard({ product, quantity, onQtyChange, canAdd }: {
  product: Product;
  quantity: number;
  onQtyChange: (qty: number) => void;
  canAdd: boolean;
}) {
  const isOutOfStock = product.businessLine === 'icecream' && product.showStock && product.stockQuantity !== undefined && product.stockQuantity !== null && product.stockQuantity <= 0;

  return (
    <div className={`card p-4 transition-all relative ${quantity > 0 ? 'ring-2 ring-brand-500 ring-offset-1 z-10' : 'z-0'} ${isOutOfStock ? 'opacity-70' : ''}`}>
      {product.showStock && product.stockQuantity !== undefined && product.stockQuantity !== null && !isOutOfStock && (
        <div className="absolute top-2 left-2 z-20">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm bg-green-100 text-green-700">
            {`${product.stockQuantity} In Stock`}
          </span>
        </div>
      )}

      <div className="w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">{getCategoryEmoji(String(product.category))}</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm mb-0.5 leading-tight">{product.name}</div>
          <div className="text-xs text-gray-500">{product.brand} - {getProductQuantityText(product.quantity, product.unit)}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-green-600">₹{product.price}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-20">
        {isOutOfStock ? (
          <div className="w-full py-2 text-xs text-center text-red-500 font-medium border border-red-200 rounded-xl bg-red-50">
            Out of Stock
          </div>
        ) : quantity === 0 ? (
          canAdd ? (
          <button onClick={() => {
              let newQty = 1;
              if (product.businessLine === 'icecream' && product.showStock && product.stockQuantity !== null && product.stockQuantity !== undefined) {
                newQty = Math.min(newQty, product.stockQuantity);
              }
              onQtyChange(newQty);
            }} className="w-full btn-primary py-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          ) : (
            <div className="w-full py-2 text-xs text-center text-gray-400 border border-gray-200 rounded-xl bg-gray-50">
              Locked for this order
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => onQtyChange(Math.max(0, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Minus className="w-3.5 h-3.5 text-gray-700" />
            </button>
            <input
              type="number"
              className="flex-1 text-center font-bold text-gray-900 bg-brand-50 border border-brand-200 rounded-lg py-1.5 text-sm min-w-0"
              value={quantity}
              min={0}
              onChange={e => {
                let newQty = Math.max(0, parseInt(e.target.value) || 0);
                if (product.businessLine === 'icecream' && product.showStock && product.stockQuantity !== null && product.stockQuantity !== undefined) {
                  newQty = Math.min(newQty, product.stockQuantity);
                }
                onQtyChange(newQty);
              }}
            />
            <button
              onClick={() => {
                let newQty = quantity + 1;
                if (product.businessLine === 'icecream' && product.showStock && product.stockQuantity !== null && product.stockQuantity !== undefined) {
                  newQty = Math.min(newQty, product.stockQuantity);
                }
                onQtyChange(newQty);
              }}
              className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-700 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}
      </div>
      {quantity > 0 && (
        <div className="mt-2 text-xs text-green-600 font-medium text-center">
          Subtotal: ₹{(product.price * quantity).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function ShopCatalogPage() {
  const { user } = useAuthStore();
  const { products, connections, distributorProfiles, shopkeeperProfiles, cart, setCartQuantity, clearCart, fetchProducts, orders, fetchOrders, placeOrder } = useAppStore();
  const navigate = useNavigate();
  const { show } = useToast();
  const { t } = useTranslation();
  const [loadingDistributor, setLoadingDistributor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<ProductCategory | 'all'>('all');
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null);
  const [orderBusinessLine, setOrderBusinessLine] = useState<'dairy' | 'icecream'>('dairy');

  const shopProfile = shopkeeperProfiles.find(sp => sp.userId === user?.id);

  const activeConnections = useMemo(
    () => connections.filter(c => c.shopkeeperId === shopProfile?.id && c.status === 'active'),
    [connections, shopProfile?.id]
  );

  useEffect(() => {
    if (activeConnections.length === 0) return;
    if (shopProfile) {
      void fetchOrders(shopProfile.id, 'shopkeeper');
    }
    const distributorIds = [...new Set(activeConnections.map(c => c.distributorId))];
    distributorIds.forEach(id => {
      void fetchProducts(id);
    });
  }, [activeConnections, fetchProducts, fetchOrders, shopProfile]);

  const handleRepeatOrder = async (distributorId: string, lastOrder: any, isLate: boolean) => {
    if (!shopProfile) return;
    setLoadingDistributor(distributorId);
    try {
      const availableGroupProducts = products.filter(p => p.distributorId === distributorId && p.available);
      const cartItems: any[] = [];
      lastOrder.items.forEach((item: any) => {
        const product = availableGroupProducts.find(p => p.id === item.productId);
        if (product) cartItems.push({ product, quantity: item.quantity });
      });
      if (cartItems.length === 0) {
        show('Products from previous order are not available', 'error');
        return;
      }
      const businessLine = cartItems[0] ? inferBusinessLineFromCategory(String(cartItems[0].product.category || 'other'), cartItems[0].product.businessLine) : 'dairy';
      await placeOrder(
        shopProfile.id,
        shopProfile.ownerName || shopProfile.shopName,
        shopProfile.shopName,
        distributorId,
        cartItems,
        isLate,
        businessLine
      );
      show('Order placed automatically!', 'success');
      navigate('/shop/history');
    } catch (e) {
      show('Failed to auto-place order', 'error');
    } finally {
      setLoadingDistributor(null);
    }
  };

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const availableProducts = products
    .filter(p => activeConnections.some(c => c.distributorId === p.distributorId) && p.available)
    .map(product => ({
      ...product,
      businessLine: inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine),
    }));

  const uniqueConnections = useMemo(() => {
    const byDistributor = new Map<string, typeof activeConnections[number]>();
    activeConnections.forEach(conn => {
      if (!byDistributor.has(conn.distributorId)) {
        byDistributor.set(conn.distributorId, conn);
      }
    });
    return Array.from(byDistributor.values());
  }, [activeConnections]);

  const groupedByDistributor = uniqueConnections.map(conn => {
    const distributorProfile = distributorProfiles.find(dp => dp.id === conn.distributorId);
    const distributorType = toDistributorType(distributorProfile?.distributorType);
    const allowedLines = getAllowedBusinessLines(distributorType);
    const isLate = distributorProfile ? currentTime > distributorProfile.orderWindowCutoff : false;
    const isBeforeWindow = distributorProfile ? currentTime < distributorProfile.orderWindowStart : false;

    const items = availableProducts.filter(p => {
      if (p.distributorId !== conn.distributorId || !p.available) return false;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'all' || normalizeCategory(String(p.category)) === filterCat;
      const line = inferBusinessLineFromCategory(String(p.category || 'other'), p.businessLine);
      return matchSearch && matchCat && allowedLines.includes(line);
    });

    const dairyItems = items.filter(item => inferBusinessLineFromCategory(String(item.category || 'other'), item.businessLine) === 'dairy');
    const allIceCreamItems = items.filter(item => inferBusinessLineFromCategory(String(item.category || 'other'), item.businessLine) === 'icecream');
    const outOfStockItems = allIceCreamItems.filter(item => item.showStock && (item.stockQuantity || 0) <= 0);
    const iceCreamItems = allIceCreamItems.filter(item => !(item.showStock && (item.stockQuantity || 0) <= 0));

    const generalAvailableItems = items.filter(item => !(item.businessLine === 'icecream' && item.showStock && (item.stockQuantity || 0) <= 0));

    return {
      conn,
      distributorProfile,
      distributorType,
      isLate,
      isBeforeWindow,
      items: generalAvailableItems,
      outOfStockItems,
      dairyItems,
      iceCreamItems,
    };
  });

  const lockedDistributorId = cart[0]?.product.distributorId || null;
  const lockedBusinessLine = cart[0]
    ? inferBusinessLineFromCategory(String(cart[0].product.category || 'other'), cart[0].product.businessLine)
    : null;
  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const selectedGroup = selectedDistributorId
    ? groupedByDistributor.find(group => group.conn.distributorId === selectedDistributorId)
    : null;
  const visibleGroups = selectedGroup ? [selectedGroup] : [];
  const filteredCount = selectedGroup?.items.length ?? 0;
  const selectedDistributorProducts = selectedDistributorId
    ? availableProducts.filter(product => product.distributorId === selectedDistributorId)
    : [];
  const categoryProducts = selectedDistributorId ? selectedDistributorProducts : availableProducts;
  const categories = [...new Set(categoryProducts.map(p => normalizeCategory(String(p.category))))] as ProductCategory[];

  useEffect(() => {
    if (lockedDistributorId && selectedDistributorId !== lockedDistributorId) {
      setSelectedDistributorId(lockedDistributorId);
      return;
    }
    if (selectedDistributorId && !activeConnections.some(conn => conn.distributorId === selectedDistributorId)) {
      setSelectedDistributorId(null);
    }
  }, [activeConnections, lockedDistributorId, selectedDistributorId]);

  if (activeConnections.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="Not connected to a distributor"
          description="Connect with your distributor first to start ordering"
          action={
            <button className="btn-primary" onClick={() => navigate('/shop/connection')}>
              Connect Now
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <MobileHeader title={t('Order Now')} subtitle={shopProfile?.shopName || 'Connected distributors'} />
      <div className="hidden md:block mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t('Order Now')}</h1>
        <p className="text-sm text-gray-500">{shopProfile?.shopName || 'Connected distributors'}</p>
      </div>

      {!selectedGroup ? (
        <div className="space-y-3 mb-24">
          <div className="text-sm text-gray-600">
            Select a distributor. You will only see products from that distributor.
          </div>
          {groupedByDistributor.map(group => {
            const totalProducts = availableProducts.filter(product => product.distributorId === group.conn.distributorId).length;
            const lastOrder = orders.find(order => order.distributorId === group.conn.distributorId && order.status !== 'rejected');
            return (
              <button
                key={group.conn.id}
                type="button"
                onClick={() => {
                  setSelectedDistributorId(group.conn.distributorId);
                  setSearch('');
                  setFilterCat('all');
                }}
                className="w-full card p-4 text-left hover:border-brand-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">{group.conn.businessName}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {group.distributorProfile?.company || businessLineLabel(group.distributorType === 'icecream' ? 'icecream' : 'dairy')}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-100 px-2 py-1 text-gray-600">
                        <Package className="w-3 h-3" /> {totalProducts} products
                      </span>
                      {group.distributorProfile && (
                        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
                          group.isLate
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            : group.isBeforeWindow
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {group.isLate
                            ? `Closed ${group.distributorProfile.orderWindowCutoff}`
                            : group.isBeforeWindow
                              ? `Opens ${group.distributorProfile.orderWindowStart}`
                              : `Open till ${group.distributorProfile.orderWindowCutoff}`}
                        </span>
                      )}
                      {lastOrder && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-100 px-2 py-1 text-brand-700">
                          <Repeat className="w-3 h-3" /> Last order available
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (cart.length > 0) {
              show('Please place the order for your current cart first or clear the cart.', 'info');
              return;
            }
            setSelectedDistributorId(null);
            setSearch('');
            setFilterCat('all');
          }}
          className="btn-secondary p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="font-bold text-gray-900 truncate">{selectedGroup.conn.businessName}</div>
          <div className="text-xs text-gray-500">{selectedDistributorProducts.length} products available</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder={t('Search products...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filterCat === 'all' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize ${filterCat === cat ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {getCategoryEmoji(String(cat))} {String(cat)}
          </button>
        ))}
      </div>

      {filteredCount === 0 ? (
        <EmptyState icon={<Search className="w-8 h-8" />} title="No products found" />
      ) : (
        <div className="space-y-6 mb-24">
          {visibleGroups.map(group => (
            <section key={group.conn.id} className="card p-4">
              <div className="mb-3">
                <h2 className="text-base font-bold text-gray-900">{group.conn.businessName}</h2>
                <p className="text-xs text-gray-500">{group.conn.shopName}</p>
              </div>
              {lockedDistributorId && lockedDistributorId !== group.conn.distributorId && (
                <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  First distributor already selected in cart. Place this order first to add from another distributor.
                </div>
              )}
              {group.distributorType === 'dual' && lockedDistributorId === group.conn.distributorId && lockedBusinessLine && (
                <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Active order section: {businessLineLabel(lockedBusinessLine)}. Ek order me sirf ek section allowed hai.
                </div>
              )}

              {group.distributorType === 'dual' && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Choose Dairy Products or Ice Cream Products for this order.</p>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setOrderBusinessLine('dairy')}
                      className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${orderBusinessLine === 'dairy' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
                    >
                      Dairy Products 🥛
                    </button>
                    <button
                      onClick={() => setOrderBusinessLine('icecream')}
                      className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${orderBusinessLine === 'icecream' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
                    >
                      Ice Cream 🍦
                    </button>
                  </div>
                </div>
              )}

              {group.distributorProfile && (
                <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 ${
                  group.isLate
                    ? 'bg-yellow-50 border border-yellow-200'
                    : group.isBeforeWindow
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-green-50 border border-green-200'
                }`}>
                  <Clock
                    className={`w-4 h-4 flex-shrink-0 ${
                      group.isLate ? 'text-yellow-600' : group.isBeforeWindow ? 'text-blue-600' : 'text-green-600'
                    }`}
                  />
                  <div className="flex-1">
                    {group.isLate ? (
                      <span className="text-sm text-yellow-800 font-medium">
                        Order window closed at {group.distributorProfile.orderWindowCutoff} - late order
                      </span>
                    ) : group.isBeforeWindow ? (
                      <span className="text-sm text-blue-800">
                        Order window opens at {group.distributorProfile.orderWindowStart}
                      </span>
                    ) : (
                      <span className="text-sm text-green-800 font-medium">
                        Order window open until <strong>{group.distributorProfile.orderWindowCutoff}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                const lastOrder = orders.find(o => o.distributorId === group.conn.distributorId && o.status !== 'rejected');
                if (lastOrder && lastOrder.items.length > 0) {
                  return (
                    <div className="mb-4 bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl p-4 border border-brand-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-5 h-5 text-brand-600" />
                          <h3 className="font-bold text-brand-900 text-sm">{t('Smart Suggestion')}</h3>
                        </div>
                      </div>
                      <p className="text-xs text-brand-800 mb-3 font-medium">
                        {t('Aaj bhi kal wala order laga du?')} ({lastOrder.items.length} {t('Items')}, {t('Total')}: ₹{lastOrder.total})
                      </p>
                      <div className="flex gap-2">
                        <button 
                          className="btn-primary text-xs py-2 px-3 flex-1 shadow-sm"
                          onClick={() => handleRepeatOrder(group.conn.distributorId, lastOrder, group.isLate)}
                          disabled={loadingDistributor === group.conn.distributorId}
                        >
                          {loadingDistributor === group.conn.distributorId ? 'Placing...' : t('One-Click Confirm')}
                        </button>
                        <button 
                          className="btn-secondary text-xs py-2 px-3 flex-1 shadow-sm bg-white"
                          onClick={() => {
                            clearCart();
                            const availableGroupProducts = products.filter(p => p.distributorId === group.conn.distributorId && p.available);
                            let itemsAdded = 0;
                            lastOrder.items.forEach((item: any) => {
                              const product = availableGroupProducts.find(p => p.id === item.productId);
                              if (product) {
                                setCartQuantity(product, item.quantity);
                                itemsAdded++;
                              }
                            });
                            if (itemsAdded === 0) {
                              show('Products from previous order are not available', 'error');
                              return;
                            }
                            show('Cart updated with previous order. Please review and confirm.', 'info');
                            navigate('/shop/review');
                          }}
                          disabled={loadingDistributor === group.conn.distributorId}
                        >
                          {t('Review & Edit')}
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {group.items.length === 0 ? (
                <div className="text-sm text-gray-500 py-3">No products for this distributor.</div>
              ) : group.distributorType === 'dual' ? (
                <div className="space-y-4">
                  {orderBusinessLine === 'dairy' && (
                    <div>
                      {group.dairyItems.length === 0 ? (
                        <div className="text-xs text-gray-500 mb-2">No dairy products available.</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {group.dairyItems.map(product => {
                            const cartItem = cart.find(c => c.product.id === product.id);
                            const productLine = inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
                            const canAddDistributor = !lockedDistributorId || lockedDistributorId === group.conn.distributorId;
                            const canAddBusinessLine = !lockedBusinessLine || lockedBusinessLine === productLine;
                            const canAdd = !!cartItem || (canAddDistributor && canAddBusinessLine);
                            return (
                              <ProductCard
                                key={product.id}
                                product={product}
                                quantity={cartItem?.quantity || 0}
                                canAdd={canAdd}
                                onQtyChange={qty => setCartQuantity(product, qty)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {orderBusinessLine === 'icecream' && (
                    <div>
                      {group.iceCreamItems.length === 0 ? (
                        <div className="text-xs text-gray-500">No ice cream products available.</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {group.iceCreamItems.map(product => {
                            const cartItem = cart.find(c => c.product.id === product.id);
                            const productLine = inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
                            const canAddDistributor = !lockedDistributorId || lockedDistributorId === group.conn.distributorId;
                            const canAddBusinessLine = !lockedBusinessLine || lockedBusinessLine === productLine;
                            const canAdd = !!cartItem || (canAddDistributor && canAddBusinessLine);
                            return (
                              <ProductCard
                                key={product.id}
                                product={product}
                                quantity={cartItem?.quantity || 0}
                                canAdd={canAdd}
                                onQtyChange={qty => setCartQuantity(product, qty)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.items.map(product => {
                    const cartItem = cart.find(c => c.product.id === product.id);
                    const productLine = inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
                    const canAddDistributor = !lockedDistributorId || lockedDistributorId === group.conn.distributorId;
                    const canAddBusinessLine = !lockedBusinessLine || lockedBusinessLine === productLine;
                    const canAdd = !!cartItem || (canAddDistributor && canAddBusinessLine);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={cartItem?.quantity || 0}
                        canAdd={canAdd}
                        onQtyChange={qty => setCartQuantity(product, qty)}
                      />
                    );
                  })}
                </div>
              )}

              {group.outOfStockItems && group.outOfStockItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Out of Stock</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.outOfStockItems.map(product => {
                      const cartItem = cart.find(c => c.product.id === product.id);
                      const productLine = inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
                      const canAddDistributor = !lockedDistributorId || lockedDistributorId === group.conn.distributorId;
                      const canAddBusinessLine = !lockedBusinessLine || lockedBusinessLine === productLine;
                      const canAdd = !!cartItem || (canAddDistributor && canAddBusinessLine);
                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          quantity={cartItem?.quantity || 0}
                          canAdd={canAdd}
                          onQtyChange={qty => setCartQuantity(product, qty)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
        </>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 md:left-60 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-30">
          <button
            className="btn-primary w-full max-w-lg mx-auto flex justify-between items-center py-3 px-5"
            onClick={() => navigate('/shop/review')}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>{cartCount} {t('Items')}</span>
            </div>
            <span>{t('Review Order')} {'->'}</span>
            <span className="font-bold text-green-600">₹{cartTotal.toLocaleString()}</span>
          </button>
        </div>
      )}
    </div>
  );
}
