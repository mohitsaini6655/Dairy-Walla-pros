import { create } from 'zustand';
import axios from 'axios';
import { apiClient } from '../lib/apiClient';
import { inferBusinessLineFromCategory } from '../utils/businessLine';
import type {
  Connection, Product, Order, DeliveryGroup, Notification, CartItem,
  BusinessLine, ConnectionStatus, OrderStatus, PaymentStatus, DistributorProfile, ShopkeeperProfile
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ManualBillInput {
  distributorId: string;
  shopkeeperId?: string | null;
  shopkeeperName: string;
  shopName: string;
  items: Array<{ productId: string; quantity: number }>;
  gstEnabled?: boolean;
  gstPercent?: number;
  cgstPercent?: number;
  sgstPercent?: number;
  gstNumber?: string;
}

interface AppState {
  connections: Connection[];
  products: Product[];
  orders: Order[];
  deliveryGroups: DeliveryGroup[];
  notifications: Notification[];
  distributorProfiles: DistributorProfile[];
  shopkeeperProfiles: ShopkeeperProfile[];
  cart: CartItem[];
  loading: boolean;

  // Fetch actions
  fetchDistributorProfile: (userId: string) => Promise<DistributorProfile | null>;
  fetchShopkeeperProfile: (userId: string) => Promise<ShopkeeperProfile | null>;
  fetchShopkeeperProfileById: (shopkeeperId: string) => Promise<ShopkeeperProfile | null>;
  ensureShopkeeperProfile: (userId: string) => ShopkeeperProfile | null;
  fetchAllDistributors: (lat?: number, lng?: number) => Promise<void>;
  fetchConnections: (userId: string, role: 'distributor' | 'shopkeeper') => Promise<void>;
  fetchProducts: (distributorId: string) => Promise<void>;
  fetchOrders: (userId: string, role: 'distributor' | 'shopkeeper') => Promise<void>;
  fetchNotifications: (userId: string) => Promise<void>;
  fetchDeliveryGroups: (distributorId: string) => Promise<void>;

  // Profile actions
  createDistributorProfile: (userId: string, data: Partial<DistributorProfile>) => Promise<DistributorProfile | null>;
  createShopkeeperProfile: (userId: string, data: Partial<ShopkeeperProfile>) => Promise<ShopkeeperProfile | null>;
  updateDistributorSettings: (distributorId: string, updates: Partial<DistributorProfile>) => Promise<void>;
  updateShopkeeperProfile: (shopkeeperId: string, updates: Partial<ShopkeeperProfile>) => Promise<void>;

  // Connection actions
  requestConnection: (shopkeeperId: string, shopkeeperName: string, shopName: string, distributorCode: string, shopkeeperPhone?: string) => Promise<boolean>;
  cancelConnection: (connectionId: string) => Promise<boolean>;
  updateConnectionStatus: (connectionId: string, status: ConnectionStatus, deliveryGroupId?: string) => Promise<void>;
  assignDeliveryGroup: (connectionId: string, groupId: string, groupName: string) => Promise<void>;
  toggleConnectionAutoOrder: (connectionId: string, enabled: boolean, autoOrderTime?: string) => Promise<void>;
  runAutoOrdersForDistributor: (distributorUserId: string) => Promise<void>;

  // Product actions
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;

  // Order actions
  placeOrder: (shopkeeperId: string, shopkeeperName: string, shopName: string, distributorId: string, items: CartItem[], isLate: boolean, businessLine: BusinessLine) => Promise<Order>;
  createManualBill: (input: ManualBillInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
  updateOrder: (orderId: string, payload: Partial<Order>) => Promise<void>;

  // Delivery group actions
  addDeliveryGroup: (distributorId: string, name: string) => Promise<void>;
  deleteDeliveryGroup: (id: string) => Promise<void>;

  // Notification actions
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;

  // Cart actions (local only)
  setCartQuantity: (product: Product, quantity: number) => void;
  clearCart: () => void;
  resetState: () => void;
}

const initialState = {
  connections: [] as Connection[],
  products: [] as Product[],
  orders: [] as Order[],
  deliveryGroups: [] as DeliveryGroup[],
  notifications: [] as Notification[],
  distributorProfiles: [] as DistributorProfile[],
  shopkeeperProfiles: [] as ShopkeeperProfile[],
  cart: [] as CartItem[],
  loading: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  fetchDistributorProfile: async (userId) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/profiles/distributor/${userId}`);
      set(state => ({
        distributorProfiles: state.distributorProfiles.some(d => d.userId === userId)
          ? state.distributorProfiles.map(d => d.userId === userId ? data : d)
          : [...state.distributorProfiles, data]
      }));
      return data;
    } catch { return null; }
  },

  fetchShopkeeperProfile: async (userId) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/profiles/shopkeeper/${userId}`);
      set(state => ({
        shopkeeperProfiles: state.shopkeeperProfiles.some(s => s.userId === userId)
          ? state.shopkeeperProfiles.map(s => s.userId === userId ? data : s)
          : [...state.shopkeeperProfiles, data]
      }));
      return data;
    } catch { return null; }
  },

  ensureShopkeeperProfile: (userId) => {
    const existing = get().shopkeeperProfiles.find(s => s.userId === userId);
    if (existing) return existing;
    return null;
  },

  fetchShopkeeperProfileById: async (shopkeeperId) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/profiles/shopkeeper-by-id/${shopkeeperId}`);
      set(state => ({
        shopkeeperProfiles: state.shopkeeperProfiles.some(s => s.id === shopkeeperId)
          ? state.shopkeeperProfiles.map(s => s.id === shopkeeperId ? data : s)
          : [...state.shopkeeperProfiles, data]
      }));
      return data;
    } catch { return null; }
  },

  fetchAllDistributors: async (lat?: number, lng?: number) => {
    try {
      let url = `${API_URL}/distributors`;
      if (lat !== undefined && lng !== undefined) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      const { data } = await apiClient.get(url);
      if (data) set({ distributorProfiles: data });
    } catch (e) { console.error(e); }
  },

  fetchConnections: async (userId, role) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/connections/${role}/${userId}`);
      if (data) set({ connections: data });
    } catch (e) { console.error(e); }
  },

  fetchProducts: async (distributorId) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/products/${distributorId}`);
      if (data) {
        const parsedData = data.map((p: any) => ({
          ...p,
          category: String(p.category || 'other').toLowerCase(),
          businessLine: inferBusinessLineFromCategory(String(p.category || 'other'), p.businessLine),
          quantity: String(p.quantity ?? p.unit ?? '').trim(),
          price: Number(p.price),
        }));
        set(state => ({
          products: [...state.products.filter(p => p.distributorId !== distributorId), ...parsedData],
        }));
      }
    } catch (e) { console.error(e); }
  },

  fetchOrders: async (userId, role) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/orders/${role}/${userId}`);
      if (data) {
        const parsedOrders = data.map((o: any) => ({
          ...o, total: Number(o.total),
          businessLine: inferBusinessLineFromCategory(String(o.businessLine || o.items?.[0]?.category || 'other'), o.businessLine),
          paymentStatus: o.paymentStatus === 'paid' ? 'paid' : 'unpaid',
          items: o.items.map((i: any) => ({
            ...i,
            category: String(i.category || 'other').toLowerCase(),
            businessLine: inferBusinessLineFromCategory(String(i.category || 'other'), i.businessLine),
            unitPrice: Number(i.unitPrice),
          }))
        }));
        set({ orders: parsedOrders });
      }
    } catch (e) { console.error(e); }
  },

  fetchNotifications: async (userId) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/notifications/${userId}`);
      if (data) set({ notifications: data });
    } catch (e) { console.error(e); }
  },

  fetchDeliveryGroups: async (distributorId) => {
    try {
      const { data } = await apiClient.get(`${API_URL}/delivery-groups/${distributorId}`);
      if (data) set({ deliveryGroups: data });
    } catch (e) { console.error(e); }
  },

  createDistributorProfile: async (_userId, _data) => {
    return null; // Implemented via auth/setup
  },

  createShopkeeperProfile: async (_userId, _data) => {
    return null; // Implemented via auth/setup
  },

  updateDistributorSettings: async (distributorId, updates) => {
    try {
      await apiClient.patch(`${API_URL}/profiles/distributor/${distributorId}`, updates);
      set(state => ({ distributorProfiles: state.distributorProfiles.map(dp => dp.id === distributorId ? { ...dp, ...updates } : dp) }));
    } catch (e) { console.error(e); }
  },

  updateShopkeeperProfile: async (shopkeeperId, updates) => {
    try {
      await apiClient.patch(`${API_URL}/profiles/shopkeeper/${shopkeeperId}`, updates);
      set(state => ({ shopkeeperProfiles: state.shopkeeperProfiles.map(sp => sp.id === shopkeeperId ? { ...sp, ...updates } : sp) }));
    } catch (e) { console.error(e); }
  },

  requestConnection: async (shopkeeperId, shopkeeperName, shopName, distributorCode, shopkeeperPhone) => {
    try {
      const { data } = await apiClient.post(`${API_URL}/connections`, { shopkeeperId, shopkeeperName, shopName, distributorCode, shopkeeperPhone });
      if (data && data.connection) {
        set(state => ({ connections: [...state.connections, data.connection] }));
        await get().addNotification({ userId: data.distributorUserId, type: 'new_connection', message: `${shopName} wants to connect with you`, read: false, createdAt: new Date().toISOString() });
        return true;
      }
    } catch (e) { console.error(e); return false; }
    return false;
  },

  cancelConnection: async (connectionId) => {
    try {
      await apiClient.delete(`${API_URL}/connections/${connectionId}`);
      set(state => ({ connections: state.connections.filter(c => c.id !== connectionId) }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  updateConnectionStatus: async (connectionId, status) => {
    try {
      await apiClient.patch(`${API_URL}/connections/${connectionId}`, { status });
      set(state => ({ connections: state.connections.map(c => c.id === connectionId ? { ...c, status } : c) }));
    } catch (e) { console.error(e); }
  },

  assignDeliveryGroup: async (connectionId, groupId, groupName) => {
    try {
      await apiClient.patch(`${API_URL}/connections/${connectionId}`, { deliveryGroupId: groupId, deliveryGroupName: groupName });
      set(state => ({ connections: state.connections.map(c => c.id === connectionId ? { ...c, deliveryGroupId: groupId, deliveryGroupName: groupName } : c) }));
    } catch (e) { console.error(e); }
  },

  toggleConnectionAutoOrder: async (connectionId, enabled, autoOrderTime) => {
    try {
      await apiClient.patch(`${API_URL}/connections/${connectionId}`, { autoOrderEnabled: enabled, autoOrderTime });
      set(state => ({ connections: state.connections.map(c => c.id === connectionId ? { ...c, autoOrderEnabled: enabled, autoOrderTime: autoOrderTime !== undefined ? autoOrderTime : c.autoOrderTime } : c) }));
    } catch (e) { console.error(e); }
  },

  runAutoOrdersForDistributor: async (distributorUserId) => {
    try {
      await apiClient.post(`${API_URL}/auto-orders/${distributorUserId}`);
      await get().fetchOrders(distributorUserId, 'distributor');
    } catch (e) { console.error(e); }
  },

  addProduct: async (product) => {
    try {
      const { data } = await apiClient.post(`${API_URL}/products`, product);
      if (data) {
        set(state => ({
          products: [
            ...state.products,
            {
              ...data,
              quantity: String(data.quantity ?? data.unit ?? '').trim(),
              price: Number(data.price),
            },
          ],
        }));
        return true;
      }
    } catch (e) { console.error(e); return false; }
    return false;
  },

  updateProduct: async (id, updates) => {
    try {
      await apiClient.patch(`${API_URL}/products/${id}`, updates);
      set(state => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }));
      return true;
    } catch (e) { console.error(e); return false; }
  },

  deleteProduct: async (id) => {
    try {
      await apiClient.delete(`${API_URL}/products/${id}`);
      set(state => ({ products: state.products.filter(p => p.id !== id) }));
      return true;
    } catch (e) { console.error(e); return false; }
  },

  placeOrder: async (shopkeeperId, shopkeeperName, shopName, distributorId, items, isLate, businessLine) => {
    try {
      const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const { data } = await apiClient.post(`${API_URL}/orders`, { shopkeeperId, shopkeeperName, shopName, distributorId, items, isLate, total, businessLine });
      set(state => ({
        orders: [{
          ...data.order,
          total: Number(data.order.total),
          paymentStatus: data.order.paymentStatus === 'paid' ? 'paid' : 'unpaid',
          items: data.order.items.map((i: any) => ({ ...i, unitPrice: Number(i.unitPrice) }))
        }, ...state.orders]
      }));
      if (data.distributorUserId) {
        await get().addNotification({ userId: data.distributorUserId, type: isLate ? 'late_order' : 'order_placed', message: isLate ? `Late order from ${shopName}` : `New order from ${shopName}`, read: false, createdAt: new Date().toISOString() });
      }
      return data.order;
    } catch (e) { console.error(e); throw new Error('Error placing the order'); }
  },

  createManualBill: async (input) => {
    try {
      const { data } = await apiClient.post(`${API_URL}/orders/manual-bill`, input);
      const parsedOrder = {
        ...data.order,
        total: Number(data.order.total),
        businessLine: inferBusinessLineFromCategory(String(data.order.businessLine || data.order.items?.[0]?.category || 'other'), data.order.businessLine),
        paymentStatus: data.order.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        items: data.order.items.map((i: any) => ({
          ...i,
          category: String(i.category || 'other').toLowerCase(),
          businessLine: inferBusinessLineFromCategory(String(i.category || 'other'), i.businessLine),
          unitPrice: Number(i.unitPrice),
        })),
      };
      set(state => ({ orders: [parsedOrder, ...state.orders] }));
      return parsedOrder;
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          throw new Error('Manual bill API not found. Please restart the backend server.');
        }
        const message = String(e.response?.data?.error || e.message || '').trim();
        throw new Error(message || 'Manual bill could not be created');
      }
      throw new Error('Manual bill could not be created');
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      await apiClient.patch(`${API_URL}/orders/${orderId}`, { status });
      set(state => ({ orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o) }));
    } catch (e) { console.error(e); }
  },

  updateOrder: async (orderId, payload) => {
    try {
      await apiClient.patch(`${API_URL}/orders/${orderId}`, payload);
      set(state => ({ orders: state.orders.map(o => o.id === orderId ? { ...o, ...payload } : o) }));
    } catch (e) { console.error(e); }
  },

  updateOrderPaymentStatus: async (orderId, paymentStatus) => {
    const previous = get().orders.find(o => o.id === orderId)?.paymentStatus;
    if (!previous) return;
    if (previous === 'paid' && paymentStatus === 'unpaid') {
      throw new Error('Payment already locked as paid.');
    }

    // Optimistic update so user immediately sees status change
    set(state => ({ orders: state.orders.map(o => o.id === orderId ? { ...o, paymentStatus } : o) }));

    try {
      let data: any;
      try {
        const response = await apiClient.patch(`${API_URL}/orders/${orderId}/payment-status`, { paymentStatus });
        data = response.data;
      } catch (primaryError) {
        // Backward compatibility: older backend may not have dedicated endpoint
        if (axios.isAxiosError(primaryError) && primaryError.response?.status === 404) {
          const fallbackResponse = await apiClient.patch(`${API_URL}/orders/${orderId}`, { paymentStatus });
          data = fallbackResponse.data;
        } else {
          throw primaryError;
        }
      }

      const confirmedStatus: PaymentStatus = data?.paymentStatus === 'paid' ? 'paid' : 'unpaid';
      set(state => ({ orders: state.orders.map(o => o.id === orderId ? { ...o, paymentStatus: confirmedStatus } : o) }));
    } catch (e) {
      console.error(e);
      // Rollback if backend update fails
      set(state => ({ orders: state.orders.map(o => o.id === orderId ? { ...o, paymentStatus: previous } : o) }));
      throw e;
    }
  },

  addDeliveryGroup: async (distributorId, name) => {
    try {
      const { data } = await apiClient.post(`${API_URL}/delivery-groups`, { distributorId, name });
      if (data) set(state => ({ deliveryGroups: [...state.deliveryGroups, data] }));
    } catch (e) { console.error(e); }
  },

  deleteDeliveryGroup: async (id) => {
    try {
      await apiClient.delete(`${API_URL}/delivery-groups/${id}`);
      set(state => ({ deliveryGroups: state.deliveryGroups.filter(g => g.id !== id) }));
    } catch (e) { console.error(e); }
  },

  markNotificationRead: async (id) => {
    try {
      await apiClient.patch(`${API_URL}/notifications/${id}/read`);
      set(state => ({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    } catch (e) { console.error(e); }
  },

  markAllRead: async (userId) => {
    try {
      await apiClient.patch(`${API_URL}/notifications/user/${userId}/read-all`);
      set(state => ({ notifications: state.notifications.map(n => n.userId === userId ? { ...n, read: true } : n) }));
    } catch (e) { console.error(e); }
  },

  addNotification: async (notification) => {
    try {
      const { data } = await apiClient.post(`${API_URL}/notifications`, notification);
      if (data) set(state => ({ notifications: [data, ...state.notifications] }));
    } catch (e) { console.error(e); }
  },

  setCartQuantity: (product, quantity) => {
    set(state => {
      if (quantity === 0) return { cart: state.cart.filter(c => c.product.id !== product.id) };
      const existing = state.cart.find(c => c.product.id === product.id);
      if (existing) return { cart: state.cart.map(c => c.product.id === product.id ? { ...c, quantity } : c) };
      const hasOtherDistributorItem = state.cart.some(
        c => c.product.distributorId !== product.distributorId
      );
      if (hasOtherDistributorItem) return { cart: state.cart };
      const productLine = inferBusinessLineFromCategory(String(product.category || 'other'), product.businessLine);
      const hasOtherBusinessLine = state.cart.some(
        c => inferBusinessLineFromCategory(String(c.product.category || 'other'), c.product.businessLine) !== productLine
      );
      if (hasOtherBusinessLine) return { cart: state.cart };
      return { cart: [...state.cart, { product, quantity }] };
    });
  },

  clearCart: () => set({ cart: [] }),
  resetState: () => set({ ...initialState }),
}));


