import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck, BarChart3 } from 'lucide-react';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { apiClient } from '../../lib/apiClient';

const ADMIN_SESSION_KEY = 'ds_admin_session';
const ADMIN_TOKEN_KEY = 'ds_admin_token';

export function setAdminSession(token: string) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function isAdminAuthenticated() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' && Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY));
}

export function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/admin/login', { password });
      const token = res.data?.token;
      if (!token) throw new Error('Admin token missing');
      setAdminSession(token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Admin login failed. Try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '1.5rem', background: 'white', border: '3px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', padding: '0.5rem', marginBottom: '1rem' }}>
            <BrandLogo className="w-full h-full rounded-lg" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
            Admin Control Panel
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '0.25rem' }}>
            DairyWalla Platform Management
          </p>
        </div>

        {/* Login Card */}
        <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          {/* Features Info */}
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <ShieldCheck style={{ width: '1.25rem', height: '1.25rem', color: '#10b981' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>Secure Admin Access</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <BarChart3 style={{ width: '1.25rem', height: '1.25rem', color: '#667eea' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>Real-time Analytics</span>
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#9ca3af' }} />
              <input
                type={showPass ? 'text' : 'password'}
                style={{ 
                  background: '#f3f4f6', 
                  border: error ? '2px solid #ef4444' : '1px solid #d1d5db', 
                  borderRadius: '0.75rem', 
                  paddingLeft: '2.5rem', 
                  paddingRight: '2.5rem', 
                  paddingTop: '0.75rem', 
                  paddingBottom: '0.75rem', 
                  fontSize: '0.875rem', 
                  width: '100%', 
                  outline: 'none',
                  color: '#1f2937',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.background = 'white'}
                onBlur={(e) => e.target.style.background = '#f3f4f6'}
                placeholder="Enter admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => !loading && e.key === 'Enter' && handleLogin()}
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                className="hover:text-gray-600 transition"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>{error}</p>}
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={!password || loading}
            style={{ 
              width: '100%', 
              background: password && !loading ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db', 
              color: 'white', 
              fontWeight: '600', 
              padding: '0.75rem', 
              borderRadius: '0.75rem', 
              fontSize: '0.875rem', 
              border: 'none', 
              cursor: password && !loading ? 'pointer' : 'not-allowed', 
              opacity: password && !loading ? 1 : 0.6,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (password && !loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(102, 126, 234, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>

          {/* Info */}
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.75rem', marginTop: '1.5rem', marginBottom: 0 }}>
            🔒 This page is restricted. Do not share this URL.
          </p>
        </div>

        {/* Features Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Dashboard</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Real-time Metrics</div>
          </div>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Users</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Full Management</div>
          </div>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Analytics</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Deep Insights</div>
          </div>
        </div>
      </div>
    </div>
  );
}
