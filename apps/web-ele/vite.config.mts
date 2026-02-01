import type { VbenViteConfig } from '@vben/vite-config';

import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

// 显式标注默认导出的类型，避免在 node tsconfig 作为引用组合项目编译时出现 TS2742。
const config: VbenViteConfig = defineConfig(async () => {
  return {
    application: {
      extraAppConfig: false,
    },
    vite: {
      build: {
        // 通过将 CSS 提取为单个文件来减少细小的 `js/css-*.js` 包裹分块。
        // 权衡：请求次数减少，但单次 CSS 体积更大。
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            // 尽量避免生成过多的小分块（目标最小约 100KB），以减少请求数量。
            // Rollup 会在保证安全的前提下尝试合并小分块（非强制保证）。
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

export default config;
