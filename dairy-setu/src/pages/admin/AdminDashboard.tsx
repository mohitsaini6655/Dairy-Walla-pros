import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, Truck, ShoppingCart, Link2, Package,
  LogOut, TrendingUp, Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { clearAdminSession, isAdminAuthenticated } from './AdminLoginPage';
import { BrandLogo } from '../../components/ui/BrandLogo';

type Tab = 'overview' | 'users' | 'orders' | 'connections' | 'products';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const {
    distributorProfiles, shopkeeperProfiles, connections,
    orders, products
  } = useAppStore();

  // Guard — redirect if not authenticated
  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin');
  };

  // Stats
  const totalUsers = distributorProfiles.length + shopkeeperProfiles.length;
  const activeConnections = connections.filter(c => c.status === 'active').length;
  const pendingConnections = connections.filter(c => c.status === 'pending').length;
  const todayOrders = orders.filter(o => o.deliveryDate === new Date().toISOString().split('T')[0]).length;
  const totalRevenue = orders.filter(o => o.status !== 'rejected').reduce((s, o) => s + o.total, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'connections', label: 'Connections', icon: <Link2 className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-900 text-green-300',
      pending: 'bg-yellow-900 text-yellow-300',
      rejected: 'bg-red-900 text-red-300',
      fulfilled: 'bg-blue-900 text-blue-300',
      accepted: 'bg-green-900 text-green-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-800 text-gray-400'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 p-1.5">
            <BrandLogo className="w-full h-full rounded-md" />
          </div>
          <div>
            <div className="font-bold text-sm">DairyWalla Admin</div>
            <div className="text-xs text-gray-500">Super Admin Panel</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-6xl mx-auto">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Platform Overview</h2>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Users', value: totalUsers, icon: <Users className="w-5 h-5" />, color: 'text-blue-400' },
                { label: 'Distributors', value: distributorProfiles.length, icon: <Truck className="w-5 h-5" />, color: 'text-purple-400' },
                { label: 'Shopkeepers', value: shopkeeperProfiles.length, icon: <Store className="w-5 h-5" />, color: 'text-green-400' },
                { label: "Today's Orders", value: todayOrders, icon: <ShoppingCart className="w-5 h-5" />, color: 'text-yellow-400' },
                { label: 'Active Connections', value: activeConnections, icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-400' },
                { label: 'Pending Connections', value: pendingConnections, icon: <Clock className="w-5 h-5" />, color: 'text-yellow-400' },
                { label: 'Total Orders', value: orders.length, icon: <ShoppingCart className="w-5 h-5" />, color: 'text-blue-400' },
                { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3 text-gray-300">Recent Orders</h3>
              <div className="space-y-2">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{order.shopName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.placedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        {' · '}{order.type === 'late' ? '⚠️ Late' : '✓ Normal'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">₹{order.total.toLocaleString()}</div>
                      {statusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-lg font-bold mb-4">All Users</h2>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-gray-600"
                placeholder="Search by name, city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Distributors */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Truck className="w-3.5 h-3.5" /> Distributors ({distributorProfiles.length})
              </h3>
              <div className="space-y-2">
                {distributorProfiles
                  .filter(dp => !search || dp.businessName.toLowerCase().includes(search.toLowerCase()) || dp.city?.toLowerCase().includes(search.toLowerCase()))
                  .map(dp => (
                    <div key={dp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-sm">{dp.businessName}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{dp.ownerName} · {dp.city || 'No city'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Code: <span className="font-mono text-yellow-400">{dp.connectionCode}</span>
                            {' · '}{dp.company || 'No brand'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Order window: {dp.orderWindowStart} – {dp.orderWindowCutoff}
                          </div>
                          {dp.deliveryAreas && (
                            <div className="text-xs text-gray-500">Areas: {dp.deliveryAreas}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">ID: {dp.id}</div>
                          {dp.profileComplete && (
                            <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                              <CheckCircle className="w-3 h-3" /> Complete
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Shopkeepers */}
            <div>
              <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Store className="w-3.5 h-3.5" /> Shopkeepers ({shopkeeperProfiles.length})
              </h3>
              <div className="space-y-2">
                {shopkeeperProfiles
                  .filter(sp => !search || sp.shopName.toLowerCase().includes(search.toLowerCase()) || sp.city?.toLowerCase().includes(search.toLowerCase()))
                  .map(sp => (
                    <div key={sp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-sm">{sp.shopName}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{sp.ownerName} · {sp.city || 'No city'}</div>
                          {sp.address && <div className="text-xs text-gray-500">{sp.address}</div>}
                          {sp.deliveryTiming && <div className="text-xs text-gray-500">Timing: {sp.deliveryTiming}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">ID: {sp.id}</div>
                          {sp.profileComplete && (
                            <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                              <CheckCircle className="w-3 h-3" /> Complete
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Orders ── */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold mb-4">All Orders ({orders.length})</h2>

            {/* Summary row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Pending', count: orders.filter(o => o.status === 'pending').length, color: 'text-yellow-400' },
                { label: 'Accepted', count: orders.filter(o => o.status === 'accepted').length, color: 'text-green-400' },
                { label: 'Fulfilled', count: orders.filter(o => o.status === 'fulfilled').length, color: 'text-blue-400' },
                { label: 'Rejected', count: orders.filter(o => o.status === 'rejected').length, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center justify-between text-left"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.shopName}</span>
                        {order.type === 'late' && (
                          <span className="text-xs bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded-full">Late</span>
                        )}
                        {statusBadge(order.status)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.placedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        {' · '}{order.source === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-400">₹{order.total.toLocaleString()}</span>
                      {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {expandedOrder === order.id && (
                    <div className="border-t border-gray-800 px-4 pb-4">
                      <div className="text-xs text-gray-500 mb-2 mt-3">Order ID: {order.id}</div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-800">
                            <th className="text-left py-1">Product</th>
                            <th className="text-right py-1">Qty</th>
                            <th className="text-right py-1">Price</th>
                            <th className="text-right py-1">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map(item => (
                            <tr key={item.id} className="border-b border-gray-800/50">
                              <td className="py-1.5">{item.productName} <span className="text-gray-500">({item.unit})</span></td>
                              <td className="text-right py-1.5">{item.quantity}</td>
                              <td className="text-right py-1.5">₹{item.unitPrice}</td>
                              <td className="text-right py-1.5 font-medium">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="text-right pt-2 font-semibold text-gray-300">Total</td>
                            <td className="text-right pt-2 font-bold text-green-400">₹{order.total.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Connections ── */}
        {activeTab === 'connections' && (
          <div>
            <h2 className="text-lg font-bold mb-4">All Connections ({connections.length})</h2>
            <div className="space-y-2">
              {connections.map(conn => (
                <div key={conn.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {statusBadge(conn.status)}
                        <span className="text-xs text-gray-500">{conn.id}</span>
                      </div>
                      <div className="text-sm font-semibold">{conn.shopName}</div>
                      <div className="text-xs text-gray-400">{conn.shopkeeperName}</div>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                        <span>→</span>
                        <span className="text-purple-400 font-medium">{conn.businessName}</span>
                      </div>
                      {conn.deliveryGroupName && (
                        <div className="text-xs text-gray-500 mt-0.5">Group: {conn.deliveryGroupName}</div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {new Date(conn.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Products ── */}
        {activeTab === 'products' && (
          <div>
            <h2 className="text-lg font-bold mb-4">All Products ({products.length})</h2>
            <div className="space-y-2">
              {distributorProfiles.map(dp => {
                const dpProducts = products.filter(p => p.distributorId === dp.id);
                if (!dpProducts.length) return null;
                return (
                  <div key={dp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-sm">{dp.businessName}</span>
                      <span className="text-xs text-gray-500">({dpProducts.length} products)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dpProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.brand} · {p.unit} · <span className="capitalize">{p.category}</span></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-400">₹{p.price}</div>
                            {p.available
                              ? <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Available</span>
                              : <span className="text-xs text-red-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Unavailable</span>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
