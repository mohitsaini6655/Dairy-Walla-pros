import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  IndianRupee,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { isAdminAuthenticated } from './AdminLoginPage';

export function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
    fetchAnalytics();
  }, [dateRange, navigate]);

  const fetchAnalytics = async () => {
    try {
      const days = dateRange.replace('d', '');
      const res = await apiClient.get(`/admin/stats?days=${days}`);
      setStats(res.data);
      setError('');
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <Activity className="w-8 h-8 text-brand-600 mx-auto animate-spin" />
          <p className={error ? 'text-red-600 mt-2' : 'text-gray-600 mt-2'}>
            {error || 'Loading analytics...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated()) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-1">Deep dive into platform performance</p>
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                dateRange === range
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm font-medium">Total Revenue</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                ₹{(stats.totalRevenue / 100000).toFixed(1)}L
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>+12.5% from last period</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm font-medium">Total Orders</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-3">
            {stats.completedOrders} completed / {stats.totalOrders - stats.completedOrders} pending
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm font-medium">Avg Order Value</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                ₹{stats.averageOrderValue.toFixed(0)}
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-3">Per transaction average</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm font-medium">Conversion Rate</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {((stats.completedOrders / Math.max(stats.totalOrders, 1)) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-3">Orders completed successfully</div>
        </div>
      </div>

      {/* User Growth & Network */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Network Growth</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Active Distributors</span>
                <span className="font-semibold text-gray-900">{stats.activeDistributors}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.activeDistributors / stats.totalDistributors) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((stats.activeDistributors / stats.totalDistributors) * 100).toFixed(0)}% of total
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Active Shopkeepers</span>
                <span className="font-semibold text-gray-900">{stats.activeShopkeepers}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.activeShopkeepers / stats.totalShopkeepers) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((stats.activeShopkeepers / stats.totalShopkeepers) * 100).toFixed(0)}% of total
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Active Connections</span>
                <span className="font-semibold text-gray-900">{stats.activeConnections}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.activeConnections / stats.totalConnections) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((stats.activeConnections / stats.totalConnections) * 100).toFixed(0)}% of total
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connection Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-gray-900">{stats.activeConnections} Active</div>
              <div className="text-sm text-gray-600 mt-1">Current active business connections</div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-semibold text-gray-900">{stats.pendingConnections} Pending</div>
              <div className="text-sm text-gray-600 mt-1">Awaiting approval or response</div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-semibold text-gray-900">
                {(stats.totalConnections / Math.max(stats.totalDistributors, 1)).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg connections per distributor</div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="font-semibold text-gray-900">
                {(stats.totalConnections / Math.max(stats.totalShopkeepers, 1)).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg suppliers per shopkeeper</div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Metrics */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Performance</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
            <div className="text-xs text-gray-600 mt-1">Products Listed</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {(stats.totalOrders / Math.max(stats.totalShopkeepers, 1)).toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Orders per Shopkeeper</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {((stats.totalRevenue / stats.totalOrders) || 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Revenue per Order</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round((stats.activeConnections / stats.totalUsers) * 100)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Connected User Rate</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {((stats.completedOrders / Math.max(stats.totalOrders, 1)) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Order Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
