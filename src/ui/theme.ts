// 主题解析：auto → 跟随系统 prefers-color-scheme。仅在有 window 的环境（content/popup/options）调用。

export type Theme = 'light' | 'dark' | 'auto';

export function resolvedTheme(t: Theme): 'light' | 'dark' {
  if (t === 'auto') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return t;
}
