import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // 激进缓存所有关键静态资源
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // 运行时缓存：缓存 Google Fonts 等 CDN 资源
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'NextClass 课表',
          short_name: 'NextClass',
          description: '你的智能课表助手',
          theme_color: '#6d23f9',
          background_color: '#F7F7F9',
          display: 'standalone',
          icons: [
            { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: true,
    },
  };
});
