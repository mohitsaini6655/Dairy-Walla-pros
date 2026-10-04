import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  Download,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '../../lib/apiClient';
import { isAdminAuthenticated } from './AdminLoginPage';

interface Connection {
  id: string;
  shopkeeperId?: string;
  shopkeeperName?: string;
  shopName?: string;
  distributorId?: string;
  distributorName?: string;
  businessName?: string;
  status: string;
  createdAt: string;
  shopkeeperPhone?: string;
}

export function AdminConnectionsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
    fetchConnections();
  }, [navigate]);

  useEffect(() => {
    let filtered = connections;

    if (search) {
      filtered = filtered.filter(c =>
        c.shopName?.toLowerCase().includes(search.toLowerCase()) ||
        c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        c.shopkeeperName?.toLowerCase().includes(search.toLowerCase()) ||
        c.distributorName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter);
    }

    setFilteredConnections(filtered);
  }, [search, filter, connections]);

  const fetchConnections = async () => {
    try {
      const res = await apiClient.get('/admin/connections');
      setConnections(res.data);
      setError('');
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyConnection = async (connectionId: string) => {
    try {
      await apiClient.post(`/admin/verify-connection/${connectionId}`);
      fetchConnections();
    } catch (error) {
      console.error('Failed to verify connection:', error);
    }
  };

  const handleRejectConnection = async (connectionId: string) => {
    if (!window.confirm('Are you sure? This will delete the connection request.')) return;

    try {
      await apiClient.post(`/admin/reject-connection/${connectionId}`);
      fetchConnections();
    } catch (error) {
      console.error('Failed to reject connection:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'pending') return <Clock className="w-4 h-4" />;
    return null;
  };

  const stats = {
    active: connections.filter(c => c.status === 'active').length,
    pending: connections.filter(c => c.status === 'pending').length,
    rejected: connections.filter(c => c.status === 'rejected').length,
  };

  if (!isAdminAuthenticated()) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Connection Management</h1>
        <p className="text-gray-600 mt-1">Manage all distributor-shopkeeper connections</p>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">{connections.length}</div>
          <div className="text-xs text-gray-600 mt-1">Total Connections</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-600 mt-1">Active</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-600 mt-1">Pending</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-gray-600 mt-1">Rejected</div>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search connections by shop, business or person name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Only</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Connections List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading connections...</div>
        ) : filteredConnections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No connections found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Shopkeeper</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Distributor</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Connected On</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredConnections.map(conn => (
                  <tr key={conn.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{conn.shopName}</div>
                        <div className="text-xs text-gray-500">{conn.shopkeeperName}</div>
                        {conn.shopkeeperPhone && (
                          <div className="text-xs text-gray-500">{conn.shopkeeperPhone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{conn.businessName}</div>
                        <div className="text-xs text-gray-500">{conn.distributorName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${getStatusColor(conn.status)} flex items-center gap-1`}>
                          {getStatusIcon(conn.status)}
                          {conn.status.charAt(0).toUpperCase() + conn.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {format(new Date(conn.createdAt), 'MMM dd, yyyy hh:mm a')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                          <Eye className="w-4 h-4" />
                        </button>
                        {conn.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyConnection(conn.id)}
                              className="px-2.5 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectConnection(conn.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {conn.status === 'active' && (
                          <button
                            onClick={() => handleRejectConnection(conn.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Showing <span className="font-semibold">{filteredConnections.length}</span> of <span className="font-semibold">{connections.length}</span> connections
      </div>
    </div>
  );
}
