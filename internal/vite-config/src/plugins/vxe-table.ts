import type { PluginOption } from 'vite';

import { lazyImport, VxeResolver } from 'vite-plugin-lazy-import';

async function viteVxeTableImportsPlugin(): Promise<PluginOption> {
  return [
    lazyImport({
      resolvers: [
        VxeResolver({
          libraryName: 'vxe-table',
        }),
        VxeResolver({
          libraryName: 'vxe-pc-ui',
          // vxe-pc-ui 没有按组件拆分的 `es/**/style.css`，开启会导致 Vite 无法解析样式路径
          // 样式由业务侧按需引入（例如 `vxe-pc-ui/styles/cssvar.scss`）
          importStyle: false,
        }),
      ],
    }),
  ];
}

export { viteVxeTableImportsPlugin };
