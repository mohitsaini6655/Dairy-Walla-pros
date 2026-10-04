import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { BrandLogo } from '../ui/BrandLogo';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
}

export function MobileHeader({ title, subtitle, showBack, backTo }: MobileHeaderProps) {
  const { user } = useAuthStore();
  const { notifications } = useAppStore();
  const navigate = useNavigate();

  const unread = notifications.filter(n => n.userId === user?.id && !n.read).length;
  const notifPath = user?.role === 'distributor' ? '/distributor/notifications' : '/shop/notifications';

  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
      {showBack && (
        <button
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
          className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {!showBack && (
        <div className="w-8 h-8 rounded-lg border border-gray-200 bg-white p-1 flex-shrink-0">
          <BrandLogo className="w-full h-full rounded-md" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 truncate">{subtitle}</div>}
      </div>

      {!showBack && (
        <button
          onClick={() => navigate(notifPath)}
          className="relative p-1.5 rounded-lg hover:bg-gray-100"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
