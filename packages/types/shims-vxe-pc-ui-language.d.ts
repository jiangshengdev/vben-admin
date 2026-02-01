/**
 * @description vxe-pc-ui 语言包深层导入的类型补充（无 any）
 *
 * 说明：
 * - vxe-pc-ui 的语言包文件存在于 lib/es 下，但未提供对应 .d.ts，导致 TS7016/TS2307。
 * - 这里仅定义语言包的最小结构，满足 setI18n 等场景的类型检查。
 */

type VxePcUiLanguagePack = {
  readonly vxe: Record<string, unknown>;
};

declare module 'vxe-pc-ui/lib/language/en-US' {
  const enUS: VxePcUiLanguagePack;
  export default enUS;
}

declare module 'vxe-pc-ui/lib/language/zh-CN' {
  const zhCN: VxePcUiLanguagePack;
  export default zhCN;
}

// 兼容可能的 ESM 路径导入
declare module 'vxe-pc-ui/es/language/en-US' {
  const enUS: VxePcUiLanguagePack;
  export default enUS;
}

declare module 'vxe-pc-ui/es/language/zh-CN' {
  const zhCN: VxePcUiLanguagePack;
  export default zhCN;
}
