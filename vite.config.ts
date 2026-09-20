import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose only the public Supabase vars. A blanket SUPABASE_ prefix would leak SUPABASE_SERVICE_ROLE_KEY.
  envPrefix: ['VITE_', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'],
});
