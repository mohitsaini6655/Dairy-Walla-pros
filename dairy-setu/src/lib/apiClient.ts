import axios from 'axios';
import { auth as firebaseAuth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(async (config) => {
  config.headers = config.headers ?? {};

  const manualToken = typeof window !== 'undefined' ? localStorage.getItem('dairy-walla-manual-token') : null;
  if (manualToken) {
    config.headers.Authorization = `Bearer ${manualToken}`;
  } else {
    const user = firebaseAuth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      if (user.email) {
        config.headers['X-Dev-Auth-Email'] = user.email;
      }
      config.headers['X-Dev-Auth-Uid'] = user.uid;
    } else if (import.meta.env.DEV && typeof window !== 'undefined') {
      const devEmail = localStorage.getItem('dairy-walla-email');
      if (devEmail) {
        config.headers['X-Dev-Auth-Email'] = devEmail;
        config.headers['X-Dev-Auth-Uid'] = 'dev-local-session';
      }
    }
  }

  const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('ds_admin_token') : null;
  if (adminToken) {
    config.headers['X-Admin-Token'] = adminToken;
  }
  return config;
});
