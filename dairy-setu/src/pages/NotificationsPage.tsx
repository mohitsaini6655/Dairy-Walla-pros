import { Bell, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { EmptyState } from '../components/ui/EmptyState';
import { MobileHeader } from '../components/layout/MobileHeader';
import { format } from 'date-fns';

const typeConfig: Record<string, { emoji: string; color: string }> = {
  late_order: { emoji: '⏰', color: 'bg-yellow-100' },
  order_placed: { emoji: '📦', color: 'bg-blue-100' },
  order_confirmed: { emoji: '✅', color: 'bg-green-100' },
  order_accepted: { emoji: '✅', color: 'bg-green-100' },
  order_rejected: { emoji: '❌', color: 'bg-red-100' },
  payment_completed: { emoji: '🎉', color: 'bg-emerald-100' },
  new_connection: { emoji: '🔗', color: 'bg-purple-100' },
  connection_approved: { emoji: '✅', color: 'bg-green-100' },
  connection_rejected: { emoji: '❌', color: 'bg-red-100' },
};

export function NotificationsPage() {
  const { user } = useAuthStore();
  const { notifications, markNotificationRead, markAllRead } = useAppStore();

  const myNotifications = notifications.filter(n => n.userId === user?.id);
  const unread = myNotifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <MobileHeader title="Notifications" subtitle={`${unread} unread`} />
      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => user && markAllRead(user.id)}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>
      {/* Mobile mark all read */}
      {unread > 0 && (
        <div className="md:hidden flex justify-end mb-3">
          <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => user && markAllRead(user.id)}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        </div>
      )}

      {myNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <div className="space-y-2">
          {myNotifications.map(n => {
            const config = typeConfig[n.type] || { emoji: '🔔', color: 'bg-gray-100' };
            return (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-3 cursor-pointer transition-all ${!n.read ? 'border-brand-200 bg-brand-50/30' : ''}`}
                onClick={() => markNotificationRead(n.id)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <span className="text-base">{config.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(n.createdAt), 'dd MMM, h:mm a')}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
