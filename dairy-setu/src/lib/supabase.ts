import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseEnabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true';

const disconnectedClient = createClient('https://disabled.localhost', 'disabled-anon-key', {
  global: {
    fetch: async () => {
      throw new Error('Supabase connection disabled. Set VITE_SUPABASE_ENABLED=true to reconnect.');
    },
  },
});

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : disconnectedClient;
