import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Building2, Store, Edit2, Check, X,
  LogOut, ChevronRight, MapPin, Clock, Tag, FileText, Package, Users, Navigation, Copy, Globe, UploadCloud, Trash2, Share2
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useToast } from '../components/ui/Toast';
import { MobileHeader } from '../components/layout/MobileHeader';
import { getCurrentLocation, getCoordinatesFromLocation } from '../utils/location';
import { useTranslation } from '../utils/i18n';
import { isSpamPhone } from '../utils/validation';

const DELIVERY_TIMINGS = ['Morning (6–9 AM)', 'Afternoon (12–3 PM)', 'Evening (5–8 PM)', 'Any Time'];
const COMPANIES = ['Amul', 'Saras', 'Mother Dairy', 'Parag', 'Local Brand', 'Multiple Brands'];

interface EditField {
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'select';
  options?: string[];
  placeholder?: string;
}

export function ProfilePage() {

  const { user, updateUser, signOut, deleteAccount } = useAuthStore();
  const { distributorProfiles, shopkeeperProfiles, updateDistributorSettings, updateShopkeeperProfile, products, connections } = useAppStore();
  const { show } = useToast();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  const isDistributor = user?.role === 'distributor';
  const distProfile = distributorProfiles.find(dp => dp.userId === user?.id);
  const shopProfile = shopkeeperProfiles.find(sp => sp.userId === user?.id);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !isDistributor || !distProfile) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      show(t('Image must be less than 5MB'), 'error');
      return;
    }
    try {
      setUploadingQr(true);
      const fileRef = ref(storage, `payment_qrs/${user?.id}_${Date.now()}`);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(uploadTask.ref);
      await updateDistributorSettings(distProfile.id, { paymentQrUrl: url });
      show(t('Payment QR Code uploaded successfully!'));
    } catch (err) {
      console.error(err);
      show(t('Failed to upload QR code'), 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRemoveQr = async () => {
    if (!isDistributor || !distProfile) return;
    if (!window.confirm(t('Are you sure you want to remove your Payment QR code?'))) return;
    try {
      await updateDistributorSettings(distProfile.id, { paymentQrUrl: '' });
      show(t('Payment QR Code removed.'));
    } catch (err) {
      console.error(err);
      show(t('Failed to remove QR code'), 'error');
    }
  };
  const [locationData, setLocationData] = useState({
    locationName: (isDistributor ? distProfile?.locationName : shopProfile?.locationName) || '',
    latitude: (isDistributor ? distProfile?.latitude : shopProfile?.latitude),
    longitude: (isDistributor ? distProfile?.longitude : shopProfile?.longitude),
  });

  // Sync location data when profile loads asynchronously
  useEffect(() => {
    if (!editingLocation) {
      setLocationData({
        locationName: (isDistributor ? distProfile?.locationName : shopProfile?.locationName) || '',
        latitude: (isDistributor ? distProfile?.latitude : shopProfile?.latitude),
        longitude: (isDistributor ? distProfile?.longitude : shopProfile?.longitude),
      });
    }
  }, [isDistributor, distProfile, shopProfile, editingLocation]);

  const startEdit = (field: EditField) => {
    setEditingField(field.key);
    setEditValue(field.value || '');
  };

  const saveEdit = async (key: string) => {
    const val = editValue.trim();
    if (!val && ['name', 'businessName', 'shopName', 'city', 'phone'].includes(key)) {
      show(t('This field cannot be empty.'), 'error');
      return;
    }
    if (key === 'phone' && isSpamPhone(val)) {
      show(t('Please enter a valid 10-digit Indian mobile number.'), 'error');
      return;
    }

    try {
      if (key === 'name') {
        await updateUser({ name: val });
      } else if (key === 'phone') {
        await updateUser({ phone: val });
      } else if (isDistributor && distProfile) {
        await updateDistributorSettings(distProfile.id, { [key]: val });
        if (key === 'ownerName') await updateUser({ name: val });
      } else if (!isDistributor && shopProfile) {
        await updateShopkeeperProfile(shopProfile.id, { [key]: val });
        if (key === 'ownerName') await updateUser({ name: val });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed.';
      show(message, 'error');
      return;
    }

    setEditingField(null);
    if (key === 'city' && val) {
      const coords = getCoordinatesFromLocation(val);
      if (coords) {
        setLocationData(prev => ({
          ...prev,
          latitude: coords.lat,
          longitude: coords.lon,
        }));
      }
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
  };

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setLocationData(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      show(t('Location captured!'));
    } catch (_error) {
      show(t('Location access denied'), 'error');
      const profile = isDistributor ? distProfile : shopProfile;
      if (profile?.city) {
        const coords = getCoordinatesFromLocation(profile.city);
        if (coords) {
          setLocationData(prev => ({
            ...prev,
            latitude: coords.lat,
            longitude: coords.lon,
          }));
        }
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const saveLocation = () => {
    if (isDistributor && distProfile) {
      updateDistributorSettings(distProfile.id, {
        locationName: locationData.locationName,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
    } else if (!isDistributor && shopProfile) {
      updateShopkeeperProfile(shopProfile.id, {
        locationName: locationData.locationName,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
    }
    setEditingLocation(false);
    show(t('Location updated!'));
  };

  const handleLogout = async () => {
    if (window.confirm(t('Are you sure you want to log out?'))) {
      await signOut();
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    const res = await deleteAccount();
    if (res?.error) {
      show(res.error, 'error');
      setShowDeleteConfirm(false);
    } else {
      show(t('Account deleted successfully'));
      navigate('/login');
    }
  };

  const handleShareProfile = async () => {
    if (!distProfile) return;
    const shareText = `Connect with ${distProfile.businessName} on Dairy Walla to place your orders! Use my Connection Code: ${distProfile.connectionCode}\n\nDownload the app: https://play.google.com/store/apps/details?id=com.dairywalla.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${distProfile.businessName} on Dairy Walla`,
          text: shareText,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      show(t('Profile info copied to clipboard!'));
    }
  };

  // Build field rows
  const distributorFields: EditField[] = [
    { key: 'ownerName', label: 'Owner Name', value: distProfile?.ownerName || user?.name || '', placeholder: 'Your name' },
    { key: 'businessName', label: 'Business Name', value: distProfile?.businessName || '', placeholder: 'Dairy name' },
    { key: 'phone', label: 'Mobile Number', value: user?.phone || '', placeholder: '10 digit mobile number' },
    { key: 'company', label: 'Company / Brand', value: distProfile?.company || '', type: 'select', options: COMPANIES },
    { key: 'city', label: 'City', value: distProfile?.city || '', placeholder: 'e.g. Ajmer' },
    { key: 'address', label: 'Address', value: distProfile?.address || '', placeholder: 'Shop address' },
    { key: 'deliveryAreas', label: 'Delivery Areas', value: distProfile?.deliveryAreas || '', placeholder: 'e.g. Vaishali Nagar, Civil Lines' },
    { key: 'gst', label: 'GST Number', value: distProfile?.gst || '', placeholder: 'GSTIN (optional)' },
  ];

  const shopkeeperFields: EditField[] = [
    { key: 'ownerName', label: 'Owner Name', value: shopProfile?.ownerName || user?.name || '', placeholder: 'Your name' },
    { key: 'shopName', label: 'Shop Name', value: shopProfile?.shopName || '', placeholder: 'Shop name' },
    { key: 'phone', label: 'Mobile Number', value: user?.phone || '', placeholder: '10 digit mobile number' },
    { key: 'city', label: 'City', value: shopProfile?.city || '', placeholder: 'e.g. Ajmer' },
    { key: 'address', label: 'Address', value: shopProfile?.address || '', placeholder: 'Shop address' },
    { key: 'deliveryTiming', label: 'Delivery Timing', value: shopProfile?.deliveryTiming || '', type: 'select', options: DELIVERY_TIMINGS },
  ];

  const fields = isDistributor ? distributorFields : shopkeeperFields;
  const avatarLetter = user?.name?.[0]?.toUpperCase() || '?';

  const fieldIcons: Record<string, React.ReactElement> = {
    ownerName: <User className="w-3.5 h-3.5" />,
    businessName: <Building2 className="w-3.5 h-3.5" />,
    phone: <Phone className="w-3.5 h-3.5" />,
    shopName: <Store className="w-3.5 h-3.5" />,
    company: <Tag className="w-3.5 h-3.5" />,
    city: <MapPin className="w-3.5 h-3.5" />,
    address: <MapPin className="w-3.5 h-3.5" />,
    deliveryAreas: <MapPin className="w-3.5 h-3.5" />,
    deliveryTiming: <Clock className="w-3.5 h-3.5" />,
    gst: <FileText className="w-3.5 h-3.5" />,
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <MobileHeader title={t('My Profile')} showBack />
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">{t('My Profile')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('Manage your profile details.')}</p>
      </div>

      {/* Avatar card */}
      <div className="card p-5 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center shadow-md flex-shrink-0">
          <span className="text-white font-bold text-2xl">{avatarLetter}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-base">{user?.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`badge ${isDistributor ? 'badge-green' : 'badge-blue'} capitalize text-xs`}>
              {isDistributor ? '🚚 Distributor' : '🏪 Shopkeeper'}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Phone className="w-3 h-3" /> +91 {user?.phone}
          </div>
        </div>
      </div>

      {/* Language Selector Card */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-brand-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">{t('App Language')}</h3>
              <p className="text-xs text-gray-400">{t('Select your preferred language.')}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLanguage('english')}
            className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
              language === 'english'
                ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hindi')}
            className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
              language === 'hindi'
                ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            हिंदी (Hindi)
          </button>
        </div>
      </div>

      {/* Editable profile fields */}
      <div className="card divide-y divide-gray-100 mb-4">
        {fields.map(field => (
          <div key={field.key} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {fieldIcons[field.key]}
                {t(field.label)}
              </div>
              {editingField !== field.key && (
                <button
                  onClick={() => startEdit(field)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                >
                  <Edit2 className="w-3 h-3" /> {t('Edit')}
                </button>
              )}
            </div>

            {editingField === field.key ? (
              <div className="flex gap-2 mt-2">
                {field.type === 'select' ? (
                  <select
                    className="input flex-1"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                  >
                    <option value="">Select...</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.key === 'pin' ? 'password' : 'text'}
                    maxLength={field.key === 'pin' ? 6 : field.key === 'phone' ? 10 : undefined}
                    inputMode={field.key === 'pin' || field.key === 'phone' ? 'numeric' : undefined}
                    className="input flex-1"
                    value={field.key === 'pin' && editValue === '******' ? '' : editValue}
                    placeholder={field.placeholder}
                    onChange={e => {
                      if (field.key === 'pin') {
                        setEditValue(e.target.value.replace(/\D/g, '').slice(0, 6));
                      } else if (field.key === 'phone') {
                        setEditValue(e.target.value.replace(/\D/g, '').slice(0, 10));
                      } else {
                        setEditValue(e.target.value);
                      }
                    }}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(field.key)}
                    autoFocus
                  />
                )}
                <button onClick={() => saveEdit(field.key)} className="btn-primary px-3 py-2">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={cancelEdit} className="btn-secondary px-3 py-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-900 mt-0.5">
                {field.value || <span className="text-gray-400 italic text-xs">Not set — tap Edit to add</span>}
              </div>
            )}
          </div>
        ))}

        {/* Phone — read only */}
        {/* Location — editable */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <Navigation className="w-3.5 h-3.5" /> {t('Location')}
            </div>
            {!editingLocation && (
              <button
                onClick={() => setEditingLocation(true)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
              >
                <Edit2 className="w-3 h-3" /> {t('Edit')}
              </button>
            )}
          </div>

          {editingLocation ? (
            <div className="space-y-3 mt-2">
              <div>
                <input
                  className="input w-full"
                  placeholder="e.g. Vaishali Nagar, Ajmer"
                  value={locationData.locationName}
                  onChange={e => setLocationData(prev => ({ ...prev, locationName: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGetLocation}
                  disabled={loadingLocation}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-4 h-4" />
                  {loadingLocation ? 'Getting...' : t('Get GPS Location')}
                </button>
              </div>
              {locationData.latitude && locationData.longitude && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  ✓ Location captured ({locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)})
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={saveLocation} className="btn-primary flex-1">
                  <Check className="w-4 h-4" /> {t('Save')}
                </button>
                <button onClick={() => setEditingLocation(false)} className="btn-secondary flex-1">
                  <X className="w-4 h-4" /> {t('Cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5">
              {locationData.locationName ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">{locationData.locationName}</div>
                  {locationData.latitude && locationData.longitude && (
                    <div className="text-xs text-gray-400">
                      GPS: {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic text-xs">Not set — tap Edit to add location</span>
              )}
            </div>
          )}
        </div>

        {/* Payment QR Code - distributor only */}
        {isDistributor && distProfile && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              <UploadCloud className="w-3.5 h-3.5" />
              {t('Payment QR Code')}
            </div>
            
            {distProfile.paymentQrUrl ? (
              <div className="space-y-3">
                <img 
                  src={distProfile.paymentQrUrl} 
                  alt="Payment QR" 
                  className="w-32 h-32 object-contain rounded-lg border border-gray-200"
                />
                <div className="flex gap-2">
                  <label className="btn-secondary flex-1 cursor-pointer text-center flex items-center justify-center gap-1">
                    <UploadCloud className="w-4 h-4" />
                    {uploadingQr ? 'Uploading...' : t('Replace QR')}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleQrUpload} 
                      disabled={uploadingQr}
                    />
                  </label>
                  <button 
                    onClick={handleRemoveQr} 
                    className="btn-secondary flex-1 text-red-600 hover:bg-red-50 hover:border-red-200"
                    disabled={uploadingQr}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('Remove')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {uploadingQr ? 'Uploading...' : t('Upload Payment QR Code')}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {t('Shopkeepers can scan this to pay you')}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleQrUpload} 
                    disabled={uploadingQr}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Connection code — distributor only */}
        {isDistributor && distProfile && (
          <>
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {t('Connection Code')}
              </div>
              <div className="flex items-center justify-between">
                <div className="font-mono font-bold text-brand-600 text-lg tracking-wider">
                  {distProfile.connectionCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(distProfile.connectionCode || '');
                    show(t('Connection code copied to clipboard!'));
                  }}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                >
                  <Copy className="w-3.5 h-3.5" /> {t('Copy Code')}
                </button>
              </div>
            </div>

            {/* Products Count */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                <Package className="w-3.5 h-3.5" />
                {t('Products in Catalog')}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {products.filter(p => p.distributorId === distProfile.id).length} {t('items')}
                <span className="text-gray-400 ml-2">
                  ({products.filter(p => p.distributorId === distProfile.id && p.available).length} available)
                </span>
              </div>
            </div>

            {/* Connected Shopkeepers */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                <Users className="w-3.5 h-3.5" />
                {t('Connected Shopkeepers')}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {connections.filter(c => c.distributorId === distProfile.id && c.status === 'active').length} active
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="card divide-y divide-gray-100 mb-4">
        {isDistributor && (
          <button onClick={() => navigate('/distributor/settings')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-medium text-gray-700">{t('Order Window Settings')}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <button
          onClick={() => navigate(isDistributor ? '/distributor/notifications' : '/shop/notifications')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">{t('Notifications')}</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      {isDistributor && distProfile && (
        <button onClick={handleShareProfile}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors font-medium mb-4">
          <Share2 className="w-5 h-5" /> {t('Share Profile')}
        </button>
      )}

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium">
        <LogOut className="w-4 h-4" /> {t('Logout')}
      </button>

      {/* Delete Account */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-4 text-gray-500 hover:text-red-600 transition-colors font-medium text-sm">
            {t('Delete Account')}
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center animate-fade-in">
            <h3 className="text-red-800 font-semibold mb-2">{t('Are you absolutely sure?')}</h3>
            <p className="text-xs text-red-600 mb-4">{t('This action cannot be undone. All your account data will be permanently deleted.')}</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                {t('Yes, Delete')}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white text-gray-700 border border-gray-300 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                {t('Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
