import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Store,
  IndianRupee,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
  DollarSign,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { apiClient } from '../../lib/apiClient';
import { isAdminAuthenticated } from './AdminLoginPage';

interface AdminStats {
  totalUsers: number;
  totalDistributors: number;
  totalShopkeepers: number;
  activeDistributors: number;
  activeShopkeepers: number;
  totalConnections: number;
  activeConnections: number;
  pendingConnections: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalProducts: number;
  averageOrderValue: number;
}

interface Activity {
  type: 'order' | 'connection';
  action: string;
  description: string;
  amount?: number;
  status: string;
  timestamp: string;
}

export function AdminDashboardComprehensive() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if admin is authenticated
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/activity'),
      ]);
      
      const data = statsRes.data;
      // Validate required fields
      if (data && typeof data === 'object') {
        setStats({
          totalUsers: data.totalUsers || 0,
          totalDistributors: data.totalDistributors || 0,
          totalShopkeepers: data.totalShopkeepers || 0,
          activeDistributors: data.activeDistributors || 0,
          activeShopkeepers: data.activeShopkeepers || 0,
          totalConnections: data.totalConnections || 0,
          activeConnections: data.activeConnections || 0,
          pendingConnections: data.pendingConnections || 0,
          totalOrders: data.totalOrders || 0,
          completedOrders: data.completedOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          totalProducts: data.totalProducts || 0,
          averageOrderValue: data.averageOrderValue || 0,
        });
      }
      
      setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError('Failed to load admin data. Please try again.');
      setStats(null);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminAuthenticated()) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin">
            <Activity className="w-8 h-8 text-brand-600" />
          </div>
          <p className="text-gray-600 mt-2">Loading admin data...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-red-600 mt-4 font-medium">{error || 'Failed to load admin data'}</p>
          <button
            onClick={() => fetchData()}
            className="mt-6 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalActive = (stats.activeDistributors || 0) + (stats.activeShopkeepers || 0);
  const totalRoles = (stats.totalDistributors || 0) + (stats.totalShopkeepers || 0);
  const userGrowth = totalRoles > 0 ? (totalActive / totalRoles) * 100 : 0;
  const averageOrderValue = stats.averageOrderValue || 0;

  const StatCard = ({ label, value, icon: Icon, color, trend, subValue }: any) => (
    <div className="card p-5 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {typeof value === 'number' ? (value > 999 ? (value / 1000).toFixed(1) + 'K' : value.toFixed ? value.toFixed(0) : value) : value || '0'}
          </div>
          {subValue && <div className="text-xs text-gray-600 mt-1">{subValue}</div>}
          {trend !== undefined && trend !== null && !isNaN(trend) && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend >= 0 ? '+' : ''}{trend.toFixed ? trend.toFixed(0) : trend}%
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <MobileHeader title="Admin Control Panel" subtitle="Real-time Platform Metrics" />

      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Control Center</h1>
          <p className="text-sm text-gray-600 mt-1">Complete visibility over DairyWalla network</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Live Tracking</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="bg-blue-50 text-blue-600"
          subValue={`${stats.activeDistributors + stats.activeShopkeepers} active`}
          trend={userGrowth}
        />
        <StatCard
          label="Distributors"
          value={stats.totalDistributors}
          icon={Store}
          color="bg-purple-50 text-purple-600"
          subValue={`${stats.activeDistributors} active`}
        />
        <StatCard
          label="Shopkeepers"
          value={stats.totalShopkeepers}
          icon={Users}
          color="bg-orange-50 text-orange-600"
          subValue={`${stats.activeShopkeepers} active`}
        />
        <StatCard
          label="Distributor Sales"
          value={`₹${((stats.totalRevenue || 0) / 100000).toFixed(1)}L`}
          icon={IndianRupee}
          color="bg-emerald-50 text-emerald-600"
          subValue={`Avg: ₹${averageOrderValue.toFixed(0)}`}
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={Activity}
          color="bg-indigo-50 text-indigo-600"
          subValue={`${stats.completedOrders} completed`}
        />
        <StatCard
          label="Active Connections"
          value={stats.activeConnections}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
          subValue={`${stats.pendingConnections} pending`}
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingConnections}
          icon={Clock}
          color="bg-yellow-50 text-yellow-600"
          subValue="Needs approval"
        />
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          icon={Package}
          color="bg-pink-50 text-pink-600"
          subValue="In catalog"
        />
        <StatCard
          label="Avg Order Value"
          value={`₹${averageOrderValue.toFixed(0)}`}
          icon={DollarSign}
          color="bg-cyan-50 text-cyan-600"
          subValue="Per order"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Recent Platform Activity
            </h2>
            <button className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View All
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No recent activity</p>
            ) : (
              activity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'order' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {item.type === 'order' ? (
                      <Activity className="w-4 h-4 text-blue-600" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.action}</p>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{item.description}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                        item.status === 'active' || item.status === 'fulfilled'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {item.amount && <span className="text-xs font-semibold text-gray-900">₹{item.amount}</span>}
                      <span className="text-xs text-gray-500">{format(new Date(item.timestamp), 'MMM dd, hh:mm a')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              System Health
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Network Health</span>
                  <span className="text-sm font-semibold text-green-600">98%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Database Load</span>
                  <span className="text-sm font-semibold text-blue-600">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">API Response</span>
                  <span className="text-sm font-semibold text-purple-600">120ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Connection Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Active</span>
                <span className="text-lg font-bold text-green-600">{stats.activeConnections}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Pending</span>
                <span className="text-lg font-bold text-yellow-600">{stats.pendingConnections}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Success Rate</span>
                <span className="text-lg font-bold text-blue-600">
                  {stats.totalConnections > 0 ? ((stats.activeConnections / stats.totalConnections) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
