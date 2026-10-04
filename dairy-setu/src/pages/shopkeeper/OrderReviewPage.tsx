import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { businessLineLabel, inferBusinessLineFromCategory } from '../../utils/businessLine';

export function OrderReviewPage() {
  const { user } = useAuthStore();
  const { cart, connections, distributorProfiles, shopkeeperProfiles, placeOrder, clearCart } = useAppStore();
  const { show } = useToast();
  const navigate = useNavigate();

  const shopProfile = shopkeeperProfiles.find(sp => sp.userId === user?.id);
  const cartDistributorId = cart[0]?.product.distributorId;
  const hasMultipleDistributorsInCart = new Set(cart.map(c => c.product.distributorId)).size > 1;
  const activeConn = connections.find(
    c => c.status === 'active' && c.shopkeeperId === shopProfile?.id && c.distributorId === cartDistributorId
  );
  const distributorProfile = activeConn ? distributorProfiles.find(dp => dp.id === activeConn.distributorId) : null;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isLate = distributorProfile ? currentTime > distributorProfile.orderWindowCutoff : false;

  const total = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const cartBusinessLine = cart[0]
    ? inferBusinessLineFromCategory(String(cart[0].product.category || 'other'), cart[0].product.businessLine)
    : 'dairy';
  const hasMixedBusinessLines = cart.some(
    item => inferBusinessLineFromCategory(String(item.product.category || 'other'), item.product.businessLine) !== cartBusinessLine
  );

  const handleSubmit = () => {
    if (!activeConn || !user) return;
    if (cart.length === 0) { show('Add items to your order', 'error'); return; }
    if (hasMultipleDistributorsInCart) {
      show('Please place order for one distributor at a time', 'error');
      return;
    }
    if (hasMixedBusinessLines) {
      show('Aap ek baar me ya Dairy ya Ice Cream section ka order kar sakte ho.', 'error');
      return;
    }

    placeOrder(
      activeConn.shopkeeperId,
      user.name,
      activeConn.shopName,
      activeConn.distributorId,
      cart,
      isLate,
      cartBusinessLine
    );
    clearCart();
    show(isLate ? 'Late order submitted — awaiting approval' : 'Order placed successfully!');
    navigate('/shop/history');
  };

  if (cart.length === 0) {
    navigate('/shop');
    return null;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <MobileHeader title="Review Order" subtitle={activeConn?.businessName} showBack backTo="/shop" />
      <div className="hidden md:flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/shop')} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Review Order</h1>
          <p className="text-sm text-gray-500">{activeConn?.businessName}</p>
        </div>
      </div>

      {/* Late order warning */}
      {isLate && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-800 text-sm">Late Order</div>
            <div className="text-xs text-yellow-700 mt-0.5">
              The order window closed at {distributorProfile?.orderWindowCutoff}. This order will be sent as a late order and requires distributor approval.
            </div>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="card mb-4">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Order Items ({cart.length})</h2>
          <div className="text-xs text-gray-500 mt-1">Section: {businessLineLabel(cartBusinessLine)}</div>
        </div>
        <div className="divide-y divide-gray-50">
          {cart.map(item => (
            <div key={item.product.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm">{item.product.name}</div>
                <div className="text-xs text-gray-500">{item.product.brand} · {item.product.unit}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">{item.quantity} × ₹{item.product.price}</div>
                <div className="text-xs text-green-600 font-medium">₹{(item.product.price * item.quantity).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-xl text-brand-600">₹{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Delivery info */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Delivery</span>
        </div>
        <div className="text-sm text-gray-600">
          {isLate ? 'Tomorrow (if approved)' : 'Tomorrow morning'}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {isLate ? (
            <span className="text-yellow-600">⏰ Late order — distributor will review</span>
          ) : (
            <span className="text-green-600">✓ Guaranteed delivery</span>
          )}
        </div>
      </div>

      <button className="btn-primary w-full py-3 text-base" onClick={handleSubmit}>
        {isLate ? (
          <><AlertTriangle className="w-4 h-4" /> Submit Late Order</>
        ) : (
          <><CheckCircle className="w-4 h-4" /> Place Order</>
        )}
      </button>
    </div>
  );
}
