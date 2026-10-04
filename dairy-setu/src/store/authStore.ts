import { create } from 'zustand';
import { auth as firebaseAuth } from '../lib/firebase';
import { signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { apiClient } from '../lib/apiClient';
import { useAppStore } from './appStore';
import type { User, Role } from '../types';

const isRole = (value: unknown): value is Role => value === 'distributor' || value === 'shopkeeper';

const waitForFirebaseUser = (timeoutMs = 3000): Promise<import('firebase/auth').User | null> => {
  const existingUser = firebaseAuth.currentUser;
  if (existingUser) return Promise.resolve(existingUser);

  return new Promise((resolve) => {
    let resolved = false;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      unsubscribe();
      resolve(null);
    }, timeoutMs);
  });
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, role: Role) => Promise<{ error?: string; user?: User; needsProfile?: boolean }>;
  manualLogin: (email: string, role: Role) => Promise<{ error?: string; user?: User; needsProfile?: boolean }>;
  manualRegister: (email: string, role: Role) => Promise<{ error?: string; success?: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  loadUser: () => Promise<void>;
}

let authListenerUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,

  loadUser: async () => {
    if (authListenerUnsubscribe) {
      authListenerUnsubscribe();
    }

    const manualToken = localStorage.getItem('dairy-walla-manual-token');
    if (manualToken) {
      try {
        const res = await apiClient.post('/auth/me', {});
        if (res.data.needsSetup) {
          useAppStore.getState().resetState();
          set({ user: null, isAuthenticated: false, loading: false });
          return;
        }

        const { profile } = res.data;
        if (isRole(profile.role)) {
          const role: Role = profile.role;
          localStorage.setItem('dairy-walla-active-role', role);
          localStorage.setItem('dairy-walla-email', profile.email);
          set({
            user: { id: profile.id, email: profile.email, name: profile.name || '', phone: profile.phone, role },
            isAuthenticated: true,
            loading: false,
          });
          return;
        }
      } catch (error) {
        console.error('Error loading manual user from API:', error);
        localStorage.removeItem('dairy-walla-manual-token');
        useAppStore.getState().resetState();
        set({ user: null, isAuthenticated: false, loading: false });
      }
    }

    return new Promise<void>((resolve) => {
      const fetchAndSetUser = async (email: string, resFn: () => void) => {
        try {
          const res = await apiClient.post('/auth/me', {});
          if (res.data.needsSetup) {
            useAppStore.getState().resetState();
            set({ user: null, isAuthenticated: false, loading: false });
            resFn();
            return;
          }

          const { profile } = res.data;
          if (!isRole(profile.role)) {
            throw new Error('Invalid role received from server');
          }
          const role: Role = profile.role;

          localStorage.setItem('dairy-walla-active-role', role);
          localStorage.setItem('dairy-walla-email', email);

          set({
            user: { id: profile.id, email: profile.email, name: profile.name || '', phone: profile.phone, role },
            isAuthenticated: true,
            loading: false,
          });
        } catch (error) {
          console.error('Error loading user from API', error);
          useAppStore.getState().resetState();
          set({ user: null, isAuthenticated: false, loading: false });
        }
        resFn();
      };

      authListenerUnsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        if (!firebaseUser || !firebaseUser.email) {
          localStorage.removeItem('dairy-walla-email');
          useAppStore.getState().resetState();
          set({ user: null, isAuthenticated: false, loading: false });
          resolve();
          return;
        }

        const email = firebaseUser.email;
        await fetchAndSetUser(email, resolve);
      });
    });
  },

  signIn: async (email, _role) => {
    set({ loading: true });
    try {
      const firebaseEmail = firebaseAuth.currentUser?.email;
      if (!firebaseEmail || firebaseEmail.toLowerCase() !== email.toLowerCase()) {
        set({ loading: false });
        return { error: 'Session mismatch. Please log in with Google again.' };
      }

      const res = await apiClient.post('/auth/me', {});
      if (res.data.needsSetup) {
        useAppStore.getState().resetState();
        set({ user: null, isAuthenticated: false, loading: false });
        return { needsProfile: true };
      }

      const { profile, dp, sp } = res.data;
      if (!isRole(profile.role)) {
        set({ loading: false });
        return { error: 'Server returned invalid account role.' };
      }
      const accountRole = profile.role as Role;

      if (accountRole === 'distributor' && !dp) {
        set({ loading: false });
        return { error: 'Distributor profile data missing for this account.' };
      }
      if (accountRole === 'shopkeeper' && !sp) {
        set({ loading: false });
        return { error: 'Shopkeeper profile data missing for this account.' };
      }

      localStorage.setItem('dairy-walla-active-role', accountRole);
      localStorage.setItem('dairy-walla-email', email);
      const user: User = { id: profile.id, email: profile.email, name: profile.name || '', phone: profile.phone, role: accountRole };

      set({ user, isAuthenticated: true, loading: false });
      return { user };
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        await firebaseSignOut(firebaseAuth);
        localStorage.removeItem('dairy-walla-active-role');
        localStorage.removeItem('dairy-walla-email');
        useAppStore.getState().resetState();
        set({ user: null, isAuthenticated: false, loading: false });
        return { error: e.response.data.error };
      }
      console.error('SignIn API Error:', e);
      set({ loading: false });
      return { error: 'Login failed due to server error' };
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch {
      // non-critical if Firebase wasn't initialized/authenticated
    }
    localStorage.removeItem('dairy-walla-active-role');
    localStorage.removeItem('dairy-walla-email');
    localStorage.removeItem('dairy-walla-pending-role');
    localStorage.removeItem('dairy-walla-pending-distributor-type');
    localStorage.removeItem('dairy-walla-manual-token');
    useAppStore.getState().resetState();
    set({ user: null, isAuthenticated: false });
  },

  manualLogin: async (email, role) => {
    set({ loading: true });
    try {
      const res = await apiClient.post('/auth/manual-login', { email, role });
      const { profile, token, needsSetup } = res.data;

      localStorage.setItem('dairy-walla-manual-token', token);
      localStorage.setItem('dairy-walla-active-role', profile.role);
      localStorage.setItem('dairy-walla-email', profile.email);

      if (needsSetup) {
        set({ loading: false });
        return { needsProfile: true };
      }

      const user: User = { id: profile.id, email: profile.email, name: profile.name || '', phone: profile.phone, role: profile.role };
      set({ user, isAuthenticated: true, loading: false });
      return { user };
    } catch (e) {
      console.error('Manual Login Error:', e);
      set({ loading: false });
      if (axios.isAxiosError(e) && e.response?.data?.error) {
        return { error: e.response.data.error };
      }
      return { error: 'Login failed. Please check your credentials and try again.' };
    }
  },

  manualRegister: async (email, role) => {
    set({ loading: true });
    try {
      const res = await apiClient.post('/auth/manual-register', { email, role });
      const { token } = res.data;

      localStorage.setItem('dairy-walla-manual-token', token);
      localStorage.setItem('dairy-walla-active-role', role);
      localStorage.setItem('dairy-walla-email', email.toLowerCase());

      set({ loading: false });
      return { success: true };
    } catch (e) {
      console.error('Manual Register Error:', e);
      set({ loading: false });
      if (axios.isAxiosError(e) && e.response?.data?.error) {
        return { error: e.response.data.error };
      }
      return { error: 'Registration failed. Please try again.' };
    }
  },

  deleteAccount: async () => {
    set({ loading: true });
    try {
      const fUser = await waitForFirebaseUser();
      if (!fUser) {
        set({ loading: false });
        return { error: 'Active session not found. Please log in with Google again and retry.' };
      }

      await apiClient.delete('/auth/me');
      await fUser.delete();

      localStorage.removeItem('dairy-walla-active-role');
      localStorage.removeItem('dairy-walla-email');
      localStorage.removeItem('dairy-walla-pending-role');
      localStorage.removeItem('dairy-walla-pending-distributor-type');
      localStorage.removeItem('dairy-walla-manual-token');
      useAppStore.getState().resetState();
      set({ user: null, isAuthenticated: false, loading: false });
      return {};
    } catch (e: any) {
      console.error('Delete Account API Error:', e);
      set({ loading: false });
      if (e.code === 'auth/requires-recent-login') {
        return { error: 'For security reasons, please log out and log in again before deleting your account.' };
      }
      return { error: 'Could not delete the account.' };
    }
  },

  updateUser: async (updates) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, ...updates };
    set({ user: updated });

    try {
      await apiClient.patch(`/auth/user/${user.id}`, updates);
      if (updates.phone) {
        useAppStore.setState(state => ({
          distributorProfiles: state.distributorProfiles.map(profile =>
            profile.userId === user.id ? { ...profile, phone: updates.phone } : profile
          ),
          shopkeeperProfiles: state.shopkeeperProfiles.map(profile =>
            profile.userId === user.id ? { ...profile, phone: updates.phone } : profile
          ),
        }));
      }
    } catch (e) {
      console.error('Failed to update user in DB', e);
      set({ user });
      const message = axios.isAxiosError(e) ? String(e.response?.data?.error || e.message || '').trim() : '';
      throw new Error(message || 'Could not update the profile');
    }
  },
}));
