import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      build: {
        // Reduce tiny `js/css-*.js` wrapper chunks by extracting CSS into a single file.
        // Trade-off: fewer requests but larger CSS payload.
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            // Try to avoid generating too many tiny chunks (<10KB) which increases request count.
            // Rollup will attempt to merge small chunks when it can do so safely.
            experimentalMinChunkSize: 100 * 1024,
          },
        },
      },
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
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
