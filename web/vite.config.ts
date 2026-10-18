/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, /api se redirige a la API local (dotnet run en el puerto 8080).
export default defineConfig({
  plugins: [react()],
  build: {
    // MUI completo pesa ~500 kB en su propio chunk (150 kB gzip); se cachea aparte del código de la app.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Librerías grandes en archivos aparte: se cachean entre despliegues.
        codeSplitting: {
          groups: [
            { name: 'mui', test: /node_modules[\\/](@mui|@emotion)/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'cobertura', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/api/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
