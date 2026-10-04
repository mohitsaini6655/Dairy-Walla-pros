import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Share2, PlusCircle, Printer } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { format } from 'date-fns';
import type { Order, DistributorProfile, ShopkeeperProfile } from '../../types';
import { businessLineLabel, inferBusinessLineFromCategory, toDistributorType } from '../../utils/businessLine';
import { downloadInvoicePdf, printInvoicePdf } from '../../utils/invoicePdf';
import { getInvoiceLanguage, type InvoiceLanguage } from '../../utils/invoiceLanguage';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { formatInvoiceShareItem, formatItemRate, formatItemTotalQuantity, formatOrderTotalQuantity, formatPackSize, getPackagingPiecesText } from '../../utils/orderQuantity';
import { ManualBillModal } from './ManualBillModal';

export function InvoicesPage() {
  const { user } = useAuthStore();
  const { orders, distributorProfiles, shopkeeperProfiles, fetchShopkeeperProfileById } = useAppStore();
  const { show } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [manualBillOpen, setManualBillOpen] = useState(false);
  const [invoiceLanguage] = useState<InvoiceLanguage>(
    () => getInvoiceLanguage()
  );

  const isShopkeeper = user?.role === 'shopkeeper';
  const shopkeeperProfile = shopkeeperProfiles.find(sp => sp.userId === user?.id);
  const distributorProfile = distributorProfiles.find(dp => dp.userId === user?.id);
  
  const profile = isShopkeeper ? shopkeeperProfile : distributorProfile;
  const distributorType = toDistributorType(distributorProfile?.distributorType);
  const billableOrders = orders.filter(
    o => (isShopkeeper ? o.shopkeeperId === profile?.id || o.shopkeeperId === user?.id : o.distributorId === profile?.id) && (o.status === 'accepted' || o.status === 'fulfilled')
  );
  const getShopkeeperForOrder = (order: Order) => {
    return (
      shopkeeperProfiles.find(sp => sp.id === order.shopkeeperId || sp.userId === order.shopkeeperId) || null
    );
  };
  const getDistributorForOrder = (order: Order) => {
    return (
      distributorProfiles.find(dp => dp.id === order.distributorId) || null
    );
  };
  const selectedShopkeeper = useMemo(
    () => (selectedOrder ? getShopkeeperForOrder(selectedOrder) : null),
    [selectedOrder, shopkeeperProfiles]
  );

  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        billableOrders
          .map(order => order.shopkeeperId)
          .filter((shopkeeperId): shopkeeperId is string => Boolean(shopkeeperId))
          .filter(shopkeeperId => !shopkeeperProfiles.some(sp => sp.id === shopkeeperId || sp.userId === shopkeeperId))
      )
    );

    if (missingIds.length === 0) return;
    Promise.all(missingIds.map(shopkeeperId => fetchShopkeeperProfileById(shopkeeperId).catch(() => null))).catch(() => undefined);
  }, [billableOrders, shopkeeperProfiles, fetchShopkeeperProfileById]);

  const dairyInvoices = billableOrders.filter(
    order => inferBusinessLineFromCategory(String(order.businessLine || order.items?.[0]?.category || 'other'), order.businessLine) === 'dairy'
  );
  const iceCreamInvoices = billableOrders.filter(
    order => inferBusinessLineFromCategory(String(order.businessLine || order.items?.[0]?.category || 'other'), order.businessLine) === 'icecream'
  );

  const handleDownload = async (order: Order) => {
    if (!profile) {
      show('Profile missing. Please complete profile first.', 'error');
      return;
    }

    try {
      const loadedShopkeeper = isShopkeeper ? (profile as ShopkeeperProfile) : (getShopkeeperForOrder(order) || (order.shopkeeperId ? await fetchShopkeeperProfileById(order.shopkeeperId) : null));
      const orderDistributor = isShopkeeper ? (getDistributorForOrder(order) || distributorProfiles.find(d => d.id === order.distributorId)) : (profile as DistributorProfile);
      
      if (!orderDistributor) {
        show('Distributor info missing for this order.', 'error');
        return;
      }

      const shopkeeperPhone = loadedShopkeeper?.phone;
      const shopkeeperEmail = loadedShopkeeper?.email;
      await downloadInvoicePdf({
        order,
        distributor: orderDistributor as DistributorProfile,
        shopkeeper: loadedShopkeeper as ShopkeeperProfile | null,
        distributorPhone: orderDistributor.phone,
        distributorEmail: orderDistributor.email,
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
    if (!profile) {
      show('Profile missing. Please complete profile first.', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    try {
      const loadedShopkeeper = isShopkeeper ? (profile as ShopkeeperProfile) : (getShopkeeperForOrder(order) || (order.shopkeeperId ? await fetchShopkeeperProfileById(order.shopkeeperId) : null));
      const orderDistributor = isShopkeeper ? (getDistributorForOrder(order) || distributorProfiles.find(d => d.id === order.distributorId)) : (profile as DistributorProfile);

      if (!orderDistributor) {
        printWindow?.close();
        show('Distributor info missing for this order.', 'error');
        return;
      }

      await printInvoicePdf({
        order,
        distributor: orderDistributor as DistributorProfile,
        shopkeeper: loadedShopkeeper as ShopkeeperProfile | null,
        distributorPhone: orderDistributor.phone,
        distributorEmail: orderDistributor.email,
        shopkeeperPhone: loadedShopkeeper?.phone,
        shopkeeperEmail: loadedShopkeeper?.email,
        language: invoiceLanguage,
      }, printWindow);
      show('Print bill opened');
    } catch {
      printWindow?.close();
      show('Could not open print window. Please retry.', 'error');
    }
  };

  const handleShare = async (order: Order) => {
    const orderDistributor = isShopkeeper ? (getDistributorForOrder(order) || distributorProfiles.find(d => d.id === order.distributorId)) : (profile as DistributorProfile);
    const loadedShopkeeper = isShopkeeper ? (profile as ShopkeeperProfile) : (getShopkeeperForOrder(order));
    const text = `Invoice from ${orderDistributor?.businessName || 'Distributor'}\n\nShop: ${order.shopName}\nDate: ${format(new Date(order.placedAt), 'dd MMM yyyy')}\nTotal Qty: ${formatOrderTotalQuantity(order.items)}\n\nItems:\n${order.items.map(formatInvoiceShareItem).join('\n')}\n\nTotal: ₹${order.total.toLocaleString()}`;
    
    try {
      if (navigator.share && orderDistributor) {
        try {
          // Generate PDF Blob
          const { generateInvoicePdfBlob } = await import('../../utils/invoicePdf');
          const pdfBlob = await generateInvoicePdfBlob({
            order,
            distributor: orderDistributor as DistributorProfile,
            shopkeeper: loadedShopkeeper as ShopkeeperProfile | null,
            distributorPhone: orderDistributor.phone,
            distributorEmail: orderDistributor.email,
            shopkeeperPhone: loadedShopkeeper?.phone,
            shopkeeperEmail: loadedShopkeeper?.email,
            language: invoiceLanguage,
          });
          const file = new File([pdfBlob], `Invoice_${order.id.slice(-6)}.pdf`, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Invoice ${order.id.slice(-6)}`,
              text: text,
              files: [file]
            });
            return;
          }
        } catch (err) {
          console.warn("Failed to generate/share PDF, falling back to text share.", err);
        }
      }

      if (navigator.share) {
        await navigator.share({ title: 'Invoice', text });
      } else {
        await navigator.clipboard.writeText(text);
        show('Invoice copied to clipboard');
      }
    } catch (e) {
      console.warn("Share failed:", e);
    }
  };

  const renderInvoiceCard = (order: Order) => (
    <div key={order.id} className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-base leading-tight break-words">{order.shopName}</div>
          <div className="text-xs text-gray-500 mt-1 leading-5">
            {format(new Date(order.placedAt), 'dd MMM yyyy, h:mm a')} - {order.items.length} items
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Total qty: {formatOrderTotalQuantity(order.items)}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Section: {businessLineLabel(
              inferBusinessLineFromCategory(String(order.businessLine || order.items?.[0]?.category || 'other'), order.businessLine)
            )}
          </div>
          <div className="text-lg font-bold text-gray-900 mt-1">₹{order.total.toLocaleString()}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
        <button onClick={() => setSelectedOrder(order)} className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap">
          <FileText className="w-3.5 h-3.5" /> View
        </button>
        <button onClick={() => handleDownload(order)} className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap">
          <Download className="w-3.5 h-3.5" /> PDF
        </button>
        <button onClick={() => handlePrint(order)} className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button onClick={() => handleShare(order)} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <MobileHeader title="Invoices" subtitle={`${billableOrders.length} invoices`} />
      <div className="hidden md:flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{billableOrders.length} invoices</p>
        </div>
        {!isShopkeeper && (
          <button className="btn-primary" onClick={() => setManualBillOpen(true)}>
            <PlusCircle className="w-4 h-4" /> Generate Manual Bill
          </button>
        )}
      </div>
      {!isShopkeeper && (
        <div className="md:hidden mb-4">
          <button className="btn-primary w-full justify-center" onClick={() => setManualBillOpen(true)}>
            <PlusCircle className="w-4 h-4" /> Generate Manual Bill
          </button>
        </div>
      )}


      {billableOrders.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No invoices yet"
          description="Accepted orders will appear here"
        />
      ) : distributorType === 'dual' ? (
        <div className="space-y-5">
          <section>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Dairy Product Bills ({dairyInvoices.length})</h2>
            {dairyInvoices.length === 0 ? (
              <div className="text-xs text-gray-500">No dairy invoices yet.</div>
            ) : (
              <div className="space-y-3">{dairyInvoices.map(renderInvoiceCard)}</div>
            )}
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Ice Cream Bills ({iceCreamInvoices.length})</h2>
            {iceCreamInvoices.length === 0 ? (
              <div className="text-xs text-gray-500">No ice cream invoices yet.</div>
            ) : (
              <div className="space-y-3">{iceCreamInvoices.map(renderInvoiceCard)}</div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-3">{billableOrders.map(renderInvoiceCard)}</div>
      )}

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Invoice Preview" size="lg">
        {selectedOrder && (
          <div className="relative space-y-4">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-56 h-56">
                <BrandLogo className="w-full h-full" />
              </div>
            </div>
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white p-1.5">
                  <BrandLogo className="w-full h-full rounded-lg" />
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-900">
                    {isShopkeeper ? (selectedOrder ? (getDistributorForOrder(selectedOrder)?.businessName || 'Distributor') : 'Distributor') : (profile as DistributorProfile)?.businessName}
                  </div>
                  <div className="text-sm text-gray-500">Invoice</div>
                  <div className="text-xs text-gray-500">
                    {businessLineLabel(
                      inferBusinessLineFromCategory(String(selectedOrder.businessLine || selectedOrder.items?.[0]?.category || 'other'), selectedOrder.businessLine)
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">#{selectedOrder.id.slice(-6).toUpperCase()}</div>
                <div className="text-xs text-gray-500">{format(new Date(selectedOrder.placedAt), 'dd MMM yyyy')}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Bill To</div>
              <div className="font-semibold text-gray-900 text-sm">{selectedOrder.shopName}</div>
              <div className="text-xs text-gray-500">{selectedOrder.shopkeeperName}</div>
              <div className="text-xs text-gray-500 mt-1">{selectedShopkeeper?.address || selectedShopkeeper?.city || 'Address not provided'}</div>
              <div className="text-xs text-gray-500">Phone: {selectedShopkeeper?.phone || 'Not provided'}</div>
              <div className="text-xs text-gray-500">Email: {selectedShopkeeper?.email || 'Not provided'}</div>
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
                {selectedOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-xs text-gray-400">{item.brand} - {formatPackSize(item.unit)}</div>
                    </td>
                    <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-700">
                      {formatItemTotalQuantity(item.unit, item.quantity)}
                      <span className="text-xs text-gray-500 block">
                        {getPackagingPiecesText(item.productName, item.category || '', item.quantity)}
                      </span>
                    </td>
                    <td className="py-2 text-right text-green-600">{formatItemRate(item.unitPrice, item.unit)}</td>
                    <td className="py-2 text-right font-semibold text-green-600">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100">
                  <td colSpan={4} className="pt-3 text-right font-semibold text-gray-700">Total Qty</td>
                  <td className="pt-3 text-right font-semibold text-gray-900">{formatOrderTotalQuantity(selectedOrder.items)}</td>
                </tr>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={4} className="pt-3 text-right font-bold text-gray-900">Total Amount</td>
                  <td className="pt-3 text-right font-bold text-xl text-brand-600">₹{selectedOrder.total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <div className="sticky bottom-0 z-10 flex gap-3 bg-white/95 backdrop-blur-sm pt-2 pb-1">
              <button onClick={() => handleDownload(selectedOrder)} className="btn-secondary flex-1">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button onClick={() => handlePrint(selectedOrder)} className="btn-secondary flex-1">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={() => handleShare(selectedOrder)} className="btn-primary flex-1">
                <Share2 className="w-4 h-4" /> Share via WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>
      <ManualBillModal
        open={manualBillOpen}
        onClose={() => setManualBillOpen(false)}
        distributor={profile as DistributorProfile}
      />
    </div>
  );
}
