import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Tag, Package, Send, CheckCircle, Phone } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { formatDistance } from '../../utils/location';
import { businessLineLabel, getCategoryEmoji, getProductQuantityText, inferBusinessLineFromCategory, toDistributorType } from '../../utils/businessLine';
import type { ProductCategory } from '../../types';

const normalizeCategory = (value: string): ProductCategory =>
  (value.trim().toLowerCase().replace(/\s+/g, ' ') || 'other') as ProductCategory;


export function DistributorProfilePage() {
  const { distributorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { distributorProfiles, shopkeeperProfiles, products, connections, requestConnection, cancelConnection, fetchProducts } = useAppStore();
  const { show } = useToast();

  const distributor = distributorProfiles.find(dp => dp.id === distributorId);
  const distributorPhone = (
    distributor as unknown as { phone?: string; contactPhone?: string } | undefined
  )?.phone || (
    distributor as unknown as { phone?: string; contactPhone?: string } | undefined
  )?.contactPhone || '';
  const telPhone = distributorPhone.replace(/[^\d+]/g, '');
  const distributorType = toDistributorType(distributor?.distributorType);
  const shopProfile = shopkeeperProfiles.find(sp => sp.userId === user?.id);
  const distributorProducts = products
    .filter(p => p.distributorId === distributorId && p.available)
    .map(product => ({
      ...product,
      businessLine: inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine),
    }));

  useEffect(() => {
    if (distributorId) {
      void fetchProducts(distributorId);
    }
  }, [distributorId, fetchProducts]);

  let distance: number | undefined;
  if (shopProfile?.latitude && shopProfile?.longitude && distributor?.latitude && distributor?.longitude) {
    const R = 6371;
    const dLat = ((distributor.latitude - shopProfile.latitude) * Math.PI) / 180;
    const dLon = ((distributor.longitude - shopProfile.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((shopProfile.latitude * Math.PI) / 180) *
        Math.cos((distributor.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;
  }

  const myConnection = connections.find(
    c => c.shopkeeperId === shopProfile?.id && c.distributorId === distributorId
  );

  const handleConnect = async () => {
    if (!user || !shopProfile || !distributor) return;

    if (myConnection && myConnection.status !== 'rejected') {
      show('Already connected or request pending', 'error');
      return;
    }

    const success = await requestConnection(
      shopProfile.id,
      user.name,
      shopProfile.shopName,
      distributor.connectionCode,
      user.phone
    );

    if (success) {
      show(`Connection request sent to ${distributor.businessName}!`);
    } else {
      show('Failed to send request', 'error');
    }
  };

  const handleCancelOrDisconnect = async () => {
    if (!myConnection || !distributor) return;

    const isFirstConfirmed = window.confirm(
      myConnection.status === 'active'
        ? `Are you sure you want to disconnect from ${distributor.businessName}?`
        : `Are you sure you want to cancel your connection request to ${distributor.businessName}?`
    );
    if (!isFirstConfirmed) return;

    const isSecondConfirmed = window.confirm(
      myConnection.status === 'active'
        ? `Double Check: Do you really want to remove this connection? You won't be able to place orders until connected again.`
        : `Double Check: Are you absolutely sure you want to cancel this pending request?`
    );
    if (!isSecondConfirmed) return;

    const success = await cancelConnection(myConnection.id);
    if (success) {
      show(
        myConnection.status === 'active'
          ? `Disconnected from ${distributor.businessName}`
          : `Request canceled successfully`
      );
    } else {
      show('Failed to cancel connection', 'error');
    }
  };

  const productsByCategory = distributorProducts.reduce((acc, product) => {
    const category = normalizeCategory(String(product.category));
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof distributorProducts>);
  const dairyProducts = distributorProducts.filter(p => p.businessLine === 'dairy');
  const iceCreamProducts = distributorProducts.filter(p => p.businessLine === 'icecream');

  if (!distributor) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Distributor not found</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Distributor Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-2xl">{distributor.businessName[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{distributor.businessName}</h2>
                {distributor.distributorType && (
                  <span className="px-2 py-0.5 rounded-md border border-brand-500 bg-brand-50 text-brand-700 text-xs font-bold whitespace-nowrap">
                    {distributor.distributorType === 'dairy' ? 'Dairy 🥛' : distributor.distributorType === 'icecream' ? 'Ice Cream 🍦' : 'Dairy & Ice Cream 🥛🍦'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{distributor.ownerName}</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-emerald-100 text-emerald-700">
                  {distributorType === 'dual' ? 'Dairy + Ice Cream' : distributorType === 'icecream' ? 'Ice Cream Distributor' : 'Dairy Distributor'}
                </span>
                {distributor.company && (
                  <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {distributor.company}
                  </span>
                )}
                {distributor.city && <span className="badge bg-gray-100 text-gray-600">{distributor.city}</span>}
                {distance !== undefined && (
                  <span className="badge badge-blue flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(distance)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {distributor.address && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Address</div>
                  <div className="text-sm text-gray-900">{distributor.address}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Order Window</div>
                <div className="text-sm text-gray-900 font-medium">
                  {distributor.orderWindowStart} - {distributor.orderWindowCutoff}
                </div>
              </div>
            </div>

            {distributor.deliveryAreas && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl md:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Delivery Areas</div>
                  <div className="text-sm text-gray-900">{distributor.deliveryAreas}</div>
                </div>
              </div>
            )}

            {distributorPhone && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl md:col-span-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-0.5">Phone</div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-900 font-medium">{distributorPhone}</div>
                    <a href={`tel:${telPhone}`} className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {myConnection?.status === 'active' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-xl text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Connected</span>
              </div>
              <button
                onClick={() => void handleCancelOrDisconnect()}
                className="w-full text-center py-2 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors border border-red-200 rounded-xl bg-red-50 hover:bg-red-100"
              >
                Disconnect
              </button>
            </div>
          ) : myConnection?.status === 'pending' ? (
            <div className="flex flex-col gap-2">
              <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">
                Request Pending
              </button>
              <button
                onClick={() => void handleCancelOrDisconnect()}
                className="w-full text-center py-2 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors border border-gray-200 rounded-xl bg-gray-50 hover:bg-red-50"
              >
                Cancel Request
              </button>
            </div>
          ) : (
            <button onClick={() => void handleConnect()} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              Send Connection Request
            </button>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">Available Products</h3>
            <span className="badge bg-brand-100 text-brand-700">{distributorProducts.length} items</span>
          </div>

          {distributorProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No products available</p>
            </div>
          ) : distributorType === 'dual' ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{businessLineLabel('dairy')}</h4>
                {dairyProducts.length === 0 ? (
                  <div className="text-xs text-gray-500">No dairy products available.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dairyProducts.map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{getCategoryEmoji(String(product.category))}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm leading-tight">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.brand} · {getProductQuantityText(product.quantity, product.unit)}</div>
                        </div>
                        <div className="font-bold text-green-600 flex-shrink-0">₹{product.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{businessLineLabel('icecream')}</h4>
                {iceCreamProducts.length === 0 ? (
                  <div className="text-xs text-gray-500">No ice cream products available.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {iceCreamProducts.map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{getCategoryEmoji(String(product.category))}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm leading-tight">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.brand} · {getProductQuantityText(product.quantity, product.unit)}</div>
                        </div>
                        <div className="font-bold text-green-600 flex-shrink-0">₹{product.price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(productsByCategory).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 capitalize">
                    <span className="text-lg">{getCategoryEmoji(category)}</span>
                    {category}
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(product => (
                      <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{getCategoryEmoji(String(product.category))}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm leading-tight">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.brand} · {getProductQuantityText(product.quantity, product.unit)}</div>
                        </div>
                        <div className="font-bold text-green-600 flex-shrink-0">₹{product.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 Next Steps</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• Send connection request to start ordering</li>
            <li>• Wait for distributor approval</li>
            <li>• Once approved, you can place daily orders</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
