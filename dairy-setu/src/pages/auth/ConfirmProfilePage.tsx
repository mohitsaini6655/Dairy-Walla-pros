import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../../components/ui/Toast";
import { getCurrentLocation, getCoordinatesFromLocation } from "../../utils/location";
import { auth as firebaseAuth } from "../../lib/firebase";
import { apiClient } from "../../lib/apiClient";
import { BrandLogo } from "../../components/ui/BrandLogo";
import type { DistributorType, Role } from "../../types";
import { isSpamPhone } from "../../utils/validation";

type Step = "verifying" | "profile" | "done" | "error";
const COMPANIES = ["Amul", "Saras", "Mother Dairy", "Parag", "Local Brand", "Multiple Brands"];
const DELIVERY_TIMINGS = ["Morning (6-9 AM)", "Afternoon (12-3 PM)", "Evening (5-8 PM)", "Any Time"];
const DISTRIBUTOR_TYPES: Array<{
  value: DistributorType;
  label: string;
  subtitle: string;
  emoji: string;
  tone: string;
}> = [
  { value: "dairy", label: "Dairy Products", subtitle: "Milk, paneer, ghee", emoji: "🥛", tone: "bg-blue-50 text-blue-700" },
  { value: "icecream", label: "Ice Cream", subtitle: "Kulfi, cone, cups", emoji: "🍦", tone: "bg-pink-50 text-pink-700" },
  { value: "dual", label: "Both", subtitle: "Dairy + Ice Cream", emoji: "🥛🍦", tone: "bg-emerald-50 text-emerald-700" },
];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${hour.toString().padStart(2, "0")}:${minute}`;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? "AM" : "PM";
  return { value, label: `${hour12}:${minute} ${period}` };
});

export function ConfirmProfilePage() {
  const [step, setStep] = useState<Step>("verifying");
  const [searchParams] = useSearchParams();
  const queryRole = searchParams.get("role");
  const pendingRole = localStorage.getItem("dairy-walla-pending-role");
  const queryDistributorType = searchParams.get("type");
  const pendingDistributorType = localStorage.getItem("dairy-walla-pending-distributor-type");
  const role: Role = queryRole === "distributor" || queryRole === "shopkeeper"
    ? queryRole
    : (pendingRole === "distributor" || pendingRole === "shopkeeper" ? pendingRole : "shopkeeper");
  const initialDistributorType: DistributorType =
    queryDistributorType === "dairy" || queryDistributorType === "icecream" || queryDistributorType === "dual"
      ? queryDistributorType
      : pendingDistributorType === "dairy" || pendingDistributorType === "icecream" || pendingDistributorType === "dual"
        ? pendingDistributorType
        : "dairy";
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [company, setCompany] = useState("");
  const [distributorType, setDistributorType] = useState<DistributorType>(initialDistributorType);
  const [city, setCity] = useState("");
  const [deliveryAreas, setDeliveryAreas] = useState("");
  const [orderStart, setOrderStart] = useState("18:00");
  const [orderCutoff, setOrderCutoff] = useState("20:00");
  const [shopName, setShopName] = useState("");
  const [shopOwnerName, setShopOwnerName] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [deliveryTiming, setDeliveryTiming] = useState("");
  const [locationName, setLocationName] = useState("");
  const [phone, setPhone] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    const manualToken = localStorage.getItem('dairy-walla-manual-token');
    if (manualToken) {
      const checkManualUser = async () => {
        try {
          const res = await apiClient.post("/auth/me", {});
          if (res.data.needsSetup) {
            if (alive) setStep("profile");
            return;
          }
          const { profile } = res.data;
          if (profile.role !== "distributor" && profile.role !== "shopkeeper") {
            if (alive) setStep("error");
            return;
          }
          const resolvedRole: Role = profile.role;

          useAuthStore.setState({
            user: { name: profile.name || "", role: resolvedRole, phone: profile.phone, id: profile.id, email: profile.email },
            isAuthenticated: true
          });
          localStorage.setItem('dairy-walla-active-role', resolvedRole);
          localStorage.removeItem("dairy-walla-pending-role");
          localStorage.removeItem("dairy-walla-pending-distributor-type");

          const targetPath = resolvedRole === "distributor" ? "/distributor" : "/shop";
          navigate(targetPath, { replace: true });
        } catch (_e) {
          if (alive) setStep("error");
        }
      };
      void checkManualUser();
      return;
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (fUser) => {
      if (!fUser) {
        if (alive) setStep("error");
        return;
      }
      const email = fUser.email;
      if (!email) {
        if (alive) setStep("error");
        return;
      }
      try {
        const token = await fUser.getIdToken(true);
        const res = await apiClient.post("/auth/me", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.needsSetup) {
          if (alive) setStep("profile");
          return;
        }
        const { profile } = res.data;
        if (profile.role !== "distributor" && profile.role !== "shopkeeper") {
          if (alive) setStep("error");
          return;
        }
        const resolvedRole: Role = profile.role;
        
        useAuthStore.setState({
          user: { name: profile.name || "", role: resolvedRole, phone: profile.phone, id: profile.id, email: profile.email },
          isAuthenticated: true
        });
        localStorage.setItem('dairy-walla-active-role', resolvedRole);
        localStorage.removeItem("dairy-walla-pending-role");
        localStorage.removeItem("dairy-walla-pending-distributor-type");

        const targetPath = resolvedRole === "distributor" ? "/distributor" : "/shop";
        navigate(targetPath, { replace: true });
      } catch (_e) {
        if (alive) setStep("error");
      }
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const loc = await getCurrentLocation();
      setCoords({ lat: loc.latitude, lon: loc.longitude });
      show("Location captured!");
    } catch {
      const cityVal = role === "distributor" ? city : shopCity;
      if (cityVal) { const c = getCoordinatesFromLocation(cityVal); if (c) setCoords(c); }
    } finally { setLoadingLocation(false); }
  };

  const handleSubmit = async () => {
    const name = role === "distributor" ? ownerName : shopOwnerName;
    const sName = role === "distributor" ? businessName : shopName;
    if (!name.trim()) { show("Owner name is required.", "error"); return; }
    if (!sName.trim()) { show(role === "distributor" ? "Business name is required." : "Shop name is required.", "error"); return; }
    if (isSpamPhone(phone)) { show("Please enter a valid 10-digit Indian mobile number.", "error"); return; }

    setLoading(true);
    try {
      const manualToken = localStorage.getItem('dairy-walla-manual-token');
      let token = '';
      if (manualToken) {
        token = manualToken;
      } else {
        const fUser = firebaseAuth.currentUser;
        if (!fUser) {
          show("Session expired. Please log in again.", "error");
          navigate("/login");
          return;
        }
        token = await fUser.getIdToken(true);
      }

      const res = await apiClient.post("/auth/setup", {
        phone,
        role,
        name,
        businessData: role === "distributor" ? {
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          distributorType,
          company,
          city: city.trim(),
          deliveryAreas: deliveryAreas.trim(),
          orderWindowStart: orderStart,
          orderWindowCutoff: orderCutoff,
          locationName: locationName.trim(),
          latitude: coords?.lat,
          longitude: coords?.lon,
          profileComplete: true
        } : null,
        shopData: role === "shopkeeper" ? {
          shopName: shopName.trim(),
          ownerName: shopOwnerName.trim(),
          city: shopCity.trim(),
          deliveryTiming,
          locationName: locationName.trim(),
          latitude: coords?.lat,
          longitude: coords?.lon,
          profileComplete: true
        } : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const p = res.data.profile;
      useAuthStore.setState({
        user: { name: p.name || "", role: p.role as Role, phone: p.phone, id: p.id, email: p.email },
        isAuthenticated: true
      });
      localStorage.setItem('dairy-walla-active-role', p.role);
      localStorage.removeItem("dairy-walla-pending-role");
      localStorage.removeItem("dairy-walla-pending-distributor-type");

      setStep("done");
      setTimeout(() => {
        const pendingConnect = localStorage.getItem('dairy-walla-pending-connect');
        if (pendingConnect && p.role === 'shopkeeper') {
           navigate(`/shop/connection?code=${pendingConnect}`);
           localStorage.removeItem('dairy-walla-pending-connect');
        } else {
           navigate(p.role === "distributor" ? "/distributor" : "/shop");
        }
      }, 1500);
    } catch (err) {
      let msg = "Profile save failed";
      if (axios.isAxiosError(err)) {
        msg = (err.response?.data as { error?: string } | undefined)?.error || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-gray-200 shadow-sm p-2 mb-3">
            <BrandLogo className="w-full h-full rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DairyWalla</h1>
        </div>

        {/* Verifying */}
        {step === "verifying" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">Verifying account status...</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h2>
            <p className="text-sm text-gray-500 mb-5">Profile setup session has expired.</p>
            <button onClick={() => navigate("/login")}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              Log In to Complete Setup
            </button>
          </div>
        )}

        {/* Profile setup */}
        {step === "profile" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="text-xs text-gray-500">Selected Role</div>
              <div className="font-semibold text-gray-900 capitalize">{role}</div>
            </div>



            <h2 className="text-lg font-semibold text-gray-900 mb-4">{role === "distributor" ? "Business Details" : "Shop Details"}</h2>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {role === "distributor" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Distributor Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DISTRIBUTOR_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setDistributorType(type.value)}
                          className={`relative border rounded-2xl p-3 text-left transition-colors min-h-[118px] ${
                            distributorType === type.value
                              ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center ${
                              distributorType === type.value
                                ? "border-brand-500 bg-brand-500"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {distributorType === type.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center text-lg ${type.tone}`}>
                            {type.emoji}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                          <div className="text-xs text-gray-500 mt-1 leading-snug">{type.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">+91</span>
                      <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Aapka naam" value={ownerName} onChange={e => setOwnerName(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Sharma Dairy" value={businessName} onChange={e => setBusinessName(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand / Company</label>
                    <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={company} onChange={e => setCompany(e.target.value)}>
                      <option value="">Select...</option>{COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Ajmer" value={city} onChange={e => setCity(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Delivery Areas</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Vaishali Nagar, Civil Lines" value={deliveryAreas} onChange={e => setDeliveryAreas(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order Start</label>
                      <select
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        value={orderStart}
                        onChange={e => setOrderStart(e.target.value)}
                      >
                        {TIME_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order Cutoff</label>
                      <select
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        value={orderCutoff}
                        onChange={e => setOrderCutoff(e.target.value)}
                      >
                        {TIME_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">+91</span>
                      <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} />
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Aapka naam" value={shopOwnerName} onChange={e => setShopOwnerName(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Patel General Store" value={shopName} onChange={e => setShopName(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Ajmer" value={shopCity} onChange={e => setShopCity(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Delivery Timing</label>
                    <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={deliveryTiming} onChange={e => setDeliveryTiming(e.target.value)}>
                      <option value="">Select...</option>{DELIVERY_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <input className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2" placeholder="e.g. Vaishali Nagar, Ajmer" value={locationName} onChange={e => setLocationName(e.target.value)} />
                <button type="button" onClick={handleGetLocation} disabled={loadingLocation}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Navigation className="w-4 h-4" />{loadingLocation ? "Getting location..." : "Use Current Location"}
                </button>
                {coords && <p className="text-xs text-green-600 mt-1">✓ Location set</p>}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-5">
              {loading ? "Saving..." : <><span>Complete Setup</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Ready!</h2>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}




