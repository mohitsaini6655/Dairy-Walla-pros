import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';

export function ShareLinkHandler() {
  const { code } = useParams();
  const { isAuthenticated, user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { show } = useToast();

  useEffect(() => {
    // wait for auth loading to finish
    if (loading) return;

    if (!code) {
      navigate('/');
      return;
    }

    if (!isAuthenticated || !user) {
      localStorage.setItem('dairy-walla-pending-connect', code);
      show('Please login or create a Shopkeeper account to connect', 'info');
      navigate('/login');
      return;
    }

    if (user.role === 'distributor') {
      show('Only shopkeepers can connect to distributors', 'error');
      navigate('/distributor');
      return;
    }

    if (user.role === 'shopkeeper') {
      navigate(`/shop/connection?code=${code}`);
    }
  }, [code, isAuthenticated, user, loading, navigate, show]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    </div>
  );
}
