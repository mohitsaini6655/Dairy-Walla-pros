import { useState, useMemo } from 'react';
import { BarChart3, Download, Share2, FileText, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProductCategory } from '../../types';
import { addPdfLogoWatermark, getPdfBrandAssets } from '../../utils/pdfBranding';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { inferBusinessLineFromCategory } from '../../utils/businessLine';

// Category display order and labels
const CATEGORY_ORDER: ProductCategory[] = ['milk', 'paneer', 'curd', 'butter', 'ghee', 'other'];
const CATEGORY_LABELS: Record<ProductCategory, string> = {
  milk: 'Milk',
  paneer: 'Paneer',
  curd: 'Curd',
  butter: 'Butter',
  ghee: 'Ghee',
  other: 'Other',
};
const CATEGORY_COLORS: Record<ProductCategory, string> = {
  milk: 'bg-blue-50 border-blue-200 text-blue-800',
  paneer: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  curd: 'bg-purple-50 border-purple-200 text-purple-800',
  butter: 'bg-orange-50 border-orange-200 text-orange-800',
  ghee: 'bg-amber-50 border-amber-200 text-amber-800',
  other: 'bg-gray-50 border-gray-200 text-gray-700',
};
const SUMMARY_CATEGORIES = new Set(CATEGORY_ORDER);

function normalizeSummaryCategory(category: unknown): ProductCategory {
  const normalized = String(category ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return SUMMARY_CATEGORIES.has(normalized as ProductCategory)
    ? (normalized as ProductCategory)
    : 'other';
}

type FilterPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface SummaryItem {
  productId: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  unit: string;
  totalQty: number;
  totalValue: number;
}

function getDateRange(period: FilterPeriod, customFrom: string, customTo: string): { from: Date; to: Date; label: string } {
  const now = new Date();
  switch (period) {
    case 'today':
      return { from: new Date(now.setHours(0,0,0,0)), to: new Date(new Date().setHours(23,59,59,999)), label: 'Today' };
    case 'yesterday': {
      const y = subDays(new Date(), 1);
      return { from: new Date(y.setHours(0,0,0,0)), to: new Date(new Date(subDays(new Date(),1)).setHours(23,59,59,999)), label: 'Yesterday' };
    }
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }), label: 'This Week' };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now), label: 'This Month' };
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom) : new Date(),
        to: customTo ? new Date(customTo + 'T23:59:59') : new Date(),
        label: customFrom && customTo ? `${format(new Date(customFrom), 'dd MMM')} - ${format(new Date(customTo), 'dd MMM')}` : 'Custom',
      };
  }
}

