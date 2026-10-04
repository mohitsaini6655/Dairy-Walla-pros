import { useEffect, useMemo, useState } from 'react';
import { FileText, Minus, Plus, Search } from 'lucide-react';
import type { DistributorProfile, Order, Product, ShopkeeperProfile } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { downloadInvoicePdf } from '../../utils/invoicePdf';
import {
  businessLineLabel,
  getProductQuantityText,
  inferBusinessLineFromCategory,
  toDistributorType,
} from '../../utils/businessLine';
import { formatItemTotalQuantity, formatOrderTotalQuantity, getPackagingPiecesText } from '../../utils/orderQuantity';

interface InitialShopkeeperBillInfo {
  shopkeeperId?: string | null;
  shopName?: string;
  shopkeeperName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

interface ManualBillModalProps {
  open: boolean;
  onClose: () => void;
  distributor?: DistributorProfile | null;
  initialShopkeeper?: InitialShopkeeperBillInfo | null;
  onCreated?: (order: Order) => void;
}

type QuantityMap = Record<string, number>;

function resolveProductLine(product: Product) {
  return inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
}

export function ManualBillModal({ open, onClose, distributor, initialShopkeeper, onCreated }: ManualBillModalProps) {
  const { user } = useAuthStore();
  const { products, createManualBill } = useAppStore();
  const { show } = useToast();

  const distributorType = toDistributorType(distributor?.distributorType);
  const defaultLine = distributorType === 'icecream' ? 'icecream' : 'dairy';
  const canSelectLine = distributorType === 'dual';

  const [shopName, setShopName] = useState('');
  const [shopkeeperName, setShopkeeperName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [businessLine, setBusinessLine] = useState<'dairy' | 'icecream'>(defaultLine);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [cgstPercent, setCgstPercent] = useState('2.5');
  const [sgstPercent, setSgstPercent] = useState('2.5');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShopName(initialShopkeeper?.shopName || '');
    setShopkeeperName(initialShopkeeper?.shopkeeperName || '');
    setPhone(initialShopkeeper?.phone || '');
    setEmail(initialShopkeeper?.email || '');
    setAddress(initialShopkeeper?.address || '');
    setCity(initialShopkeeper?.city || '');
    setBusinessLine(defaultLine);
    setSearch('');
    setQuantities({});
    setGstEnabled(false);
    setGstNumber(distributor?.gst || '');
    setCgstPercent('2.5');
    setSgstPercent('2.5');
  }, [defaultLine, distributor?.gst, initialShopkeeper, open]);

