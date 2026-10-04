import { useMemo } from 'react';
import { BarChart3, Users, Store, IndianRupee, Activity } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { format } from 'date-fns';

export function AdminDashboardPage() {
  const { orders, distributorProfiles, shopkeeperProfiles, products } = useAppStore();

  // Calculate Platform Metrics
  const totalDistributors = distributorProfiles.length;
  const totalShopkeepers = shopkeeperProfiles.length;
  const totalProducts = products.length;
  
  // Calculate GMV (Gross Merchandise Value) / Total Revenue
  const totalRevenue = useMemo(() => {
    return orders
      .filter(o => o.status === 'accepted' || o.status === 'fulfilled')
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const totalOrders = orders.length;

  const stats = [
    { label: 'Total Revenue (GMV)', value: `₹${totalRevenue.toLocaleString()}`, icon: <IndianRupee className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Orders', value: totalOrders, icon: <Activity className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Registered Distributors', value: totalDistributors, icon: <Store className="w-5 h-5" />, color: 'text-purple-600 bg-purple-50' },
    { label: 'Registered Shopkeepers', value: totalShopkeepers, icon: <Users className="w-5 h-5" />, color: 'text-orange-600 bg-orange-50' },
  ];

  // Get 5 most recent orders for tracking
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <MobileHeader title="Platform Admin" subtitle="Overview & Tracking" />
      
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Tracking Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Track platform growth, revenue, and active users.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-brand-100 text-brand-700 px-3 py-1.5 font-medium">Platform Status: Active</span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity / Orders Feed */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Recent Platform Orders
            </h2>
            <button className="text-xs font-medium text-brand-600 hover:underline">View All</button>
          </div>
          
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No orders placed yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{order.shopName} <span className="text-xs font-normal text-gray-500">→</span> {distributorProfiles.find(d => d.id === order.distributorId)?.businessName || 'Distributor'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{format(new Date(order.placedAt), 'dd MMM yyyy, hh:mm a')} • {order.items.length} items</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₹{order.total.toLocaleString()}</div>
                    <div className={`text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-md inline-block ${order.status === 'accepted' || order.status === 'fulfilled' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {order.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">System Health</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">Total Products Listed</span><span className="font-semibold text-gray-900">{totalProducts}</span></div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">More admin controls (Leaderboard generation, User Management, Approvals) will be added here soon.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
