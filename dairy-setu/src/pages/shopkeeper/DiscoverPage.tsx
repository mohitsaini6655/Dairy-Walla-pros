import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Search, Building2, Tag, Send, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { calculateDistance, formatDistance, getCurrentLocation } from '../../utils/location';
import type { DistributorProfile } from '../../types';

interface DistributorWithDistance extends DistributorProfile {
  distance?: number;
}

export function DiscoverPage() {
  const { user } = useAuthStore();
  const { distributorProfiles, shopkeeperProfiles, connections, requestConnection, ensureShopkeeperProfile } = useAppStore();
  const { show } = useToast();
  const navigate = useNavigate();
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');

  // Ensure shopkeeper profile exists for new users
  const shopProfile = user
    ? shopkeeperProfiles.find(sp => sp.userId === user.id) || ensureShopkeeperProfile(user.id)
    : null;
  const myConnections = connections.filter(c => c.shopkeeperId === shopProfile?.id);

  // Get user location on mount
  useEffect(() => {
    if (shopProfile?.latitude && shopProfile?.longitude) {
      setUserLocation({ lat: shopProfile.latitude, lon: shopProfile.longitude });
    } else {
      // Default to Ajmer for demo
      setUserLocation({ lat: 26.4499, lon: 74.6399 });
    }
  }, [shopProfile?.id]);

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation({ lat: location.latitude, lon: location.longitude });
      show('Location detected!');
    } catch (_error) {
      show('Location access denied. Using default location.', 'error');
      // Use shop's saved location or default
      if (shopProfile?.latitude && shopProfile?.longitude) {
        setUserLocation({ lat: shopProfile.latitude, lon: shopProfile.longitude });
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  // Calculate distances and sort
  const distributorsWithDistance: DistributorWithDistance[] = distributorProfiles
    .map(dp => {
      if (userLocation && dp.latitude !== undefined && dp.latitude !== null && dp.longitude !== undefined && dp.longitude !== null) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lon,
          dp.latitude,
          dp.longitude
        );
        return { ...dp, distance };
      }
      return dp;
    })
    .sort((a, b) => {
      const distA = (a as DistributorWithDistance).distance ?? Infinity;
      const distB = (b as DistributorWithDistance).distance ?? Infinity;
      return distA - distB;
    });

  // Filter distributors
  const filteredDistributors = distributorsWithDistance.filter(dp => {
    const matchSearch = !searchQuery || 
      dp.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dp.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dp.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dp.deliveryAreas?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchCompany = filterCompany === 'all' || dp.company === filterCompany;
    
    return matchSearch && matchCompany;
  });

  // Get unique companies
  const companies = ['all', ...new Set(distributorProfiles.map(dp => dp.company).filter(Boolean))] as string[];

  const handleConnect = async (distributorId: string, businessName: string, connectionCode: string) => {
    if (!user || !shopProfile) return;

    const alreadyConnected = myConnections.some(
      c => c.distributorId === distributorId && c.status !== 'rejected'
    );

    if (alreadyConnected) {
      show('Already connected or request pending', 'error');
      return;
    }

    const success = await requestConnection(
      shopProfile.id,
      user.name,
      shopProfile.shopName,
      connectionCode,
      user.phone
    );

    if (success) {
      show(`Connection request sent to ${businessName}!`);
    } else {
      show('Failed to send request', 'error');
    }
  };

  const getConnectionStatus = (distributorId: string) => {
    const conn = myConnections.find(c => c.distributorId === distributorId);
    return conn?.status;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <MobileHeader title="Discover Distributors" subtitle="Find nearby dairy distributors" />
      
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">Discover Distributors</h1>
        <p className="text-sm text-gray-500 mt-0.5">Find and connect with distributors near you</p>
      </div>

      {/* Location banner */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">Your Location</div>
              {userLocation ? (
                <div className="text-sm font-medium text-gray-900">
                  {shopProfile?.locationName || shopProfile?.city || 'Location detected'}
                </div>
              ) : (
                <div className="text-sm text-gray-400">Location not set</div>
              )}
            </div>
          </div>
          <button
            onClick={handleGetLocation}
            disabled={loadingLocation}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            {loadingLocation ? 'Getting...' : 'Update'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, company, or area..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Company filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {companies.map(company => (
          <button
            key={company}
            onClick={() => setFilterCompany(company)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize ${
              filterCompany === company
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {company === 'all' ? 'All Companies' : company}
          </button>
        ))}
      </div>

      {/* Distributors list */}
      <div className="space-y-3">
        {filteredDistributors.length === 0 ? (
          <div className="card p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No distributors found</p>
          </div>
        ) : (
          filteredDistributors.map(distributor => {
            const status = getConnectionStatus(distributor.id);
            
            return (
              <div
                key={distributor.id}
                onClick={() => navigate(`/shop/distributor/${distributor.id}`)}
                className="card p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white font-bold text-lg">
                      {distributor.businessName[0]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {distributor.businessName}
                        </h3>
                        <p className="text-xs text-gray-500">{distributor.ownerName}</p>
                      </div>
                      {distributor.distance !== undefined && (
                        <span className="badge badge-blue text-xs flex items-center gap-1 flex-shrink-0">
                          <MapPin className="w-3 h-3" />
                          {formatDistance(distributor.distance)}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {distributor.company && (
                        <span className="badge bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {distributor.company}
                        </span>
                      )}
                      {distributor.city && (
                        <span className="badge bg-gray-100 text-gray-600 text-xs">
                          {distributor.city}
                        </span>
                      )}
                    </div>

                    {/* Delivery areas */}
                    {distributor.deliveryAreas && (
                      <p className="text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Delivers to: {distributor.deliveryAreas}
                      </p>
                    )}

                    {/* Order window */}
                    <p className="text-xs text-gray-400 mb-3">
                      Order window: {distributor.orderWindowStart} - {distributor.orderWindowCutoff}
                    </p>

                    <div className="text-xs text-brand-600 font-medium mb-3">
                      Click to view full profile →
                    </div>

                    {/* Action button */}
                    {status === 'active' ? (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Connected
                      </div>
                    ) : status === 'pending' ? (
                      <button
                        disabled
                        className="btn-secondary text-xs w-full opacity-60 cursor-not-allowed"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Request Pending
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleConnect(distributor.id, distributor.businessName, distributor.connectionCode);
                        }}
                        className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info card */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-xs text-blue-700 font-medium mb-1">💡 How it works</p>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>• Distributors sorted by distance from your location</li>
          <li>• Send connection request to start ordering</li>
          <li>• Wait for distributor to approve your request</li>
          <li>• Once approved, you can place orders daily</li>
        </ul>
      </div>
    </div>
  );
}
