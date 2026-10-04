import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '../../lib/apiClient';
import { isAdminAuthenticated } from './AdminLoginPage';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  businessName: string;
  connections: number;
  createdAt: string;
  verified: boolean;
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'distributor' | 'shopkeeper'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
      return;
    }
    fetchUsers();
  }, [navigate]);

  useEffect(() => {
    let filtered = users;

    if (search) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.businessName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filter !== 'all') {
      filtered = filtered.filter(u => u.role === filter);
    }

    setFilteredUsers(filtered);
  }, [search, filter, users]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/admin/users');
      setUsers(res.data);
      setError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!window.confirm('Are you sure? This will deactivate the user account.')) return;

    try {
      await apiClient.post(`/admin/ban-user/${userId}`, {
        reason: 'Admin action',
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const getRoleColor = (role: string) => {
    return role === 'distributor'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-orange-100 text-orange-700';
  };

  if (!isAdminAuthenticated()) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage all platform users, distributors, and shopkeepers</p>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email, name, or business..."
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
            <option value="all">All Users</option>
            <option value="distributor">Distributors</option>
            <option value="shopkeeper">Shopkeepers</option>
          </select>

          <button onClick={() => {
            const headers = ['Name', 'Email', 'Type', 'Business', 'Phone', 'Connections', 'Joined Date'];
            const csvData = filteredUsers.map(u => [
              `"${u.name || ''}"`,
              `"${u.email || ''}"`,
              `"${u.role === 'distributor' ? 'Distributor' : 'Shopkeeper'}"`,
              `"${u.businessName || ''}"`,
              `"${u.phone || ''}"`,
              u.connections,
              `"${format(new Date(u.createdAt), 'yyyy-MM-dd')}"`
            ].join(','));
            const csv = [headers.join(','), ...csvData].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={() => {
                        if (selectedUsers.size === filteredUsers.length) {
                          setSelectedUsers(new Set());
                        } else {
                          setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name & Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Contact</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Connections</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${getRoleColor(user.role)}`}>
                        {user.role === 'distributor' ? 'Distributor' : 'Shopkeeper'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.businessName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.phone || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-blue-600">{user.connections}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleBanUser(user.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Deactivate user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        Showing <span className="font-semibold">{filteredUsers.length}</span> of <span className="font-semibold">{users.length}</span> users
      </div>
    </div>
  );
}
