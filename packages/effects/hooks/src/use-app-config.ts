import type {
  ApplicationConfig,
  VbenAdminProAppConfigRaw,
} from '@vben/types/global';

/**
 * 由 vite-inject-app-config 注入的全局配置
 */
export function useAppConfig(
  env: Record<string, any>,
  isProduction: boolean,
): ApplicationConfig {
  // 生产环境下，直接使用 window._VBEN_ADMIN_PRO_APP_CONF_ 全局变量
  const runtimeConfig = isProduction ? window._VBEN_ADMIN_PRO_APP_CONF_ : null;
  const config = (runtimeConfig ?? env) as undefined | VbenAdminProAppConfigRaw;

  const {
    VITE_GLOB_API_URL = '',
    VITE_GLOB_API_URL_MAP,
    VITE_GLOB_AUTH_DINGDING_CORP_ID,
    VITE_GLOB_AUTH_DINGDING_CLIENT_ID,
  } = config ?? ({} as VbenAdminProAppConfigRaw);

  const apiURL = resolveApiURL(VITE_GLOB_API_URL, VITE_GLOB_API_URL_MAP);

  const applicationConfig: ApplicationConfig = {
    apiURL,
    auth: {},
  };
  if (VITE_GLOB_AUTH_DINGDING_CORP_ID && VITE_GLOB_AUTH_DINGDING_CLIENT_ID) {
    applicationConfig.auth.dingding = {
      clientId: VITE_GLOB_AUTH_DINGDING_CLIENT_ID,
      corpId: VITE_GLOB_AUTH_DINGDING_CORP_ID,
    };
  }

  return applicationConfig;
}

function resolveApiURL(defaultURL: string, rawMap?: string): string {
  if (!rawMap || typeof rawMap !== 'string') return defaultURL;
  if (typeof window === 'undefined') return defaultURL;

  const host = window.location?.host;
  const hostname = window.location?.hostname;

  try {
    const parsed = JSON.parse(rawMap) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaultURL;
    }

    const map = parsed as Record<string, unknown>;

    const byHost = host ? map[host] : undefined;
    if (typeof byHost === 'string' && byHost) return byHost;

    const byHostname = hostname ? map[hostname] : undefined;
    if (typeof byHostname === 'string' && byHostname) return byHostname;
  } catch {
    // ignore invalid JSON and fallback to default
  }

  return defaultURL;
}
