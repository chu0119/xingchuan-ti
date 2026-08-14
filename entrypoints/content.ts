// content script：划词识别 → 浮动按钮 → 可拖动 Shadow DOM 面板；
// 接收 background 推送（右键菜单结果）；向 popup 回传选中文本。
// 支持多指标切换(◀▶)、复制、刷新(绕过缓存)、亮暗主题。
// 选区检测：同步处理（设置已缓存，避免异步竞态），并兼容 <input>/<textarea> 内的选区。

import { detectAll } from '../src/lib/detect';
import type { Detected } from '../src/lib/detect';
import { getSettings } from '../src/lib/storage';
import { queryBackground } from '../src/lib/messaging';
import type { PanelPayload, RenderOpts } from '../src/ui/panel';
import { renderHint, renderLoading, renderResults } from '../src/ui/panel';
import { PANEL_CSS } from '../src/ui/css';
import { resolvedTheme } from '../src/ui/theme';
import { copyText } from '../src/lib/clipboard';
import { h } from '../src/ui/dom';

const FAB_CSS = `.ti-fab{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;padding:7px 13px;border-radius:18px;font:600 12px/1 -apple-system,"Microsoft YaHei",sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(79,70,229,.42);user-select:none;white-space:nowrap;}`;
const CLOSE_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    let fab: HTMLDivElement | null = null;
    let host: HTMLDivElement | null = null;
    let shadow: ShadowRoot | null = null;
    let root: HTMLDivElement | null = null;
    let lastSelection = '';
    let pending: Detected[] = [];
    let idx = 0;
    // 缓存“划词浮窗”开关，避免每次 mouseup 都异步读 storage 造成竞态
    let selEnabled = true;

    const removeFab = () => {
      fab?.remove();
      fab = null;
    };
    const closePanel = () => {
      host?.remove();
      host = null;
      shadow = null;
      root = null;
    };
    const isOurEl = (t: EventTarget | null) =>
      t instanceof Node && ((host && (host === t || host.contains(t))) || (fab && (fab === t || fab.contains(t))));

    // 初始化：读一次设置 + 监听变化
    getSettings().then(s => (selEnabled = s.triggers.selection));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        const ns = changes.settings.newValue as { triggers?: { selection?: boolean } } | undefined;
        selEnabled = ns?.triggers?.selection ?? selEnabled;
      }
    });
    // 跟随系统主题变化实时切换（auto 模式下）
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (host) {
        const themeEl = host.querySelector('[data-theme]');
        if (themeEl) {
          getSettings().then(s => {
            if (s.theme === 'auto') themeEl.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          });
        }
      }
    });

    function toast(msg: string) {
      const t = h('div', {
        text: msg,
        style: {
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: '16px', background: '#1f2329',
          color: '#fff', fontSize: '12px', padding: '7px 14px', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,.3)',
          zIndex: '2147483647', opacity: '0', transition: 'opacity .2s', pointerEvents: 'none',
        },
      });
      document.body.append(t);
      requestAnimationFrame(() => (t.style.opacity = '1'));
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 250);
      }, 1500);
    }

    /** 读取当前选区（兼容普通文本与 input/textarea）。 */
    function getSelectionInfo(): { text: string; rect: DOMRect } | null {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const text = sel.toString().trim();
        if (text) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) return { text, rect };
        }
      }
      // input / textarea 内的选区
      const ae = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) {
        const s = ae.selectionStart;
        const e = ae.selectionEnd;
        if (s != null && e != null && e > s) {
          const text = (ae.value || '').slice(s, e).trim();
          if (text) return { text, rect: ae.getBoundingClientRect() };
        }
      }
      return null;
    }

    function makeFrame(): HTMLDivElement {
      closePanel();
      host = h('div', { style: { position: 'fixed', top: '72px', right: '16px', zIndex: '2147483647' } });
      shadow = host.attachShadow({ mode: 'open' });
      shadow.append(h('style', { text: PANEL_CSS }));
      root = h('div', {});
      const closeBtn = h('button', {
        html: CLOSE_SVG,
        title: '关闭',
        onClick: closePanel,
        class: 'ti-close-btn',
      });
      shadow.append(h('div', { style: { position: 'relative', display: 'inline-block' } }, [closeBtn, root]));
      document.documentElement.append(host);
      return root;
    }

    function attachDrag() {
      if (!shadow || !host) return;
      const head = shadow.querySelector('.ti-head') as HTMLElement | null;
      if (!head || (head as any)._tiDrag) return;
      (head as any)._tiDrag = true;
      head.addEventListener('mousedown', (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('.ti-acts')) return;
        const r = host!.getBoundingClientRect();
        const ox = e.clientX - r.left;
        const oy = e.clientY - r.top;
        const mv = (ev: MouseEvent) => {
          host!.style.left = ev.clientX - ox + 'px';
          host!.style.top = ev.clientY - oy + 'px';
          host!.style.right = 'auto';
        };
        const up = () => {
          document.removeEventListener('mousemove', mv);
          document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
      });
    }

    async function queryAndShow(list: Detected[], index: number, nocache = false) {
      pending = list;
      idx = index;
      const det = list[index]!;
      const rootEl = makeFrame();
      renderLoading(rootEl);
      attachDrag();
      const res = await queryBackground({ kind: 'query', type: det.type, value: det.value, nocache });
      if (!host) return;
      if (res.ok) {
        const theme = resolvedTheme((await getSettings()).theme);
        const opts: RenderOpts = {
          theme,
          iocs: list.length > 1 ? list : undefined,
          index,
          onPrev: () => queryAndShow(list, (index - 1 + list.length) % list.length),
          onNext: () => queryAndShow(list, (index + 1) % list.length),
          onCopy: () => copyText(det.value).then(ok => toast(ok ? '已复制 ' + det.value : '复制失败')),
          onRefresh: () => queryAndShow(list, index, true),
          onClose: closePanel,
        };
        renderResults(rootEl, res, opts);
      } else {
        renderHint(rootEl, res.error || '查询失败，请到设置页检查 API Key');
      }
      attachDrag();
    }

    async function showPayload(p: PanelPayload) {
      pending = [{ type: p.type, value: p.value }];
      idx = 0;
      const rootEl = makeFrame();
      const theme = resolvedTheme((await getSettings()).theme);
      renderResults(rootEl, p, {
        theme,
        onCopy: () => copyText(p.value).then(ok => toast(ok ? '已复制 ' + p.value : '复制失败')),
        onRefresh: () => queryAndShow(pending, 0, true),
        onClose: closePanel,
      });
      attachDrag();
    }

    function showFab(list: Detected[], rect: DOMRect) {
      removeFab();
      const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 50));
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 150));
      fab = h('div', { style: { position: 'fixed', left: `${left}px`, top: `${top}px`, zIndex: '2147483646' } });
      const s = fab.attachShadow({ mode: 'open' });
      s.append(h('style', { text: FAB_CSS }));
      s.append(
        h('div', {
          class: 'ti-fab',
          text: list.length > 1 ? `🔍 情报查询 · ${list.length}` : '🔍 情报查询',
          onClick: () => {
            queryAndShow(list, 0);
            removeFab();
          },
        }),
      );
      document.documentElement.append(fab);
    }

    // 选区变化即处理（同步，无 await 竞态）
    function handleSelection() {
      if (!selEnabled) {
        removeFab();
        return;
      }
      const info = getSelectionInfo();
      if (!info) {
        removeFab();
        return;
      }
      lastSelection = info.text;
      const list = detectAll(info.text);
      if (!list.length) {
        removeFab();
        return;
      }
      showFab(list, info.rect);
    }

    document.addEventListener('mouseup', e => {
      if (isOurEl(e.target)) return;
      handleSelection();
    });
    // 键盘选区（Shift + 方向键）也能触发
    document.addEventListener('keyup', e => {
      if (e.shiftKey && e.key.startsWith('Arrow')) handleSelection();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePanel();
    });

    chrome.runtime.onMessage.addListener((msg, _src, sendResponse) => {
      if (msg?.kind === 'renderPanel') {
        showPayload(msg as PanelPayload);
        sendResponse({ ok: true });
        return false;
      }
      if (msg?.kind === 'getSelection') {
        const info = getSelectionInfo();
        sendResponse({ text: info?.text || lastSelection });
        return false;
      }
      return false;
    });
  },
});
