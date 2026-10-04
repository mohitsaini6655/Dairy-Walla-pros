import { useState } from 'react';
import { CheckCircle, XCircle, Package, PlusCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { format } from 'date-fns';
import type { Order, OrderStatus, PaymentStatus } from '../../types';
import { ManualBillModal } from './ManualBillModal';

const statusColors: Record<OrderStatus, string> = {
  pending: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
  fulfilled: 'badge-blue',
  cancelled: 'badge-red',
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  fulfilled: 'Accepted',
  cancelled: 'Cancelled',
};

const paymentLabels: Record<PaymentStatus, string> = {
  paid: 'Payment Received',
  unpaid: 'Payment Due',
};

const paymentColors: Record<PaymentStatus, string> = {
  paid: 'badge-green',
  unpaid: 'badge-yellow',
};

export function OrdersPage() {
  const { user } = useAuthStore();
  const { orders, distributorProfiles, updateOrderStatus, updateOrderPaymentStatus, addNotification } = useAppStore();
  const { show } = useToast();
  const [filter, setFilter] = useState<'all' | 'normal' | 'late'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [businessLineFilter, setBusinessLineFilter] = useState<'all' | 'dairy' | 'icecream'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manualBillOpen, setManualBillOpen] = useState(false);

  const profile = distributorProfiles.find(dp => dp.userId === user?.id);
  const myOrders = orders.filter(o => o.distributorId === profile?.id);

  const filtered = myOrders.filter(o => {
    if (filter !== 'all' && o.type !== filter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'accepted') {
        if (o.status !== 'accepted' && o.status !== 'fulfilled') return false;
      } else if (o.status !== statusFilter) {
        return false;
      }
    }
    if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
    
    if (businessLineFilter !== 'all') {
      let line = o.businessLine;
      if (!line && o.items && o.items.length > 0) {
        line = o.items[0].businessLine;
        if (!line) {
          const text = `${o.items[0].category || ''} ${o.items[0].productName || ''}`.toLowerCase();
          line = text.includes('ice') || text.includes('cream') || text.includes('kulfi') ? 'icecream' : 'dairy';
        }
      }
      if ((line || 'dairy') !== businessLineFilter) return false;
    }
    
    return true;
  });

  const handleAccept = (order: Order) => {
    if (!window.confirm('Are you sure you want to accept this order?')) return;
    updateOrderStatus(order.id, 'accepted');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_accepted',
        message: 'Your order has been accepted',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Order from ${order.shopName} accepted`);
  };

  const handleFulfill = (order: Order) => {
    if (!window.confirm('Has this order been delivered?')) return;
    updateOrderStatus(order.id, 'fulfilled');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_fulfilled',
        message: 'Your order has been fulfilled',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Order from ${order.shopName} marked as fulfilled`);
  };

  const handleReject = (order: Order) => {
    if (!window.confirm('Are you sure you want to reject this order?')) return;
    updateOrderStatus(order.id, 'rejected');
    if (order.shopkeeperId) {
      addNotification({
        userId: order.shopkeeperId,
        type: 'order_rejected',
        message: 'Your order was not accepted',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show('Order rejected', 'error');
  };

  const handlePaymentStatus = async (order: Order, paymentStatus: PaymentStatus) => {
    if (order.paymentStatus === 'paid' && paymentStatus === 'unpaid') {
      show('Payment once paid cannot be marked unpaid again.', 'error');
      return;
    }
    if (paymentStatus === 'paid') {
      if (!window.confirm('Are you sure you want to mark this payment as received? This action cannot be undone.')) {
        return;
      }
    }
    try {
      await updateOrderPaymentStatus(order.id, paymentStatus);
      show(`Payment marked as ${paymentStatus === 'paid' ? 'Received' : 'Due'} for ${order.shopName}`);
    } catch {
      show('Payment status could not be saved. Check DB migration.', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <MobileHeader title="All Orders" subtitle={`${myOrders.length} total orders`} />
      <div className="hidden md:flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{myOrders.length} total orders</p>
        </div>
        <button className="btn-primary" onClick={() => setManualBillOpen(true)}>
          <PlusCircle className="w-4 h-4" /> Generate Order Bill
        </button>
      </div>
      <div className="md:hidden mb-4">
        <button className="btn-primary w-full justify-center" onClick={() => setManualBillOpen(true)}>
          <PlusCircle className="w-4 h-4" /> Generate Order Bill
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'normal', 'late'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All Types' : f === 'normal' ? 'Normal' : 'Late'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                statusFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All Status' : statusLabels[f as OrderStatus]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'paid', 'unpaid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setPaymentFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                paymentFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All Payments' : f === 'paid' ? 'Payment Received' : 'Payment Due'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'dairy', 'icecream'] as const).map(f => (
            <button
              key={f}
              onClick={() => setBusinessLineFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                businessLineFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All Products' : f === 'dairy' ? 'Dairy 🥛' : 'Ice Cream 🍦'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No orders found"
          description="Try changing the filters"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <div key={order.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{order.shopName}</span>
                    <span className={statusColors[order.status]}>{statusLabels[order.status]}</span>
                    {order.status !== 'rejected' && <span className={paymentColors[order.paymentStatus]}>{paymentLabels[order.paymentStatus]}</span>}
                    <span className={order.type === 'late' ? 'badge-yellow' : 'badge-green'}>
                      {order.type === 'late' ? 'Late' : 'Normal'}
                    </span>
                    {order.source === 'whatsapp' && <span className="badge bg-green-100 text-green-700">WhatsApp</span>}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {order.shopkeeperName} - {format(new Date(order.placedAt), 'dd MMM, h:mm a')}
                    {order.deliveryGroupName && ` - ${order.deliveryGroupName}`}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>₹{order.total.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{order.items.length} items</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {order.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(order)} className="btn-primary py-1.5 px-3 text-xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleReject(order)} className="btn-danger py-1.5 px-3 text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {order.status === 'accepted' && (
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => handleFulfill(order)} className="btn-primary py-1.5 px-3 text-xs w-full justify-center">
                        <CheckCircle className="w-3.5 h-3.5 mr-1 inline-block" /> Mark as Delivered
                      </button>
                    </div>
                  )}
                  {order.status !== 'rejected' && (
                    <div className="flex gap-2">
                      {order.paymentStatus === 'paid' ? (
                        <span className="py-1.5 px-3 text-xs rounded-lg border bg-green-100 border-green-300 text-green-700">
                          Payment Locked
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePaymentStatus(order, 'paid')}
                          className="py-1.5 px-3 text-xs rounded-lg border transition-colors bg-white border-green-200 text-green-700 hover:bg-green-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {expandedId === order.id ? 'Hide' : 'View'} items
                  </button>
                </div>
              </div>
              {order.status === 'cancelled' && (
                <div className="mt-2 p-2 bg-red-50 rounded text-red-600 text-xs font-medium">
                  Order Cancelled: {order.cancelReason || 'No reason provided'}
                </div>
              )}
              {expandedId === order.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left pb-2 font-medium">Product</th>
                        <th className="text-right pb-2 font-medium">Qty</th>
                        <th className="text-right pb-2 font-medium">Price</th>
                        <th className="text-right pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {order.items.map(item => (
                        <tr key={item.id} className={order.status === 'cancelled' ? 'opacity-50' : ''}>
                          <td className={`py-1.5 text-gray-700 ${order.status === 'cancelled' ? 'line-through' : ''}`}>{item.productName} <span className="text-gray-400">({item.brand})</span></td>
                          <td className={`py-1.5 text-right text-gray-700 ${order.status === 'cancelled' ? 'line-through' : ''}`}>{item.quantity} {item.unit}</td>
                          <td className={`py-1.5 text-right ${order.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-green-600'}`}>₹{item.unitPrice}</td>
                          <td className={`py-1.5 text-right font-medium ${order.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>₹{item.unitPrice * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td colSpan={3} className="pt-2 text-right font-semibold text-gray-700">Total</td>
                        <td className="pt-2 text-right font-bold text-gray-900">₹{order.total.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ManualBillModal
        open={manualBillOpen}
        onClose={() => setManualBillOpen(false)}
        distributor={profile}
      />
    </div>
  );
}