  const myProducts = useMemo(
    () =>
      products
        .filter(product => product.distributorId === distributor?.id && product.available)
        .map(product => ({ ...product, businessLine: resolveProductLine(product) })),
    [distributor?.id, products]
  );

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return myProducts
      .filter(product => resolveProductLine(product) === businessLine)
      .filter(product => {
        if (!normalizedSearch) return true;
        return (
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.brand.toLowerCase().includes(normalizedSearch) ||
          getProductQuantityText(product.quantity, product.unit).toLowerCase().includes(normalizedSearch)
        );
      });
  }, [businessLine, myProducts, search]);

  const selectedItems = useMemo(
    () =>
      myProducts
        .map(product => ({ product, quantity: Number(quantities[product.id] || 0) }))
        .filter(item => item.quantity > 0),
    [myProducts, quantities]
  );

  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const parsedCgstPercent = gstEnabled ? Math.max(0, Number(cgstPercent || 0)) : 0;
  const parsedSgstPercent = gstEnabled ? Math.max(0, Number(sgstPercent || 0)) : 0;
  const parsedGstPercent = parsedCgstPercent + parsedSgstPercent;
  const cgstAmount = Number.isFinite(parsedCgstPercent) ? selectedTotal * (parsedCgstPercent / 100) : 0;
  const sgstAmount = Number.isFinite(parsedSgstPercent) ? selectedTotal * (parsedSgstPercent / 100) : 0;
  const gstAmount = cgstAmount + sgstAmount;
  const grandTotal = selectedTotal + (gstEnabled ? gstAmount : 0);
  const previewOrderItems = selectedItems.map(item => ({
    id: item.product.id,
    orderId: '',
    productId: item.product.id,
    productName: item.product.name,
    brand: item.product.brand,
    category: item.product.category,
    businessLine: resolveProductLine(item.product),
    unit: item.product.unit,
    unitPrice: item.product.price,
    quantity: item.quantity,
  }));

  const setProductQuantity = (productId: string, quantity: number) => {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    setQuantities(current => {
      if (safeQuantity === 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: safeQuantity };
    });
  };

  const handleCreateBill = async () => {
    if (!distributor) {
      show('Distributor profile missing. Please complete profile first.', 'error');
      return;
    }
    if (!shopName.trim() || !shopkeeperName.trim()) {
      show('Shop name and shopkeeper name are required.', 'error');
      return;
    }
    if (selectedItems.length === 0) {
      show('Please select at least one product for the bill.', 'error');
      return;
    }
    if (
      gstEnabled &&
      (!Number.isFinite(parsedCgstPercent) ||
        !Number.isFinite(parsedSgstPercent) ||
        parsedCgstPercent < 0 ||
        parsedSgstPercent < 0 ||
        parsedGstPercent > 100)
    ) {
      show('CGST and SGST totals must be between 0 and 100.', 'error');
      return;
    }

    setSaving(true);
    try {
      const order = await createManualBill({
        distributorId: distributor.id,
        shopkeeperId: initialShopkeeper?.shopkeeperId || null,
        shopName: shopName.trim(),
        shopkeeperName: shopkeeperName.trim(),
        items: selectedItems.map(item => ({ productId: item.product.id, quantity: item.quantity })),
        gstEnabled,
        gstPercent: parsedGstPercent,
        cgstPercent: parsedCgstPercent,
        sgstPercent: parsedSgstPercent,
        gstNumber: gstNumber.trim(),
      });

      const manualShopkeeper = {
        id: initialShopkeeper?.shopkeeperId || '',
        userId: '',
        shopName: shopName.trim(),
        ownerName: shopkeeperName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
      } as ShopkeeperProfile;

      try {
        await downloadInvoicePdf({
          order,
          distributor,
          shopkeeper: manualShopkeeper,
          distributorPhone: distributor.phone || user?.phone,
          distributorEmail: distributor.email || user?.email,
          shopkeeperPhone: phone.trim() || undefined,
          shopkeeperEmail: email.trim() || undefined,
          gstInfo: {
            enabled: gstEnabled,
            gstNumber: gstNumber.trim() || distributor.gst,
            percent: parsedGstPercent,
            cgstPercent: parsedCgstPercent,
            sgstPercent: parsedSgstPercent,
          },
        });
      } catch (pdfError) {
        console.error('Manual bill PDF error:', pdfError);
        show('Bill saved, but PDF could not be generated. Please retry PDF/Print from Invoices.', 'error');
        onCreated?.(order);
        onClose();
        return;
      }

      show('Manual bill generated');
      onCreated?.(order);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate manual bill. Please retry.';
      show(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Manual Bill" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Shop Name</label>
            <input className="input" value={shopName} onChange={event => setShopName(event.target.value)} placeholder="e.g. Gupta Dairy" />
          </div>
          <div>
            <label className="label">Shopkeeper Name</label>
            <input className="input" value={shopkeeperName} onChange={event => setShopkeeperName(event.target.value)} placeholder="e.g. Ramesh Gupta" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={event => setEmail(event.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={address} onChange={event => setAddress(event.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={city} onChange={event => setCity(event.target.value)} placeholder="Optional" />
          </div>
        </div>

        {canSelectLine && (
          <div className="grid grid-cols-2 gap-2">
            {(['dairy', 'icecream'] as const).map(line => (
              <button
                key={line}
                type="button"
                onClick={() => {
                  setBusinessLine(line);
                  setQuantities({});
                }}
                className={`py-2 rounded-xl border text-sm font-medium ${
                  businessLine === line
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {businessLineLabel(line)}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              checked={gstEnabled}
              onChange={event => setGstEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            Add GST details to this bill
          </label>
          {gstEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="sm:col-span-3">
                <label className="label">GSTIN / GST Number</label>
                <input
                  className="input"
                  value={gstNumber}
                  onChange={event => setGstNumber(event.target.value)}
                  placeholder="Optional GST number"
                />
              </div>
              <div>
                <label className="label">CGST %</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={cgstPercent}
                  onChange={event => setCgstPercent(event.target.value)}
                  placeholder="e.g. 2.5"
                />
              </div>
              <div>
                <label className="label">SGST %</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={sgstPercent}
                  onChange={event => setSgstPercent(event.target.value)}
                  placeholder="e.g. 2.5"
                />
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
                <div>Total GST</div>
                <div className="font-semibold text-gray-900">{parsedGstPercent || 0}%</div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search product, brand, pack size..."
          />
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {visibleProducts.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No products available in this section.</div>
            ) : (
              visibleProducts.map(product => {
                const quantity = Number(quantities[product.id] || 0);
                return (
                  <div key={product.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {product.brand} - {getProductQuantityText(product.quantity, product.unit)} - ₹{product.price.toLocaleString()}
                      </div>
                      {quantity > 0 && (
                        <div className="text-xs text-brand-700 mt-1">
                          Total Qty: {formatItemTotalQuantity(product.unit, quantity)}
                          {getPackagingPiecesText(product.name, product.category || '', quantity)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" className="btn-secondary p-2" onClick={() => setProductQuantity(product.id, quantity - 1)}>
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        className="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm"
                        type="number"
                        min={0}
                        value={quantity}
                        onChange={event => setProductQuantity(product.id, Number(event.target.value))}
                      />
                      <button type="button" className="btn-secondary p-2" onClick={() => setProductQuantity(product.id, quantity + 1)}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50 p-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs text-gray-500">Items</div>
            <div className="font-semibold text-gray-900">{selectedItems.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Qty</div>
            <div className="font-semibold text-gray-900 truncate">
              {formatOrderTotalQuantity(previewOrderItems)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{gstEnabled ? 'Grand Total' : 'Amount'}</div>
            <div className="font-bold text-brand-700">₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            {gstEnabled && (
              <>
                <div className="text-[11px] text-gray-500">
                  CGST ₹{cgstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-gray-500">
                  SGST ₹{sgstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1" onClick={handleCreateBill} disabled={saving}>
            <FileText className="w-4 h-4" />
            {saving ? 'Generating...' : 'Generate Bill'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
