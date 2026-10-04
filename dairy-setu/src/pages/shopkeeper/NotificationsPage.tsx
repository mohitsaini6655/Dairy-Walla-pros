import { useEffect } from 'react';
import { Bell, MessageSquareWarning, CheckCircle, XCircle, UserPlus, PartyPopper } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { Notification } from '../../types';
import type { ReactElement } from 'react';

const notificationConfig: Record<string, { icon: ReactElement; color: string }> = {
  order_reminder: { icon: <MessageSquareWarning className="w-5 h-5" />, color: 'text-yellow-600' },
  order_accepted: { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600' },
  order_rejected: { icon: <XCircle className="w-5 h-5" />, color: 'text-red-600' },
  payment_completed: { icon: <PartyPopper className="w-5 h-5" />, color: 'text-emerald-600' },
  connection_approved: { icon: <UserPlus className="w-5 h-5" />, color: 'text-blue-600' },
  default: { icon: <Bell className="w-5 h-5" />, color: 'text-gray-500' },
};

function getNotificationIcon(type: string): ReactElement {
  const config = notificationConfig[type] || notificationConfig.default;
  return <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${config.color.replace('text-', 'bg-').replace('-600', '-100')}`}>{config.icon}</div>;
}

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach(notif => {
    const date = parseISO(notif.createdAt);
    let key: string;
    if (isToday(date)) key = 'Today';
    else if (isYesterday(date)) key = 'Yesterday';
    else key = format(date, 'dd MMMM yyyy');
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(notif);
  });
  return groups;
}

export function NotificationsPage() {
  const { user } = useAuthStore();
  const { notifications, markAllRead } = useAppStore();

  const myNotifications = notifications
    .filter(n => n.userId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    // Mark all as read when component mounts
    if (user?.id && myNotifications.some(n => !n.read) && markAllRead) {
      markAllRead(user.id);
    }
  }, [user?.id, markAllRead, myNotifications.length]);

  const groupedNotifications = groupNotificationsByDate(myNotifications);
  const dateGroups = Object.keys(groupedNotifications);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <MobileHeader title="Notifications" showBack />
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">All your alerts and updates</p>
      </div>

      {myNotifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-8 h-8" />} title="No notifications yet" description="Updates from your distributors will appear here." />
      ) : (
        <div className="space-y-6">
          {dateGroups.map(date => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">{date}</h2>
              <div className="space-y-3">
                {groupedNotifications[date].map(notif => (
                  <div key={notif.id} className={`card p-4 flex items-start gap-4 ${!notif.read ? 'bg-blue-50 border border-blue-200' : ''}`}>
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1"><p className="text-sm text-gray-800">{notif.message}</p><p className="text-xs text-gray-400 mt-1">{format(parseISO(notif.createdAt), 'h:mm a')}</p></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
