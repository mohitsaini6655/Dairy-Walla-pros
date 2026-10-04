import type { Notification, Role } from '../types';

type PageKey =
  | 'orders'
  | 'connections'
  | 'history'
  | 'myDistributor'
  | 'notifications';

const distributorMap: Record<string, PageKey> = {
  late_order: 'orders',
  order_placed: 'orders',
  new_connection: 'connections',
};

const shopkeeperMap: Record<string, PageKey> = {
  order_accepted: 'history',
  order_rejected: 'history',
  order_confirmed: 'history',
  connection_approved: 'myDistributor',
  connection_rejected: 'myDistributor',
};

export function hasUnreadForPage(
  notifications: Notification[],
  userId: string | undefined,
  role: Role | undefined,
  page: PageKey
) {
  if (!userId || !role) return false;

  if (page === 'notifications') {
    return notifications.some(n => n.userId === userId && !n.read);
  }

  const typeMap = role === 'distributor' ? distributorMap : shopkeeperMap;
  return notifications.some(
    n => n.userId === userId && !n.read && typeMap[n.type] === page
  );
}
