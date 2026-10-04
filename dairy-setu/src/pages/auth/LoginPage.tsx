import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Store, Truck } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth as firebaseAuth } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import { useAppStore } from "../../store/appStore";
import { useToast } from "../../components/ui/Toast";
import { BrandLogo } from "../../components/ui/BrandLogo";
import type { DistributorType, Role } from "../../types";

const DISTRIBUTOR_TYPES: Array<{
  value: DistributorType;
  label: string;
  subtitle: string;
  emoji: string;
  tone: string;
}> = [
  { value: "dairy", label: "Dairy Products", subtitle: "Milk, paneer, curd", emoji: "🥛", tone: "bg-blue-50 text-blue-700" },
  { value: "icecream", label: "Ice Cream", subtitle: "Cups, bars, kulfi", emoji: "🍦", tone: "bg-pink-50 text-pink-700" },
  { value: "dual", label: "Both", subtitle: "Dairy + Ice Cream", emoji: "🥛🍦", tone: "bg-emerald-50 text-emerald-700" },
];

export function LoginPage() {
  const [role, setRole] = useState<Role>("shopkeeper");
  const [distributorType, setDistributorType] = useState<DistributorType>("dual");
  const [loading, setLoading] = useState(false);

  const { signIn, isAuthenticated, user } = useAuthStore();
  const {
    fetchDistributorProfile,
    fetchShopkeeperProfile,
    fetchAllDistributors,
    fetchConnections,
    fetchProducts,
    fetchOrders,
    fetchNotifications,
    fetchDeliveryGroups,
    runAutoOrdersForDistributor,
  } = useAppStore();
  const { show } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === "distributor" ? "/distributor" : "/shop", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLoginSuccess = async (u: any) => {
    const pendingConnect = localStorage.getItem('dairy-walla-pending-connect');
    if (pendingConnect && u.role === 'shopkeeper') {
       navigate(`/shop/connection?code=${pendingConnect}`);
       localStorage.removeItem('dairy-walla-pending-connect');
    } else {
       navigate(u.role === "distributor" ? "/distributor" : "/shop");
    }

    try {
      if (u.role === "distributor") {
        const dp = await fetchDistributorProfile(u.id);
        if (dp) {
          await Promise.all([
            fetchProducts(dp.id),
            fetchConnections(u.id, "distributor"),
            fetchDeliveryGroups(dp.id),
          ]);
          await runAutoOrdersForDistributor(u.id);
          await fetchOrders(u.id, "distributor");
        }
      } else {
        await fetchShopkeeperProfile(u.id);
        await fetchAllDistributors();
        await Promise.all([
          fetchConnections(u.id, "shopkeeper"),
          fetchOrders(u.id, "shopkeeper"),
        ]);
      }
      await fetchNotifications(u.id);
    } catch (err) {
      console.error("Hydration Error:", err);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(firebaseAuth);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(firebaseAuth, provider);
      const emailVal = result.user.email;
      if (!emailVal) throw new Error("Email not found from Google");

      const loginResult = await signIn(emailVal, role);

      if (loginResult.needsProfile) {
        localStorage.setItem("dairy-walla-pending-role", role);
        if (role === "distributor") {
          localStorage.setItem("dairy-walla-pending-distributor-type", distributorType);
          navigate(`/confirm?role=${role}&type=${distributorType}`);
        } else {
          localStorage.removeItem("dairy-walla-pending-distributor-type");
          navigate(`/confirm?role=${role}`);
        }
        return;
      }

      if (loginResult.user) {
        await handleLoginSuccess(loginResult.user);
      } else if (loginResult.error) {
        show(loginResult.error, "error");
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      show(err.message || "Google Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-gray-200 shadow-sm p-2 mb-3">
            <BrandLogo className="w-full h-full rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DairyWalla</h1>
          <p className="text-gray-500 text-sm mt-1">Smart dairy ordering platform</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-1 leading-none">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Choose role and sign in below</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Login As</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("shopkeeper")}
                  className={`py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    role === "shopkeeper" ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Shopkeeper
                </button>
                <button
                  type="button"
                  onClick={() => setRole("distributor")}
                  className={`py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    role === "distributor" ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Distributor
                </button>
              </div>
            </div>

            {role === "distributor" && (
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
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Continue with Google
                </>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-gray-600 mt-5">
            New user?{" "}
            <Link to="/signup" className="text-brand-600 font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </div>

        <div className="mt-3 bg-white/80 border border-emerald-100 text-emerald-700 rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Trusted by 1000+ Distributors & 5000+ Shopkeepers
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
