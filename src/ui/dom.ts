// 极简 DOM 构造助手（避免在多处写冗长的 createElement）。

type Props = Record<string, any>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: unknown[] = [],
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    switch (k) {
      case 'class':
        e.className = String(v);
        break;
      case 'text':
        e.textContent = String(v);
        break;
      case 'html':
        e.innerHTML = String(v);
        break;
      case 'style':
        if (typeof v === 'object') Object.assign(e.style, v);
        break;
      case 'onClick':
        e.addEventListener('click', v);
        break;
      case 'dataset':
        Object.assign(e.dataset, v);
        break;
      default:
        if (k in e) (e as any)[k] = v;
    }
  }
  // 展平嵌套数组（允许 children 里混用数组），过滤空值
  for (const c of (children as any[]).flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : (c as Node));
  }
  return e;
}

export function clear(node: HTMLElement | ShadowRoot): void {
  node.replaceChildren();
}
