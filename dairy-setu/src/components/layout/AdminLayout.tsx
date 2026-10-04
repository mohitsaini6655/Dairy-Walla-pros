import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Link2,
  TrendingUp,
  LogOut,
  Menu,
  X,
  FileText,
} from 'lucide-react';
import { clearAdminSession, isAdminAuthenticated } from '../../pages/admin/AdminLoginPage';

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate('/admin');
    }
  }, [navigate]);

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: BarChart3,
      description: 'Platform overview',
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
      description: 'Manage all users',
    },
    {
      label: 'Connections',
      href: '/admin/connections',
      icon: Link2,
      description: 'Manage connections',
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: TrendingUp,
      description: 'Business analytics',
    },
    {
      label: 'Blogs',
      href: '/admin/blogs',
      icon: FileText,
      description: 'Manage public blogs',
    },
  ];

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin');
  };

  const isActive = (href: string) => location.pathname === href;

  if (!isAdminAuthenticated()) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">DairyWalla</div>
                <div className="text-xs text-gray-500">Admin Panel</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                    active
                      ? 'bg-brand-50 text-brand-600 border border-brand-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center gap-2 justify-center font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 hidden sm:block">
            <h1 className="font-semibold text-gray-900">
              {menuItems.find(m => isActive(m.href))?.label || 'Admin Panel'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">System Live</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
