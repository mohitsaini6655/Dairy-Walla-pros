import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin, Phone, User2, Star, PlusCircle, Printer, Download, Share2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import type { Order, PaymentStatus } from '../../types';
import { businessLineLabel, inferBusinessLineFromCategory, toDistributorType } from '../../utils/businessLine';
import { downloadInvoicePdf, printInvoicePdf } from '../../utils/invoicePdf';
import { getInvoiceLanguage, type InvoiceLanguage } from '../../utils/invoiceLanguage';
import { formatInvoiceShareItem, formatItemRate, formatItemTotalQuantity, formatOrderTotalQuantity, formatPackSize } from '../../utils/orderQuantity';
import { ManualBillModal } from './ManualBillModal';

export function ShopkeeperProfilePage() {
  const { shopkeeperId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { connections, orders, shopkeeperProfiles, distributorProfiles, fetchShopkeeperProfileById, updateOrderPaymentStatus, updateOrderStatus, addNotification } = useAppStore();
  const { show } = useToast();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [manualBillOpen, setManualBillOpen] = useState(false);
  const [invoiceLanguage] = useState<InvoiceLanguage>(
    () => getInvoiceLanguage()
  );

  useEffect(() => {
    if (!shopkeeperId) return;
    const existing = shopkeeperProfiles.find(sp => sp.id === shopkeeperId);
    if (!existing) {
      fetchShopkeeperProfileById(shopkeeperId).catch(() => undefined);
    }
  }, [fetchShopkeeperProfileById, shopkeeperId, shopkeeperProfiles]);

  const shopkeeper = shopkeeperProfiles.find(sp => sp.id === shopkeeperId);
  const connection = connections.find(c => c.shopkeeperId === shopkeeperId);
  const shopkeeperPhone = (shopkeeper?.phone || connection?.shopkeeperPhone || '').trim();
  const shopkeeperTel = shopkeeperPhone.replace(/[^\d+]/g, '');

  const myOrdersForShopkeeper = useMemo(() => {
    const base = orders
      .filter(o => o.shopkeeperId === shopkeeperId)
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

    return base.filter(order => {
      const orderDate = new Date(order.placedAt);
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (orderDate < from) return false;
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`);
        if (orderDate > to) return false;
      }
      if (fromTime) {
        const hhmm = format(orderDate, 'HH:mm');
        if (hhmm < fromTime) return false;
      }
      if (toTime) {
        const hhmm = format(orderDate, 'HH:mm');
        if (hhmm > toTime) return false;
      }
      return true;
    });
  }, [orders, shopkeeperId, fromDate, toDate, fromTime, toTime]);

  const canAccess = user?.role === 'distributor' && connection;
  const billableOrders = myOrdersForShopkeeper.filter(o => o.status === 'accepted' || o.status === 'fulfilled');
  const distributorProfile = distributorProfiles.find(dp => dp.userId === user?.id);
  const distributorType = toDistributorType(distributorProfile?.distributorType);
  const dairyBillableOrders = billableOrders.filter(
    order => inferBusinessLineFromCategory(String(order.businessLine || order.items?.[0]?.category || 'other'), order.businessLine) === 'dairy'
  );
  const iceCreamBillableOrders = billableOrders.filter(
    order => inferBusinessLineFromCategory(String(order.businessLine || order.items?.[0]?.category || 'other'), order.businessLine) === 'icecream'
  );
  const paymentStyles: Record<PaymentStatus, string> = {
    paid: 'badge-green',
    unpaid: 'badge-yellow',
  };

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
      show(`Payment marked as ${paymentStatus === 'paid' ? 'Received' : 'Due'}`);
    } catch {
      show('Payment status could not be saved. Check DB migration.', 'error');
    }
  };

  const handleDownload = async (order: Order) => {
    const distributor = distributorProfiles.find(dp => dp.userId === user?.id);
    if (!distributor) {
      show('Distributor profile missing. Please complete profile first.', 'error');
      return;
    }
    try {
      const shopkeeperPhone = shopkeeper?.phone || connection?.shopkeeperPhone;
      const shopkeeperEmail = shopkeeper?.email;
      await downloadInvoicePdf({
        order,
        distributor,
        shopkeeper,
        distributorPhone: distributor.phone || user?.phone,
        distributorEmail: distributor.email || user?.email,
        shopkeeperPhone,
        shopkeeperEmail,
        language: invoiceLanguage,
      });
      show('Invoice PDF downloaded');
    } catch {
      show('Invoice could not be generated. Please retry.', 'error');
    }
  };

  const handlePrint = async (order: Order) => {
    const distributor = distributorProfiles.find(dp => dp.userId === user?.id);
    if (!distributor) {
      show('Distributor profile missing. Please complete profile first.', 'error');
      return;
    }
    const printWindow = window.open('', '_blank');
    try {
      await printInvoicePdf({
        order,
        distributor,
        shopkeeper,
        distributorPhone: distributor.phone || user?.phone,
        distributorEmail: distributor.email || user?.email,
        shopkeeperPhone: shopkeeper?.phone || connection?.shopkeeperPhone,
        shopkeeperEmail: shopkeeper?.email,
        language: invoiceLanguage,
      }, printWindow);
      show('Print bill opened');
    } catch {
      printWindow?.close();
      show('Could not open print window. Please retry.', 'error');
    }
  };

  const handleShare = (order: Order) => {
    const text = `Invoice\n\nShop: ${order.shopName}\nDate: ${format(new Date(order.placedAt), 'dd MMM yyyy')}\nTotal Qty: ${formatOrderTotalQuantity(order.items)}\n\nItems:\n${order.items.map(formatInvoiceShareItem).join('\n')}\n\nTotal: ₹${order.total.toLocaleString()}`;
    if (navigator.share) {
      navigator.share({ title: 'Invoice', text });
    } else {
      navigator.clipboard.writeText(text);
      show('Invoice copied to clipboard');
    }
  };

  if (!canAccess) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <button onClick={() => navigate('/distributor/connections')} className="text-sm text-brand-600 hover:underline">
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Shopkeepers
        </button>
        <div className="card p-6 mt-4">
          <h1 className="font-semibold text-gray-900 mb-1">Shopkeeper not found</h1>
          <p className="text-sm text-gray-500">You do not have access to this shopkeeper profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <MobileHeader title={connection.shopName} subtitle={`Orders: ${myOrdersForShopkeeper.length}`} />
      <button onClick={() => navigate('/distributor/connections')} className="text-sm text-brand-600 hover:underline mb-3 md:hidden">
        <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Shopkeepers
      </button>

      <div className="hidden md:block mb-5">
        <button onClick={() => navigate('/distributor/connections')} className="text-sm text-brand-600 hover:underline mb-3">
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Shopkeepers
        </button>
        <h1 className="text-xl font-bold text-gray-900">{connection.shopName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Shopkeeper profile and complete order history</p>
      </div>

      {/* Rank Badge */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-center justify-between shadow-sm animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-blue-100 p-2.5 rounded-full">
            <Star className="text-yellow-500 fill-yellow-500" size={24} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Global Buyer Rank</h3>
            <p className="text-xl font-extrabold text-gray-900">#12</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-600 font-medium">Top 5% on DairyWalla</p>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Basic Details</h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700"><User2 className="w-4 h-4 text-gray-400" /> {connection.shopkeeperName}</div>
          <div className="flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4 text-gray-400" /> {shopkeeper?.address || shopkeeper?.city || 'Address not added'}</div>
          <div className="flex items-center gap-2 text-gray-700"><Clock className="w-4 h-4 text-gray-400" /> {shopkeeper?.deliveryTiming || 'Delivery timing not added'}</div>
          <div className="flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4 text-gray-400" /> {shopkeeper?.locationName || 'Location not added'}</div>
          {shopkeeperPhone && (
            <div className="md:col-span-2 flex items-center justify-between gap-3 text-gray-700">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{shopkeeperPhone}</span>
              </div>
              <a href={`tel:${shopkeeperTel}`} className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Filter Orders</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <label className="text-xs text-gray-600">
            From Date
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-gray-600">
            To Date
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-gray-600">
            From Time
            <input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-gray-600">
            To Time
            <input type="time" value={toTime} onChange={e => setToTime(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm" />
          </label>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">Generate Bill (Separate)</h2>
          <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => setManualBillOpen(true)}>
            <PlusCircle className="w-3.5 h-3.5" /> Generate Order Bill
          </button>
        </div>

        {billableOrders.length === 0 ? (
          <p className="text-sm text-gray-500">Invoices can be generated here once orders are accepted.</p>
        ) : distributorType === 'dual' ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Dairy Product Bills</div>
              {dairyBillableOrders.length === 0 ? (
                <div className="text-xs text-gray-500">No dairy bills yet.</div>
              ) : (
                <div className="space-y-2">
                  {dairyBillableOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Order #{order.id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-500">{format(new Date(order.placedAt), 'dd MMM yyyy, hh:mm a')} · ₹{order.total.toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        Generate Bill
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Ice Cream Bills</div>
              {iceCreamBillableOrders.length === 0 ? (
                <div className="text-xs text-gray-500">No ice cream bills yet.</div>
              ) : (
                <div className="space-y-2">
                  {iceCreamBillableOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Order #{order.id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-500">{format(new Date(order.placedAt), 'dd MMM yyyy, hh:mm a')} · ₹{order.total.toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        Generate Bill
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {billableOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <div className="text-sm font-medium text-gray-900">Order #{order.id.slice(0, 8)}</div>
                  <div className="text-xs text-gray-500">{format(new Date(order.placedAt), 'dd MMM yyyy, hh:mm a')} · ₹{order.total.toLocaleString()}</div>
                </div>
                <button
                  onClick={() => setSelectedInvoiceOrder(order)}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  Generate Bill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-brand-600" />
          All Orders (Date-wise sequence)
        </h2>
        {myOrdersForShopkeeper.length === 0 ? (
          <div className="card p-5 text-sm text-gray-500">No orders found for this filter.</div>
        ) : (
          <div className="space-y-3">
            {myOrdersForShopkeeper.map(order => (
              <div key={order.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500 mt-1">{format(new Date(order.placedAt), 'dd MMM yyyy, hh:mm a')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Status: {order.status === 'fulfilled' ? 'accepted' : order.status} - Type: {order.type}
                      <span className="ml-2">Section: {businessLineLabel(inferBusinessLineFromCategory(String(order.businessLine || order.items?.[0]?.category || 'other'), order.businessLine))}</span>
                      {order.status !== 'rejected' && (
                        <span className={`ml-2 ${paymentStyles[order.paymentStatus]}`}>
                          {order.paymentStatus === 'paid' ? 'Payment Received' : 'Payment Due'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₹{order.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{order.items.length} items</div>
                    {order.status === 'pending' && (
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => handleAccept(order)} className="btn-primary py-1 px-2.5 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 inline" /> Accept
                        </button>
                        <button onClick={() => handleReject(order)} className="btn-danger py-1 px-2.5 text-xs">
                          <XCircle className="w-3.5 h-3.5 mr-1 inline" /> Reject
                        </button>
                      </div>
                    )}
                    {order.status === 'accepted' && (
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => handleFulfill(order)} className="btn-primary py-1 px-2.5 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 inline" /> Mark Fulfilled
                        </button>
                      </div>
                    )}
                    {order.status !== 'rejected' && (
                      <div className="flex justify-end gap-2 mt-2">
                        {order.paymentStatus === 'paid' ? (
                          <span className="py-1 px-2.5 text-xs rounded-lg border bg-green-100 border-green-300 text-green-700">
                            Payment Locked
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePaymentStatus(order, 'paid')}
                            className="py-1 px-2.5 text-xs rounded-lg border bg-white border-green-200 text-green-700 hover:bg-green-50"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} title="Invoice Preview" size="lg">
        {selectedInvoiceOrder && (
          <div className="space-y-4">
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <div className="font-bold text-lg text-gray-900">{connection.businessName}</div>
                <div className="text-sm text-gray-500">Invoice</div>
                <div className="text-xs text-gray-500">
                  {businessLineLabel(
                    inferBusinessLineFromCategory(String(selectedInvoiceOrder.businessLine || selectedInvoiceOrder.items?.[0]?.category || 'other'), selectedInvoiceOrder.businessLine)
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">#{selectedInvoiceOrder.id.slice(-6).toUpperCase()}</div>
                <div className="text-xs text-gray-500">{format(new Date(selectedInvoiceOrder.placedAt), 'dd MMM yyyy')}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Bill To</div>
              <div className="font-semibold text-gray-900 text-sm">{selectedInvoiceOrder.shopName}</div>
              <div className="text-xs text-gray-500">{selectedInvoiceOrder.shopkeeperName}</div>
              <div className="text-xs text-gray-500 mt-1">{shopkeeper?.address || shopkeeper?.city || 'Address not provided'}</div>
              <div className="text-xs text-gray-500">Phone: {shopkeeper?.phone || connection?.shopkeeperPhone || 'Not provided'}</div>
              <div className="text-xs text-gray-500">Email: {shopkeeper?.email || 'Not provided'}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500">Product</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Total Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Rate</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {selectedInvoiceOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-xs text-gray-400">{item.brand} - {formatPackSize(item.unit)}</div>
                    </td>
                    <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-700">{formatItemTotalQuantity(item.unit, item.quantity)}</td>
                    <td className="py-2 text-right text-green-600">{formatItemRate(item.unitPrice, item.unit)}</td>
                    <td className="py-2 text-right font-semibold text-green-600">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100">
                  <td colSpan={4} className="pt-3 text-right font-semibold text-gray-700">Total Qty</td>
                  <td className="pt-3 text-right font-semibold text-gray-900">{formatOrderTotalQuantity(selectedInvoiceOrder.items)}</td>
                </tr>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={4} className="pt-3 text-right font-bold text-gray-900">Total Amount</td>
                  <td className="pt-3 text-right font-bold text-xl text-brand-600">₹{selectedInvoiceOrder.total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <div className="sticky bottom-0 z-10 flex gap-3 bg-white/95 backdrop-blur-sm pt-2 pb-1">
              <button onClick={() => handleDownload(selectedInvoiceOrder)} className="btn-secondary flex-1">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={() => handlePrint(selectedInvoiceOrder)} className="btn-secondary flex-1">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={() => handleShare(selectedInvoiceOrder)} className="btn-primary flex-1">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        )}
      </Modal>
      <ManualBillModal
        open={manualBillOpen}
        onClose={() => setManualBillOpen(false)}
        distributor={distributorProfile}
        initialShopkeeper={{
          shopkeeperId,
          shopName: connection.shopName,
          shopkeeperName: connection.shopkeeperName,
          phone: shopkeeper?.phone || connection.shopkeeperPhone,
          email: shopkeeper?.email,
          address: shopkeeper?.address,
          city: shopkeeper?.city,
        }}
      />
    </div>
  );
}
