import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, CheckCircle, Clock, XCircle, Search, MapPin, Tag, Phone, Repeat, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ui/Toast';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { Modal } from '../../components/ui/Modal';
import type { Connection } from '../../types';

// Reminder sound file path. Make sure to place this file in your `public/sounds/` directory.
const reminderSound = '/sounds/reminder-tone.mp3';

export function ConnectionPage() {
  const { user } = useAuthStore();
  const { connections, distributorProfiles, shopkeeperProfiles, requestConnection, toggleConnectionAutoOrder, notifications , cancelConnection } = useAppStore();
  const { show } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code')?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [togglingConnectionId, setTogglingConnectionId] = useState<string | null>(null);
  const [editingAutoOrderConn, setEditingAutoOrderConn] = useState<Connection | null>(null);
  const [autoOrderTime, setAutoOrderTime] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastNotifCount = useRef(0);

  const myUnreadNotifications = useMemo(() => {
    return notifications.filter(n => n.userId === user?.id && !n.read);
  }, [notifications, user?.id]);

  useEffect(() => {
    const sortedNotifs = [...myUnreadNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestUnread = sortedNotifs[0];

    // If there's a new unread notification since last check, see if it's a reminder
    if (myUnreadNotifications.length > lastNotifCount.current) {
      if (latestUnread && latestUnread.type === 'order_reminder') {
        audioRef.current?.play().catch(e => console.error("Audio play failed. User interaction might be needed.", e));
      }
    }
    lastNotifCount.current = myUnreadNotifications.length;
  }, [myUnreadNotifications.length, audioRef]);

  useEffect(() => {
    if (searchParams.get('code')) {
      show('Code applied! Click "Send Connection Request" to connect.', 'info');
    }
  }, [searchParams, show]);

  const shopProfile = shopkeeperProfiles.find(sp => sp.userId === user?.id);

  const myConnections = useMemo(() => {
    const raw = connections.filter(c => c.shopkeeperId === shopProfile?.id);
    const statusRank = (status: string) => (status === 'active' ? 3 : status === 'pending' ? 2 : 1);
    const byDistributor = new Map<string, typeof raw[number]>();

    raw.forEach(conn => {
      const existing = byDistributor.get(conn.distributorId);
      if (!existing) {
        byDistributor.set(conn.distributorId, conn);
        return;
      }
      const existingRank = statusRank(existing.status);
      const nextRank = statusRank(conn.status);
      if (nextRank > existingRank) {
        byDistributor.set(conn.distributorId, conn);
        return;
      }
      if (nextRank === existingRank) {
        const existingTs = new Date(existing.createdAt).getTime();
        const nextTs = new Date(conn.createdAt).getTime();
        if (nextTs > existingTs) byDistributor.set(conn.distributorId, conn);
      }
    });

    return Array.from(byDistributor.values()).sort((a, b) => {
      const rankDelta = statusRank(b.status) - statusRank(a.status);
      if (rankDelta !== 0) return rankDelta;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [connections, shopProfile?.id]);

  const activeCount = myConnections.filter(c => c.status === 'active').length;
  const pendingCount = myConnections.filter(c => c.status === 'pending').length;

  const getDistributorPhone = (distributorId: string) => {
    const distributorProfile = distributorProfiles.find(dp => dp.id === distributorId);
    const phone = (
      distributorProfile as unknown as { phone?: string; contactPhone?: string } | undefined
    )?.phone || (
      distributorProfile as unknown as { phone?: string; contactPhone?: string } | undefined
    )?.contactPhone || '';
    return {
      profile: distributorProfile,
      phone,
      tel: phone.replace(/[^\d+]/g, ''),
    };
  };

  const getConnectionStatusForDistributor = (distributorId: string) =>
    myConnections.find(c => c.distributorId === distributorId)?.status;

  const searchResults = showSearch
    ? distributorProfiles.filter(dp => {
        const cityMatch = !searchCity || dp.city?.toLowerCase().includes(searchCity.toLowerCase());
        const companyMatch = !searchCompany || dp.company?.toLowerCase().includes(searchCompany.toLowerCase());
        return cityMatch && companyMatch;
      })
    : [];

  const handleDisconnect = async (connId: string, isPending: boolean) => {
    const msg = isPending ? 'Cancel connection request?' : 'Are you sure you want to disconnect from this distributor?';
    if (confirm(msg)) {
      const success = await cancelConnection(connId);
      if (success) {
        show(isPending ? 'Request cancelled' : 'Disconnected successfully');
      } else {
        show('Failed to complete action', 'error');
      }
    }
  };

  const handleConnect = async () => {
    if (!code.trim()) { show('Enter a connection code or phone number', 'error'); return; }
    if (!user || !shopProfile) { show('Shopkeeper profile is missing. Please complete your profile setup.', 'error'); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);

    const success = await requestConnection(
      shopProfile.id,
      user.name,
      shopProfile.shopName || `${user.name}'s Shop`,
      code.trim(),
      user.phone
    );

    if (success) {
      show('Connection request sent!');
      setCode('');
    } else {
      show('Invalid code or already connected', 'error');
    }
  };

  const handleConnectFromSearch = (connectionCode: string) => {
    setCode(connectionCode);
    setShowSearch(false);
    show('Connection code filled! Now click send request.', 'info');
  };

  const handleToggleAutoOrder = async (conn: Connection, enabled: boolean) => {
    if (enabled) {
      setEditingAutoOrderConn(conn);
      setAutoOrderTime(conn.autoOrderTime || '14:00');
    } else {
      setTogglingConnectionId(conn.id);
      try {
        await toggleConnectionAutoOrder(conn.id, false);
        show('Auto order disabled successfully.');
      } catch {
        show('Failed to update auto order settings.', 'error');
      } finally {
        setTogglingConnectionId(null);
      }
    }
  };

  const handleSaveAutoOrder = async () => {
    if (!editingAutoOrderConn) return;
    setTogglingConnectionId(editingAutoOrderConn.id);
    try {
      await toggleConnectionAutoOrder(editingAutoOrderConn.id, true, autoOrderTime);
      show('Auto order enabled successfully.');
      setEditingAutoOrderConn(null);
    } catch {
      show('Failed to update auto order settings.', 'error');
    } finally {
      setTogglingConnectionId(null);
    }
  };

  const statusConfig = {
    active: { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Connected', className: 'bg-green-50 border-green-200' },
    pending: { icon: <Clock className="w-5 h-5 text-yellow-500" />, label: 'Pending Approval', className: 'bg-yellow-50 border-yellow-200' },
    rejected: { icon: <XCircle className="w-5 h-5 text-red-500" />, label: 'Rejected', className: 'bg-red-50 border-red-200' },
  } as const;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <audio ref={audioRef} src={reminderSound} preload="auto" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <MobileHeader title="My Distributors" subtitle={`${activeCount} connected · ${pendingCount} pending`} />
        </div>
        <button onClick={() => navigate('/shop/notifications')} className="relative p-2 -mr-2 mt-1 flex-shrink-0">
          <Bell className="w-6 h-6 text-gray-500" />
          {myUnreadNotifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
          )}
        </button>
      </div>
      <div className="hidden md:block mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Distributors</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeCount} connected · {pendingCount} pending</p>
      </div>

      {myConnections.length > 0 && (
        <div className="space-y-4 mb-6">
          {myConnections.map(conn => {
            const { profile, phone, tel } = getDistributorPhone(conn.distributorId);
            return (
              <div key={conn.id} className={`card p-5 border ${statusConfig[conn.status].className}`}>
                <div className="flex items-center gap-3 mb-3">
                  {statusConfig[conn.status].icon}
                  <div>
                    <div className="font-semibold text-gray-900">{conn.businessName}</div>
                    <div className="text-xs text-gray-500">{statusConfig[conn.status].label}</div>
                  </div>
                </div>

                {conn.status === 'active' && profile && (
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Order Window</span>
                      <span className="font-medium text-gray-900">{profile.orderWindowStart} - {profile.orderWindowCutoff}</span>
                    </div>
                    {phone && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Phone</span>
                        <a href={`tel:${tel}`} className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {phone}
                        </a>
                      </div>
                    )}
                    {conn.deliveryGroupName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery Area</span>
                        <span className="font-medium text-gray-900">{conn.deliveryGroupName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 inline-flex items-center gap-1">
                        <Repeat className="w-3.5 h-3.5" /> Auto Order {conn.autoOrderEnabled && conn.autoOrderTime ? `(${conn.autoOrderTime})` : ''}
                      </span>
                      <button
                        onClick={() => void handleToggleAutoOrder(conn, !conn.autoOrderEnabled)}
                        disabled={togglingConnectionId === conn.id}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          conn.autoOrderEnabled
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        } ${togglingConnectionId === conn.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {togglingConnectionId === conn.id ? 'Saving...' : conn.autoOrderEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                )}

                {conn.status === 'pending' && (
                  <p className="text-xs text-yellow-700 mt-2">
                    Your request is waiting for the distributor to approve. You will be notified once approved.
                  </p>
                )}
                
                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-end">
                  <button onClick={() => handleDisconnect(conn.id, conn.status === 'pending')} className="btn-danger py-1 px-3 text-xs">
                    {conn.status === 'pending' ? 'Cancel Request' : 'Disconnect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={() => navigate('/shop/discover')}
          className="w-full p-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl flex items-center justify-between hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5" />
            <div className="text-left">
              <div className="font-semibold text-sm">Discover Distributors</div>
              <div className="text-xs opacity-90">Find nearby distributors</div>
            </div>
          </div>
          <span className="text-xl">-&gt;</span>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-400">OR</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Connect with Distributor</h2>
          </div>
          <div className="mb-4">
            <label className="label">Connection Code or Phone Number</label>
            <input
              className="input"
              placeholder="e.g. SHARMA-7X3 or 9876543210"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
            />
            <p className="text-xs text-gray-400 mt-1.5">Ask your distributor for their connection code</p>
          </div>
          <button className="btn-primary w-full" onClick={handleConnect} disabled={loading}>
            {loading ? 'Sending request...' : 'Send Connection Request'}
          </button>
        </div>

        <div className="card p-5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Search Distributors</h2>
            </div>
            <span className="text-xs text-brand-600">{showSearch ? 'Hide' : 'Show'}</span>
          </button>

          {showSearch && (
            <div className="space-y-3">
              <div>
                <label className="label flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Search by City
                </label>
                <input
                  className="input"
                  placeholder="e.g. Ajmer"
                  value={searchCity}
                  onChange={e => setSearchCity(e.target.value)}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Search by Company
                </label>
                <input
                  className="input"
                  placeholder="e.g. Amul"
                  value={searchCompany}
                  onChange={e => setSearchCompany(e.target.value)}
                />
              </div>

              {(searchCity || searchCompany) && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Results ({searchResults.length})
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-4">No distributors found</div>
                  ) : (
                    searchResults.map(dp => {
                      const status = getConnectionStatusForDistributor(dp.id);
                      return (
                        <div key={dp.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">{dp.businessName}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {dp.company && <span className="badge-blue mr-1">{dp.company}</span>}
                                {dp.city && <span>{dp.city}</span>}
                              </div>
                              {dp.deliveryAreas && (
                                <div className="text-xs text-gray-400 mt-1">Areas: {dp.deliveryAreas}</div>
                              )}
                              {status && status !== 'rejected' && (
                                <div className="text-xs text-green-700 mt-1">
                                  {status === 'active' ? 'Already connected' : 'Request pending'}
                                </div>
                              )}
                            </div>
                            {status && status !== 'rejected' ? (
                              <button className="btn-secondary text-xs py-1.5 px-3 opacity-60 cursor-not-allowed" disabled>
                                Connected
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectFromSearch(dp.connectionCode)}
                                className="btn-secondary text-xs py-1.5 px-3"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Auto Order Time Modal */}
      <Modal open={!!editingAutoOrderConn} onClose={() => setEditingAutoOrderConn(null)} title="Auto Order Time">
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Select a specific time to automatically place your order every day. Make sure it is within the distributor's order window.
          </p>
          <div className="mb-4">
            <label className="label">Time (HH:MM)</label>
            <input
              type="time"
              className="input w-full"
              value={autoOrderTime}
              onChange={e => setAutoOrderTime(e.target.value)}
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-secondary flex-1" onClick={() => setEditingAutoOrderConn(null)}>
              Cancel
            </button>
            <button 
              className="btn-primary flex-1" 
              onClick={() => void handleSaveAutoOrder()}
              disabled={togglingConnectionId === editingAutoOrderConn?.id || !autoOrderTime}
            >
              {togglingConnectionId === editingAutoOrderConn?.id ? 'Saving...' : 'Enable Auto Order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
