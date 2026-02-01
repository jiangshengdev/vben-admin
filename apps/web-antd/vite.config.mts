import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      // 图片本地化：PWA manifest 图标不再引用第三方（原默认值来自 unpkg）
      pwaOptions: {
        manifest: {
          icons: [
            {
              src: 'pwa/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      },
    },
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
