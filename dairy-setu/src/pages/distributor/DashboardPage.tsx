import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, BarChartHorizontal, CheckCircle, ChevronRight, Clock, LineChart, MessageSquare, MessageSquareWarning, Package, Phone, TrendingUp, Users, XCircle, Share2, PlusCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { format, subDays } from 'date-fns';
import type { Order } from '../../types';
import { ManualBillModal } from './ManualBillModal';

function OrderCard({ order, onAccept, onReject, showActions }: {
  order: Order;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card p-4 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">{order.shopName}</span>
            {order.source === 'whatsapp' && (
              <span className="badge bg-green-100 text-green-700 text-xs">WhatsApp</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {order.shopkeeperName} · {format(new Date(order.placedAt), 'h:mm a')}
            {order.deliveryGroupName && ` · ${order.deliveryGroupName}`}
          </div>
          <div className="text-sm font-semibold text-gray-900">₹{order.total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{order.items.length} items</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {showActions && (
            <div className="flex gap-2">
              <button onClick={onAccept} className="btn-primary py-1.5 px-3 text-xs">
                <CheckCircle className="w-3.5 h-3.5" /> Accept
              </button>
              <button onClick={onReject} className="btn-danger py-1.5 px-3 text-xs">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-brand-600 hover:underline flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'View'} items
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 animate-fade-in">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between text-xs text-gray-600">
              <span>{item.productName} <span className="text-gray-400">({item.brand})</span></span>
              <span className="font-medium">{item.quantity} × ₹{item.unitPrice} = ₹{(item.quantity * item.unitPrice).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DailyAnalyticsPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
}

function formatCompactNumber(value: number) {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function RevenueTrendChart({ data }: { data: DailyAnalyticsPoint[] }) {
  const width = 360;
  const height = 170;
  const left = 16;
  const right = width - 16;
  const top = 18;
  const bottom = height - 30;
  const maxRevenue = Math.max(...data.map(point => point.revenue), 1);
  const stepX = data.length > 1 ? (right - left) / (data.length - 1) : 0;

  const points = data.map((point, index) => {
    const x = left + index * stepX;
    const y = bottom - (point.revenue / maxRevenue) * (bottom - top);
    return { x, y, point };
  });

  const linePath = points
    .map((pointData, index) => `${index === 0 ? 'M' : 'L'} ${pointData.x} ${pointData.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${right} ${bottom} L ${left} ${bottom} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
      <defs>
        <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#d1d5db" strokeWidth="1" />
      <path d={areaPath} fill="url(#revenue-area)" />
      <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(pointData => (
        <g key={pointData.point.key}>
          <circle cx={pointData.x} cy={pointData.y} r="3.5" fill="#16a34a" />
          <text x={pointData.x} y={height - 9} textAnchor="middle" fontSize="10" fill="#6b7280">
            {pointData.point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const { orders, connections, distributorProfiles, shopkeeperProfiles, updateOrderStatus, addNotification, fetchShopkeeperProfileById } = useAppStore();
  const { show } = useToast();
  const navigate = useNavigate();
  const [remindAllLoading, setRemindAllLoading] = useState(false);
  const [manualBillOpen, setManualBillOpen] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  // const [remindWhatsappLoading, setRemindWhatsappLoading] = useState(false);

  const profile = distributorProfiles.find(dp => dp.userId === user?.id);
  const today = new Date().toISOString().split('T')[0];
  const myAllOrders = useMemo(
    () => orders.filter(order => order.distributorId === profile?.id),
    [orders, profile?.id]
  );

  const todayOrders = myAllOrders.filter(o => o.deliveryDate?.startsWith(today));
  const normalOrders = todayOrders.filter(o => o.type === 'normal');
  const lateOrders = todayOrders.filter(o => o.type === 'late' && o.status === 'pending');
  const activeConnections = connections.filter(c => c.distributorId === profile?.id && c.status === 'active');
  const pendingConnections = connections.filter(c => c.distributorId === profile?.id && c.status === 'pending');

  const totalRevenue = todayOrders
    .filter(o => o.status === 'accepted' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + o.total, 0);

  const last7DaysAnalytics = useMemo<DailyAnalyticsPoint[]>(() => {
    const points: DailyAnalyticsPoint[] = [];
    const revenueMap = new Map<string, number>();
    const orderMap = new Map<string, number>();

    for (let index = 6; index >= 0; index -= 1) {
      const date = subDays(new Date(), index);
      const key = format(date, 'yyyy-MM-dd');
      points.push({
        key,
        label: format(date, 'EEE'),
        revenue: 0,
        orders: 0,
      });
      revenueMap.set(key, 0);
      orderMap.set(key, 0);
    }

    myAllOrders.forEach(order => {
      const placedDate = new Date(order.placedAt);
      if (Number.isNaN(placedDate.getTime())) return;
      const key = format(placedDate, 'yyyy-MM-dd');
      if (!revenueMap.has(key)) return;
      orderMap.set(key, (orderMap.get(key) || 0) + 1);
      if (order.status === 'accepted' || order.status === 'fulfilled') {
        revenueMap.set(key, (revenueMap.get(key) || 0) + order.total);
      }
    });

    return points.map(point => ({
      ...point,
      revenue: revenueMap.get(point.key) || 0,
      orders: orderMap.get(point.key) || 0,
    }));
  }, [myAllOrders]);

  const weeklyRevenue = useMemo(
    () => last7DaysAnalytics.reduce((sum, point) => sum + point.revenue, 0),
    [last7DaysAnalytics]
  );
  const weeklyOrders = useMemo(
    () => last7DaysAnalytics.reduce((sum, point) => sum + point.orders, 0),
    [last7DaysAnalytics]
  );
  const avgOrderValue = weeklyOrders > 0 ? weeklyRevenue / weeklyOrders : 0;
  const todayAnalytics = last7DaysAnalytics[last7DaysAnalytics.length - 1] || { revenue: 0, orders: 0 };
  const yesterdayAnalytics = last7DaysAnalytics[last7DaysAnalytics.length - 2] || { revenue: 0, orders: 0 };
  const revenueGrowthPct = percentChange(todayAnalytics.revenue, yesterdayAnalytics.revenue);

  const weeklyRevenueByLine = useMemo(() => {
    const split = { dairy: 0, icecream: 0 };
    const validKeys = new Set(last7DaysAnalytics.map(point => point.key));

    myAllOrders.forEach(order => {
      const placedDate = new Date(order.placedAt);
      if (Number.isNaN(placedDate.getTime())) return;
      const key = format(placedDate, 'yyyy-MM-dd');
      if (!validKeys.has(key)) return;
      if (!(order.status === 'accepted' || order.status === 'fulfilled')) return;

      const lineHint = String(
        order.businessLine ||
        order.items?.[0]?.businessLine ||
        order.items?.[0]?.category ||
        ''
      ).toLowerCase();
      const isIcecream = lineHint.includes('ice');
      if (isIcecream) {
        split.icecream += order.total;
      } else {
        split.dairy += order.total;
      }
    });

    return split;
  }, [myAllOrders, last7DaysAnalytics]);

  const totalWeeklySplitRevenue = weeklyRevenueByLine.dairy + weeklyRevenueByLine.icecream;
  const dairyShare = totalWeeklySplitRevenue > 0 ? (weeklyRevenueByLine.dairy / totalWeeklySplitRevenue) * 100 : 0;
  const icecreamShare = totalWeeklySplitRevenue > 0 ? (weeklyRevenueByLine.icecream / totalWeeklySplitRevenue) * 100 : 0;
  const maxOrdersInWeek = Math.max(...last7DaysAnalytics.map(item => item.orders), 1);

  const shopkeepersWhoOrderedToday = useMemo(() => {
    const orderedShopkeeperIds = new Set<string>();
    todayOrders.forEach(order => {
      if (order.shopkeeperId) orderedShopkeeperIds.add(order.shopkeeperId);
    });
    return orderedShopkeeperIds;
  }, [todayOrders]);

  const shopkeepersNotOrdered = useMemo(() => {
    return activeConnections.filter(conn => !shopkeepersWhoOrderedToday.has(conn.shopkeeperId)).sort((a, b) => a.shopName.localeCompare(b.shopName));
  }, [activeConnections, shopkeepersWhoOrderedToday]);


  const topSellingProducts = useMemo(() => {
    const productSales = new Map<string, { id: string; name: string; brand: string; unit: string; quantity: number }>();

    todayOrders
      .filter(o => o.status === 'accepted' || o.status === 'fulfilled')
      .forEach(order => {
        order.items.forEach(item => {
          const existing = productSales.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            productSales.set(item.productId, {
              id: item.productId,
              name: item.productName,
              brand: item.brand,
              unit: item.unit,
              quantity: item.quantity,
            });
          }
        });
      });

    return Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [todayOrders]);

  const handleAcceptLate = (order: Order) => {
    if (!window.confirm('Are you sure you want to accept this late order?')) return;
    updateOrderStatus(order.id, 'accepted');
    const shopProfile = shopkeeperProfiles.find(sp => sp.id === order.shopkeeperId);
    if (shopProfile?.userId) {
      addNotification({
        userId: shopProfile.userId,
        type: 'order_accepted',
        message: `Your late order has been accepted by ${profile?.businessName}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Late order from ${order.shopName} accepted`);
  };

  const handleRejectLate = (order: Order) => {
    if (!window.confirm('Are you sure you want to reject this late order?')) return;
    updateOrderStatus(order.id, 'rejected');
    const shopProfile = shopkeeperProfiles.find(sp => sp.id === order.shopkeeperId);
    if (shopProfile?.userId) {
      addNotification({
        userId: shopProfile.userId,
        type: 'order_rejected',
        message: `Your late order was not accepted by ${profile?.businessName}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    show(`Late order from ${order.shopName} rejected`, 'error');
  };

  const handleRemindAll = async () => {
    if (!profile || shopkeepersNotOrdered.length === 0) return;

    setRemindAllLoading(true);

    const getProfiles = () => useAppStore.getState().shopkeeperProfiles;

    const missingProfileIds = shopkeepersNotOrdered
      .map(conn => conn.shopkeeperId)
      .filter(id => !getProfiles().some(p => p.id === id));

    if (missingProfileIds.length > 0) {
      try {
        await Promise.all(missingProfileIds.map(id => fetchShopkeeperProfileById(id)));
      } catch (_error) {
        show('Failed to fetch shopkeeper details. Please try again.', 'error');
        setRemindAllLoading(false);
        return;
      }
    }

    const latestShopkeeperProfiles = getProfiles();
    let remindedCount = 0;
    const failedNames: string[] = [];

    shopkeepersNotOrdered.forEach(conn => {
      const shopProfile = latestShopkeeperProfiles.find(sp => sp.id === conn.shopkeeperId);
      if (shopProfile?.userId) {
        addNotification({
          userId: shopProfile.userId,
          type: 'order_reminder',
          message: `Reminder from ${profile.businessName}: You have not placed your order for today.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        remindedCount++;
      } else {
        failedNames.push(conn.shopName);
      }
    });

    setRemindAllLoading(false);

    if (remindedCount > 0) {
      show(`Sent reminders to ${remindedCount} shopkeeper${remindedCount > 1 ? 's' : ''}.`);
    }
    if (failedNames.length > 0) {
      show(`Could not remind: ${failedNames.join(', ')}. Their profile is incomplete.`, 'error');
    } else if (remindedCount === 0 && shopkeepersNotOrdered.length > 0) {
      show('Could not send reminders. No users to remind or data is incomplete.', 'error');
    }
  };

  const handleSendReminder = async (connectionId: string) => {
    const conn = shopkeepersNotOrdered.find(c => c.id === connectionId);
    if (!conn || !profile) return;
    setRemindingId(connectionId);
    try {
      const getProfiles = () => useAppStore.getState().shopkeeperProfiles;
      let shopProfile = getProfiles().find(sp => sp.id === conn.shopkeeperId);
      if (!shopProfile) {
        await fetchShopkeeperProfileById(conn.shopkeeperId);
        shopProfile = getProfiles().find(sp => sp.id === conn.shopkeeperId);
      }
      if (shopProfile?.userId) {
        await addNotification({
          userId: shopProfile.userId,
          type: 'order_reminder',
          message: `Reminder from ${profile.businessName}: You have not placed your order for today.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        show(`Reminder sent to ${conn.shopName}!`);
      } else {
        show(`Could not find profile for ${conn.shopName}`, 'error');
      }
    } catch (e) {
      show('Failed to send reminder', 'error');
    } finally {
      setRemindingId(null);
    }
  };

  // const handleRemindAllViaWhatsapp = async () => {
  //   const remindShopkeepersViaWhatsapp = (useAppStore.getState() as any).remindShopkeepersViaWhatsapp;
  //   if (!profile || shopkeepersNotOrdered.length === 0) return;
  //   if (!remindShopkeepersViaWhatsapp) {
  //     show('WhatsApp reminder feature is not available yet.', 'error');
  //     return;
  //   }

  //   setRemindWhatsappLoading(true);
  //   const shopkeeperIds = shopkeepersNotOrdered.map(conn => conn.shopkeeperId);

  //   try {
  //     const { remindedCount, failedNames } = await remindShopkeepersViaWhatsapp(shopkeeperIds, `Reminder from ${profile.businessName}: You have not placed your order for today.`);
  //     if (remindedCount > 0) {
  //       show(`Sent WhatsApp reminders to ${remindedCount} shopkeeper${remindedCount > 1 ? 's' : ''}.`);
  //     }
  //     if (failedNames.length > 0) {
  //       show(`Could not send WhatsApp to: ${failedNames.join(', ')}. Check their phone numbers.`, 'error');
  //     }
  //   } finally {
  //     setRemindWhatsappLoading(false);
  //   }
  // };

  const stats = [
    { label: 'Normal Orders', value: normalOrders.length, icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600 bg-green-50', sub: 'Today' },
    { label: 'Late Orders', value: lateOrders.length, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600 bg-yellow-50', sub: 'Pending approval' },
    { label: 'Active Shops', value: activeConnections.length, icon: <Users className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50', sub: `${pendingConnections.length} pending` },
    { label: "Confirmed Value", value: `₹${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-purple-600 bg-purple-50', sub: 'Confirmed orders' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <MobileHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user?.name?.split(' ')[0]}!`}
        subtitle={`${profile?.businessName} · Cutoff: ${profile?.orderWindowCutoff}`}
      />
      {/* Header — desktop only */}
      <div className="hidden md:block mb-6">
        <div className="flex justify-between items-start">
          <div>
        <h1 className="text-xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {profile?.businessName} · Order window: {profile?.orderWindowStart} – {profile?.orderWindowCutoff}
        </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary text-sm py-2 px-4 flex items-center gap-2" onClick={() => setManualBillOpen(true)}>
              <PlusCircle className="w-4 h-4" /> Generate Manual Bill
            </button>
            <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2" onClick={() => {
              const link = `${window.location.origin}/d/${profile?.connectionCode}`;
              if (navigator.share) {
                navigator.share({ title: 'Connect with me', text: `Connect with ${profile?.businessName} on DairyWalla:`, url: link }).catch(() => {});
              } else {
                navigator.clipboard.writeText(link);
                show('Share link copied to clipboard!');
              }
            }}>
              <Share2 className="w-4 h-4 text-brand-600" /> Share Profile Link
            </button>
          </div>
        </div>
      </div>
      <div className="md:hidden mb-4">
        <button className="btn-primary w-full justify-center" onClick={() => setManualBillOpen(true)}>
          <PlusCircle className="w-4 h-4" /> Generate Manual Bill
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs font-medium text-gray-700 mt-0.5">{stat.label}</div>
            <div className="text-xs text-gray-400">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Growth analytics */}
      <div className="grid xl:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Order Value Trend (Last 7 Days)</h2>
            </div>
            <div className={`text-xs font-semibold ${revenueGrowthPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {revenueGrowthPct >= 0 ? '+' : ''}{revenueGrowthPct.toFixed(1)}% vs yesterday
            </div>
          </div>
          <RevenueTrendChart data={last7DaysAnalytics} />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] text-gray-500">7d Order Value</div>
              <div className="text-sm font-semibold text-gray-900">₹{formatCompactNumber(weeklyRevenue)}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] text-gray-500">7d Orders</div>
              <div className="text-sm font-semibold text-gray-900">{weeklyOrders}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[11px] text-gray-500">Avg Order Value</div>
              <div className="text-sm font-semibold text-gray-900">₹{Math.round(avgOrderValue).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Business Mix (7d)</h2>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">Dairy</span>
                <span className="text-gray-900 font-semibold">{dairyShare.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${dairyShare > 0 ? Math.max(6, dairyShare) : 0}%` }} />
              </div>
              <div className="text-[11px] text-gray-500 mt-1">₹{Math.round(weeklyRevenueByLine.dairy).toLocaleString()}</div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">Ice Cream</span>
                <span className="text-gray-900 font-semibold">{icecreamShare.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: `${icecreamShare > 0 ? Math.max(6, icecreamShare) : 0}%` }} />
              </div>
              <div className="text-[11px] text-gray-500 mt-1">₹{Math.round(weeklyRevenueByLine.icecream).toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-gray-700 mb-2">Order Volume by Day</div>
            <div className="flex items-end gap-2 h-24">
              {last7DaysAnalytics.map(point => {
                const heightPct = (point.orders / maxOrdersInWeek) * 100;
                return (
                  <div key={point.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1">
                    <div className="text-[10px] text-gray-400">{point.orders}</div>
                    <div className="w-full rounded-md bg-indigo-100 flex items-end" style={{ height: '52px' }}>
                      <div className="w-full rounded-md bg-indigo-500" style={{ height: `${Math.max(8, heightPct)}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-500">{point.label.slice(0, 1)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Route-wise Delivery Groups */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-brand-600" />
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Route-wise Delivery Groups</h2>
            <p className="text-xs text-gray-400 mt-0.5">Orders grouped by delivery routes or areas</p>
          </div>
        </div>

        {(() => {
          const routeMap: Record<string, typeof todayOrders> = {};
          todayOrders.forEach((order) => {
            const conn = connections.find((c) => c.shopkeeperId === order.shopkeeperId);
            const route = conn?.deliveryGroupName || 'Unassigned Area / Route';
            if (!routeMap[route]) routeMap[route] = [];
            routeMap[route].push(order);
          });

          const routes = Object.keys(routeMap).sort();
          if (routes.length === 0) {
            return <div className="text-center py-6 text-sm text-gray-500">No orders received today yet.</div>;
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map((routeName) => {
                const routeOrders = routeMap[routeName];
                return (
                  <div key={routeName} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between gap-3 bg-gray-100 px-3 py-1.5 rounded-lg mb-2">
                      <span className="text-sm font-semibold text-gray-800">📍 {routeName}</span>
                      <span className="badge-green text-xs font-bold">{routeOrders.length} orders</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {routeOrders.map((order) => (
                        <div key={order.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{order.shopName || order.shopkeeperName}</div>
                            <div className="text-[10px] text-gray-500 truncate mt-0.5">
                              {order.items?.length || 0} items · {order.items?.map(i => `${i.productName}(${i.quantity})`).join(', ')}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-gray-900">₹{order.total.toLocaleString()}</div>
                            <div className={`text-[10px] font-semibold mt-0.5 ${order.status === 'accepted' || order.status === 'fulfilled' ? 'text-green-600' : 'text-amber-600'}`}>
                              {order.status === 'accepted' || order.status === 'fulfilled' ? 'Confirmed' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Shopkeepers Not Ordered Today */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Shopkeepers Not Ordered (Today)</h2>
            {shopkeepersNotOrdered.length > 0 && <span className="badge-red">{shopkeepersNotOrdered.length}</span>}
          </div>
          {shopkeepersNotOrdered.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={handleRemindAll} disabled={remindAllLoading} className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-70">
                {remindAllLoading ? (
                  'Sending...'
                ) : (
                  <><MessageSquareWarning className="w-3.5 h-3.5" /> Remind (App)</>
                )}
              </button>
              {/* <button onClick={handleRemindAllViaWhatsapp} disabled={remindWhatsappLoading} className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-70">
                {remindWhatsappLoading ? (
                  'Sending...'
                ) : (
                  <><MessageSquare className="w-3.5 h-3.5 text-green-600" /> Remind (WA)</>
                )}
              </button> */}
            </div>
          )}
        </div>
        {shopkeepersNotOrdered.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {shopkeepersNotOrdered.map(conn => {
              const shopkeeperPhone = conn.shopkeeperPhone?.trim();
              const shopkeeperTel = shopkeeperPhone?.replace(/[^\d]/g, '').slice(-10);
              return (
                <div key={conn.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{conn.shopName}</div>
                    <div className="text-xs text-gray-500 truncate">{conn.shopkeeperName}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleSendReminder(conn.id)}
                      disabled={remindingId === conn.id}
                      className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-70"
                    >
                      {remindingId === conn.id ? 'Sending...' : 'Remind'}
                    </button>
                    {shopkeeperTel && shopkeeperTel.length === 10 && (
                      <>
                        <a href={`https://wa.me/91${shopkeeperTel}`} target="_blank" rel="noopener noreferrer" className="btn-secondary p-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                        </a>
                        <a href={`tel:${shopkeeperTel}`} className="btn-secondary p-1.5">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">All active shopkeepers have placed an order today!</div>
        )}
      </div>

      {/* Pending connections alert */}
      {pendingConnections.length > 0 && (
        <div
          className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/distributor/connections')}
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-800">
              {pendingConnections.length} new connection request{pendingConnections.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-amber-600">Tap to review and approve</div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600" />
        </div>
      )}

      {/* Top Selling Products */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChartHorizontal className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-900 text-sm">Top 5 Selling Products (Today)</h2>
        </div>
        {topSellingProducts.length > 0 ? (
          <div className="space-y-3">
            {topSellingProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-gray-400 w-4 text-center">{index + 1}.</span>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 leading-tight">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.brand}</div>
                  </div>
                </div>
                <div className="font-bold text-gray-900 flex-shrink-0 ml-2">
                  {product.quantity} <span className="text-xs font-normal text-gray-400">{product.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500">
            <p>No sales data for today yet.</p>
            <p className="text-xs text-gray-400 mt-1">Accept orders to see top selling products here.</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Normal Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Normal Orders</h2>
              <span className="badge-green">{normalOrders.length}</span>
            </div>
            <button onClick={() => navigate('/distributor/orders')} className="text-xs text-brand-600 hover:underline">
              View all
            </button>
          </div>
          {normalOrders.length === 0 ? (
            <div className="card p-6 text-center">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No orders yet today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {normalOrders.slice(0, 3).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
              {normalOrders.length > 3 && (
                <button onClick={() => navigate('/distributor/orders')} className="w-full text-xs text-brand-600 hover:underline py-2">
                  +{normalOrders.length - 3} more orders
                </button>
              )}
            </div>
          )}
        </div>

        {/* Late Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Late Orders</h2>
              <span className="badge-yellow">{lateOrders.length}</span>
            </div>
            <span className="text-xs text-gray-400">Needs approval</span>
          </div>
          {lateOrders.length === 0 ? (
            <div className="card p-6 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No late orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lateOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  showActions
                  onAccept={() => handleAcceptLate(order)}
                  onReject={() => handleRejectLate(order)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <ManualBillModal
        open={manualBillOpen}
        onClose={() => setManualBillOpen(false)}
        distributor={profile}
      />
    </div>
  );
}