export function SummaryPage() {
  const { user } = useAuthStore();
  const { orders, distributorProfiles, products } = useAppStore();
  const { show } = useToast();

  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billType, setBillType] = useState<'all' | 'dairy' | 'icecream'>('all');

  const profile = distributorProfiles.find(dp => dp.userId === user?.id);
  const { from, to, label } = getDateRange(period, customFrom, customTo);

  // Filter accepted orders in date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.distributorId !== profile?.id) return false;
      if (o.status !== 'accepted' && o.status !== 'fulfilled') return false;
      const orderDate = new Date(o.placedAt);
      return orderDate >= from && orderDate <= to;
    });
  }, [orders, profile, from, to]);

  // Aggregate by product  keep category from products store
  const summaryByCategory = useMemo(() => {
    const map = new Map<string, SummaryItem>();

    filteredOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];

      items.forEach(item => {
        if (profile?.distributorType === 'dual' && billType !== 'all') {
          const product = products.find(p => p.id === item.productId);
          const line = product ? inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine) : 'dairy';
          if (line !== billType) return;
        }

        const productKey = item.productId || `${item.productName}-${item.brand}-${item.unit}`;
        const existing = map.get(productKey);
        if (existing) {
          existing.totalQty += item.quantity;
          existing.totalValue += item.quantity * item.unitPrice;
        } else {
          map.set(productKey, {
            productId: productKey,
            productName: item.productName,
            brand: item.brand,
            category: normalizeSummaryCategory((item as any).category),
            unit: item.unit,
            totalQty: item.quantity,
            totalValue: item.quantity * item.unitPrice,
          });
        }
      });
    });

    // Group by category in defined order
    const grouped: Record<ProductCategory, SummaryItem[]> = {
      milk: [], paneer: [], curd: [], butter: [], ghee: [], other: [],
    };
    map.forEach(item => {
      grouped[normalizeSummaryCategory(item.category)].push(item);
    });

    return grouped;
  }, [filteredOrders, profile, billType, products]);

  const allItems = CATEGORY_ORDER.flatMap(cat => summaryByCategory[cat]);
  const totalValue = allItems.reduce((s, i) => s + i.totalValue, 0);
  const totalQty = allItems.reduce((s, i) => s + i.totalQty, 0);
  const summaryLabel = billType === 'dairy' ? `Dairy Summary - ${label}` : billType === 'icecream' ? `Ice Cream Summary - ${label}` : `Order Summary - ${label}`;

  const periodButtons: { key: FilterPeriod; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  const handlePeriodChange = (p: FilterPeriod) => {
    setPeriod(p);
    setShowCustom(p === 'custom');
  };

  // Generate bill text for sharing
  const generateBillText = () => {
    const lines: string[] = [];
    lines.push('------------------------');
    lines.push(`  ${profile?.businessName}`);
    lines.push(`  ${summaryLabel}`);
    lines.push('------------------------');
    lines.push('');

    CATEGORY_ORDER.forEach(cat => {
      const items = summaryByCategory[cat];
      if (items.length === 0) return;
      lines.push(`- ${CATEGORY_LABELS[cat].toUpperCase()}`);
      items.forEach(item => {
        lines.push(`  ${item.productName} (${item.brand})`);
        lines.push(`  ${item.totalQty} ${item.unit} x ₹${(item.totalValue / item.totalQty).toFixed(0)} = ₹${item.totalValue.toLocaleString()}`);
      });
      lines.push('');
    });

    lines.push('------------------------');
    lines.push(`  Total Orders : ${filteredOrders.length}`);
    lines.push(`  Total Qty    : ${totalQty} units`);
    lines.push(`  Total Value  : ₹${totalValue.toLocaleString()}`);
    lines.push('------------------------');
    lines.push(`  Generated: ${format(new Date(), 'dd MMM yyyy, h:mm a')}`);

    return lines.join('\n');
  };

  const handleDownload = async () => {
    const brandAssets = await getPdfBrandAssets();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 15;

    if (brandAssets?.watermarkDataUrl) {
      addPdfLogoWatermark(doc, brandAssets.watermarkDataUrl);
    }

    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageW, 32, 'F');

    if (brandAssets?.logoDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(5, 4, 24, 24, 2, 2, 'F');
      doc.addImage(brandAssets.logoDataUrl, 'PNG', 6.5, 5.5, 21, 21, undefined, 'FAST');
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.businessName || 'DairyWalla', 33, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(summaryLabel, 33, 17);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, h:mm a')}`, 33, 22);
    doc.text(`Total Orders: ${filteredOrders.length}  |  Total Value: ₹${totalValue.toLocaleString()}`, 33, 27);

    y = 40;

    const stats = [
      { label: 'Total Orders', value: String(filteredOrders.length) },
      { label: 'Total Units', value: String(totalQty) },
      { label: 'Total Value', value: `₹${totalValue.toLocaleString()}` },
    ];
    const colW = (pageW - 30) / 3;
    stats.forEach((s, i) => {
      const x = 15 + i * colW;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(x, y, colW - 4, 14, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(22, 163, 74);
      doc.text(s.value, x + (colW - 4) / 2, y + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(s.label, x + (colW - 4) / 2, y + 11, { align: 'center' });
    });

    y += 22;

    const categoryBgColors: Record<ProductCategory, [number, number, number]> = {
      milk: [219, 234, 254],
      paneer: [254, 249, 195],
      curd: [237, 233, 254],
      butter: [255, 237, 213],
      ghee: [254, 243, 199],
      other: [243, 244, 246],
    };
    const categoryTextColors: Record<ProductCategory, [number, number, number]> = {
      milk: [29, 78, 216],
      paneer: [133, 77, 14],
      curd: [109, 40, 217],
      butter: [154, 52, 18],
      ghee: [120, 53, 15],
      other: [55, 65, 81],
    };

    CATEGORY_ORDER.forEach(cat => {
      const items = summaryByCategory[cat];
      if (items.length === 0) return;

      const catTotal = items.reduce((s, i) => s + i.totalValue, 0);
      const catQty = items.reduce((s, i) => s + i.totalQty, 0);

      const [br, bg, bb] = categoryBgColors[cat];
      const [tr, tg, tb] = categoryTextColors[cat];
      doc.setFillColor(br, bg, bb);
      doc.rect(15, y, pageW - 30, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(tr, tg, tb);
      doc.text(CATEGORY_LABELS[cat].replace(/[^\w\s]/g, '').trim(), 18, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${catQty} units  |  ₹${catTotal.toLocaleString()}`, pageW - 17, y + 5.5, { align: 'right' });

      y += 10;

      autoTable(doc, {
        startY: y,
        margin: { left: 15, right: 15 },
        head: [['Product', 'Brand', 'Unit', 'Qty', 'Rate (₹)', 'Amount (₹)']],
        body: items.map(item => [
          item.productName,
          item.brand,
          item.unit,
          item.totalQty,
          (item.totalValue / item.totalQty).toFixed(0),
          item.totalValue.toLocaleString(),
        ]),
        foot: [['', '', '', catQty, '', `₹${catTotal.toLocaleString()}`]],
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        footStyles: { fillColor: [240, 253, 244], textColor: [22, 163, 74], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
        },
        tableLineColor: [229, 231, 235],
        tableLineWidth: 0.2,
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    });

    doc.setFillColor(22, 163, 74);
    doc.rect(15, y, pageW - 30, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL', 20, y + 8);
    doc.text(`₹${totalValue.toLocaleString()}`, pageW - 17, y + 8, { align: 'right' });

    y = Math.min(y + 18, pageH - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by DairyWalla | Smart dairy ordering platform', pageW / 2, y, { align: 'center' });

    const filename = `DairyWalla-Bill-${summaryLabel.replace(/\s/g, '-')}-${format(new Date(), 'ddMMMyyyy')}.pdf`;
    doc.save(filename);
    show('PDF downloaded!');
  };
  const handleShare = () => {
    const text = generateBillText();
    if (navigator.share) {
      navigator.share({ title: `DairyWalla Bill - ${summaryLabel}`, text });
    } else {
      navigator.clipboard.writeText(text);
      show('Bill copied to clipboard!');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <MobileHeader title="Order Summary" subtitle={`${filteredOrders.length} orders | ₹${totalValue.toLocaleString()}`} />
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">Order Summary</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aggregated demand with date filtering</p>
      </div>

      {/* Period filter */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Period</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periodButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => handlePeriodChange(btn.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                period === btn.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {showCustom && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                className="input text-sm py-2"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                className="input text-sm py-2"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Bill Type Filter for Dual Distributors */}
        {profile?.distributorType === 'dual' && (
          <div className="flex bg-gray-100 p-1 rounded-lg mt-3">
            <button
              onClick={() => setBillType('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${billType === 'all' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
            >
              All Products
            </button>
            <button
              onClick={() => setBillType('dairy')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${billType === 'dairy' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
            >
              Dairy
            </button>
            <button
              onClick={() => setBillType('icecream')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${billType === 'icecream' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}
            >
              Ice Cream
            </button>
          </div>
        )}
      </div>

      {allItems.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="No orders found"
          description={`No accepted orders for ${label}`}
        />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{filteredOrders.length}</div>
              <div className="text-xs text-gray-500">Orders</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{totalQty}</div>
              <div className="text-xs text-gray-500">Total Units</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xl font-bold text-brand-600">₹{totalValue.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Value</div>
            </div>
          </div>

          {/* Generate Bill button */}
          <button
            onClick={() => setBillModalOpen(true)}
            className="btn-primary w-full mb-4 py-3"
          >
            <FileText className="w-4 h-4" />
            Generate Bill for {summaryLabel.replace('Summary - ', '')}
          </button>

          {/* Category-wise summary */}
          <div className="space-y-3">
            {CATEGORY_ORDER.map(cat => {
              const items = summaryByCategory[cat];
              if (items.length === 0) return null;
              const catTotal = items.reduce((s, i) => s + i.totalValue, 0);
              const catQty = items.reduce((s, i) => s + i.totalQty, 0);

              return (
                <div key={cat} className="card overflow-hidden">
                  {/* Category header */}
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between ${CATEGORY_COLORS[cat]}`}>
                    <span className="font-semibold text-sm">{CATEGORY_LABELS[cat]}</span>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span>{catQty} units</span>
                      <span>₹{catTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Products in category */}
                  <div className="divide-y divide-gray-50">
                    {items.map(item => (
                      <div key={item.productId} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-400">{item.brand} | {item.unit}</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-bold text-gray-900">{item.totalQty} <span className="text-xs font-normal text-gray-400">units</span></div>
                          <div className="text-xs text-brand-600 font-semibold">₹{item.totalValue.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          <div className="card p-4 mt-3 flex items-center justify-between bg-brand-50 border-brand-200">
            <span className="font-bold text-gray-900">Grand Total</span>
            <span className="text-xl font-bold text-brand-600">₹{totalValue.toLocaleString()}</span>
          </div>
        </>
      )}

      {/* Bill Modal */}
      <Modal open={billModalOpen} onClose={() => setBillModalOpen(false)} title={`Bill - ${label}`} size="lg">
        <div className="space-y-4">
          {/* Bill preview */}
          <div className="relative bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-56 h-56">
                <BrandLogo className="w-full h-full" />
              </div>
            </div>
            {/* Header */}
            <div className="relative text-center mb-4 pb-3 border-b border-gray-200">
              <div className="w-14 h-14 mx-auto mb-2 rounded-xl border border-gray-200 bg-white p-1.5">
                <BrandLogo className="w-full h-full rounded-lg" />
              </div>
              <div className="font-bold text-lg text-gray-900">{profile?.businessName}</div>
              <div className="text-sm text-gray-500">{summaryLabel.split(' - ')[0]} Bill</div>
              <div className="text-xs text-gray-400 mt-0.5">{label} - Generated {format(new Date(), 'dd MMM yyyy')}</div>
            </div>

            {/* Category sections */}
            <div className="space-y-4">
              {CATEGORY_ORDER.map(cat => {
                const items = summaryByCategory[cat];
                if (items.length === 0) return null;
                const catTotal = items.reduce((s, i) => s + i.totalValue, 0);

                return (
                  <div key={cat}>
                    <div className={`px-3 py-1.5 rounded-lg mb-2 font-semibold text-sm ${CATEGORY_COLORS[cat]}`}>
                      {CATEGORY_LABELS[cat]}
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left pb-1 font-medium">Product</th>
                          <th className="text-right pb-1 font-medium">Qty</th>
                          <th className="text-right pb-1 font-medium">Rate</th>
                          <th className="text-right pb-1 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.productId} className="border-b border-gray-50">
                            <td className="py-1.5">
                              <div className="font-medium text-gray-800">{item.productName}</div>
                              <div className="text-gray-400">{item.brand}</div>
                            </td>
                            <td className="py-1.5 text-right text-gray-700">{item.totalQty} {item.unit}</td>
                            <td className="py-1.5 text-right text-gray-700">₹{(item.totalValue / item.totalQty).toFixed(0)}</td>
                            <td className="py-1.5 text-right font-semibold text-gray-900">₹{item.totalValue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="pt-1.5 text-right text-gray-500 font-medium">Subtotal</td>
                          <td className="pt-1.5 text-right font-bold text-gray-900">₹{catTotal.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Grand total */}
            <div className="mt-4 pt-3 border-t-2 border-gray-300 flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-900">Grand Total</div>
                <div className="text-xs text-gray-400">{filteredOrders.length} orders | {totalQty} units</div>
              </div>
              <div className="text-2xl font-bold text-brand-600">₹{totalValue.toLocaleString()}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="sticky bottom-0 z-10 grid grid-cols-2 gap-3 bg-white/95 backdrop-blur-sm pt-2 pb-1">
            <button onClick={handleDownload} className="btn-secondary flex-1 py-3">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={handleShare} className="btn-primary flex-1 py-3">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

