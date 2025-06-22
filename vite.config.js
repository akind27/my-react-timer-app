import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path'; // <--- ADD THIS LINE

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { // <--- ADD THIS resolve BLOCK
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});