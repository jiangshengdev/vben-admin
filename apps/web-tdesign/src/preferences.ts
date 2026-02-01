import { defineOverridesPreferences } from '@vben/preferences';

function withBase(path: string) {
  // 兼容非根路径部署（Vite 保证 BASE_URL 末尾带 /）
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
}

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    // 图片本地化：避免默认头像走第三方（原默认值来自 unpkg）
    defaultAvatar: withBase('/assets/avatar-v1.webp'),
  },
  // 图片本地化：避免默认 Logo 走第三方（原默认值来自 unpkg）
  logo: {
    source: withBase('/assets/logo-v1.webp'),
    sourceDark: withBase('/assets/logo-v1.webp'),
  },
});
