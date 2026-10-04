import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ConfirmProfilePage } from './pages/auth/ConfirmProfilePage';
import { DemoFormPage } from './pages/DemoFormPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { DashboardPage } from './pages/distributor/DashboardPage';
import { OrdersPage } from './pages/distributor/OrdersPage';
import { SummaryPage } from './pages/distributor/SummaryPage';
import { CatalogPage } from './pages/distributor/CatalogPage';
import { ConnectionsPage } from './pages/distributor/ConnectionsPage';
import { InvoicesPage } from './pages/distributor/InvoicesPage';
import { SettingsPage } from './pages/distributor/SettingsPage';
import { ShopkeeperProfilePage } from './pages/distributor/ShopkeeperProfilePage';
import { ShopCatalogPage } from './pages/shopkeeper/CatalogPage';
import { OrderReviewPage } from './pages/shopkeeper/OrderReviewPage';
import { OrderHistoryPage } from './pages/shopkeeper/OrderHistoryPage';
import { ConnectionPage } from './pages/shopkeeper/ConnectionPage';
import { DiscoverPage } from './pages/shopkeeper/DiscoverPage';
import { DistributorProfilePage } from './pages/shopkeeper/DistributorProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardComprehensive } from './pages/admin/AdminDashboardComprehensive';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminConnectionsPage } from './pages/admin/AdminConnectionsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminBlogsPage } from './pages/admin/AdminBlogsPage';
import { BlogsPage } from './pages/BlogsPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { ShareLinkHandler } from './pages/ShareLinkHandler';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsConditionsPage } from './pages/TermsConditionsPage';
import { ToastContainer } from './components/ui/Toast';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

const queryClient = new QueryClient();

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new window.AudioContext();
  }
  return sharedAudioContext;
}

async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied' as NotificationPermission;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function playNotificationTune() {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => undefined);
  }

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
  gain.connect(audioContext.destination);

  const tone1 = audioContext.createOscillator();
  tone1.type = 'sine';
  tone1.frequency.setValueAtTime(880, audioContext.currentTime);
  tone1.connect(gain);
  tone1.start();
  tone1.stop(audioContext.currentTime + 0.18);

  const tone2 = audioContext.createOscillator();
  tone2.type = 'sine';
  tone2.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.18);
  tone2.connect(gain);
  tone2.start(audioContext.currentTime + 0.18);
  tone2.stop(audioContext.currentTime + 0.42);
}

function showSystemNotification(message: string, id: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification('Dairy Walla Alert', {
    body: message || 'You have a new update',
    tag: id,
    icon: '/dairy-walla-logo.webp',
    badge: '/dairy-walla-logo.webp',
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

function AppWithAuth() {
  const { isAuthenticated, user, loadUser } = useAuthStore();
  const {
    fetchDistributorProfile,
    fetchShopkeeperProfile,
    fetchAllDistributors,
    fetchConnections,
    fetchProducts,
    fetchOrders,
    fetchNotifications,
    fetchDeliveryGroups,
    runAutoOrdersForDistributor,
  } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    loadUser().finally(() => {
      if (alive) setReady(true);
    });

    return () => {
      alive = false;
    };
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;

    const hydrateAppData = async () => {
      try {
        if (user.role === 'distributor') {
          const dp = await fetchDistributorProfile(user.id);
          if (cancelled) return;
          if (dp) {
            await Promise.all([
              fetchProducts(dp.id),
              fetchConnections(user.id, 'distributor'),
              fetchDeliveryGroups(dp.id),
            ]);
            if (cancelled) return;
            await runAutoOrdersForDistributor(user.id);
            if (cancelled) return;
            await fetchOrders(user.id, 'distributor');
          }
        } else {
          await fetchShopkeeperProfile(user.id);
          if (cancelled) return;
          await fetchAllDistributors();
          if (cancelled) return;
          await Promise.all([
            fetchConnections(user.id, 'shopkeeper'),
            fetchOrders(user.id, 'shopkeeper'),
          ]);
        }
        if (!cancelled) {
          await fetchNotifications(user.id);
        }
      } catch {
        // Non-blocking hydration: auth state ko stable rakho.
      }
    };

    void hydrateAppData();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    user?.id,
    user?.role,
    fetchDistributorProfile,
    fetchShopkeeperProfile,
    fetchAllDistributors,
    fetchConnections,
    fetchProducts,
    fetchOrders,
    fetchNotifications,
    fetchDeliveryGroups,
    runAutoOrdersForDistributor,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const requestOnIntent = () => {
      void ensureNotificationPermission();
    };
    window.addEventListener('pointerdown', requestOnIntent, { once: true });
    window.addEventListener('keydown', requestOnIntent, { once: true });
    void ensureNotificationPermission();

    const knownIds = new Set(useAppStore.getState().notifications.map(n => n.id));

    const pollNotifications = async () => {
      await fetchNotifications(user.id);
      const currentNotifs = useAppStore.getState().notifications;

      const fresh = currentNotifs.filter(incoming => !knownIds.has(incoming.id));
      if (fresh.length === 0) return;

      fresh.forEach(incoming => knownIds.add(incoming.id));
      playNotificationTune();
      fresh.forEach(incoming => showSystemNotification(incoming.message, incoming.id));
    };

    void pollNotifications();
    // Poll notifications every 10 seconds since Supabase real-time is removed
    const intervalId = setInterval(pollNotifications, 10000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('pointerdown', requestOnIntent);
      window.removeEventListener('keydown', requestOnIntent);
    };
  }, [isAuthenticated, user?.id]);

  if (!ready) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/confirm" element={<ConfirmProfilePage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated && user
          ? <Navigate to={user?.role === 'distributor' ? '/distributor' : '/shop'} replace />
          : <LandingPage />
      } />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/confirm" element={<ConfirmProfilePage />} />
      <Route path="/demo" element={<DemoFormPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/blogs" element={<BlogsPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-conditions" element={<TermsConditionsPage />} />
      <Route path="/d/:code" element={<ShareLinkHandler />} />

      <Route path="/distributor" element={
        !isAuthenticated || !user
          ? <Navigate to="/login" replace />
          : user?.role !== 'distributor'
            ? <Navigate to="/shop" replace />
            : <AppLayout />
      }>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="shopkeeper/:shopkeeperId" element={<ShopkeeperProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/shop" element={
        !isAuthenticated || !user
          ? <Navigate to="/login" replace />
          : user?.role !== 'shopkeeper'
            ? <Navigate to="/distributor" replace />
            : <AppLayout />
      }>
        <Route index element={<ShopCatalogPage />} />
        <Route path="review" element={<OrderReviewPage />} />
        <Route path="history" element={<OrderHistoryPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="connection" element={<ConnectionPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="distributor/:distributorId" element={<DistributorProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboardComprehensive /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
      <Route path="/admin/connections" element={<AdminLayout><AdminConnectionsPage /></AdminLayout>} />
      <Route path="/admin/analytics" element={<AdminLayout><AdminAnalyticsPage /></AdminLayout>} />
      <Route path="/admin/blogs" element={<AdminLayout><AdminBlogsPage /></AdminLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWithAuth />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
