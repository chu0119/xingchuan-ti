// 工具栏弹窗：两个视图——主视图(查询/研判) + 历史视图(二级页面，默认不显示)。

import { detectAll } from '../../src/lib/detect';
import type { Detected } from '../../src/lib/detect';
import { getSettings, saveSettings } from '../../src/lib/storage';
import { clearHistory, getHistory } from '../../src/lib/history';
import { queryBackground } from '../../src/lib/messaging';
import type { QueryResponse } from '../../src/lib/messaging';
import type { RenderOpts } from '../../src/ui/panel';
import { renderLoading, renderResults } from '../../src/ui/panel';
import { PANEL_CSS, THEME_VARS } from '../../src/ui/css';
import { resolvedTheme } from '../../src/ui/theme';
import { copyText } from '../../src/lib/clipboard';
import { h } from '../../src/ui/dom';

const POPUP_CSS = `
*{box-sizing:border-box;}
body{margin:0;width:400px;background:var(--bg);color:var(--fg);font:13px/1.55 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;}
.pp-view{}
.pp-head{display:flex;align-items:center;gap:9px;padding:11px 12px;border-bottom:1px solid var(--border2);background:linear-gradient(180deg,var(--softbg),var(--bg));}
.pp-logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#06b6d4);flex:none;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(79,70,229,.35);}
.pp-logo svg{width:16px;height:16px;}
.pp-title{font-weight:700;font-size:15px;flex:1;}
.pp-title small{display:block;font-size:10px;font-weight:400;color:var(--muted);}
.pp-acts{display:flex;align-items:center;gap:5px;flex:none;}
.pp-ibtn{border:none;background:var(--chipbg);color:var(--chips);width:30px;height:30px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
.pp-ibtn:hover{background:var(--hover);color:var(--fg);}
.pp-search{display:flex;gap:6px;padding:10px;border-bottom:1px solid var(--border2);}
.pp-in{flex:1;min-width:0;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--bg);color:var(--fg);outline:none;}
.pp-in:focus{border-color:var(--accent);}
.pp-go{border:none;background:var(--btn);color:#fff;border-radius:8px;padding:0 16px;font-size:13px;font-weight:600;cursor:pointer;}
.pp-go:hover{filter:brightness(1.06);}
.pp-out{max-height:560px;overflow:auto;}
.pp-foot{display:flex;align-items:center;padding:9px 12px;border-top:1px solid var(--border2);font-size:11px;color:var(--muted);background:var(--softbg);}
.pp-hint{padding:26px 18px;text-align:center;color:var(--muted);font-size:12px;line-height:1.8;white-space:pre-line;}
/* 历史二级页 */
.pp-histhead{display:flex;align-items:center;gap:8px;padding:11px 12px;border-bottom:1px solid var(--border2);background:linear-gradient(180deg,var(--softbg),var(--bg));}
.pp-histhead .t{font-weight:700;font-size:14px;flex:1;}
.pp-clear{background:var(--chipbg);border:none;border-radius:7px;color:var(--chips);font-size:11px;padding:5px 10px;cursor:pointer;}
.pp-clear:hover{background:var(--hover);color:var(--fg);}
.pp-histlist{padding:6px 8px;max-height:520px;overflow:auto;}
.pp-hi{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;}
.pp-hi:hover{background:var(--softbg);}
.pp-hic{font-size:9px;}
.pp-hiv{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg);}
.pp-him{font-size:11px;color:var(--muted);}
.pp-empty{padding:40px 20px;text-align:center;color:var(--muted);font-size:13px;}
`;

const LOGO = `<svg viewBox="0 0 128 128" fill="none"><path d="M64 24 L98 37 V63 C98 88 83 104 64 110 C45 104 30 88 30 63 V37 Z" fill="#fff"/><circle cx="56" cy="57" r="13" fill="none" stroke="#4f46e5" stroke-width="7"/><line x1="65" y1="66" x2="76" y2="78" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/></svg>`;
const SUN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>`;
const MOON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
const HIST = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const BACK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

const VC: Record<string, string> = { malicious: '#e53935', suspicious: '#fb8c00', clean: '#43a047', unknown: '#9e9e9e' };
const VT: Record<string, string> = { malicious: '恶意', suspicious: '可疑', clean: '干净', unknown: '未知' };

const settings = await getSettings();
document.documentElement.dataset.theme = resolvedTheme(settings.theme);
document.head.append(h('style', { text: THEME_VARS }), h('style', { text: PANEL_CSS }), h('style', { text: POPUP_CSS }));

// ===== 主视图 =====
const out = h('div', { class: 'pp-out' });
const input = h('input', { class: 'pp-in', placeholder: '输入 IP 或域名…', spellcheck: 'false' }) as HTMLInputElement;
const goBtn = h('button', { class: 'pp-go', text: '查询' });
const themeBtn = h('button', { class: 'pp-ibtn', title: '切换亮/暗主题' });
const histBtn = h('button', { class: 'pp-ibtn', html: HIST, title: '最近查询' });
function syncThemeIcon() {
  themeBtn.innerHTML = resolvedTheme(settings.theme) === 'dark' ? SUN : MOON;
}

const mainView = h('div', { class: 'pp-view' }, [
  h('div', { class: 'pp-head' }, [
    h('div', { class: 'pp-logo', html: LOGO }),
    h('div', { class: 'pp-title' }, ['威胁情报助手', h('small', { text: '多源研判 · 一键跳转' })]),
    h('div', { class: 'pp-acts' }, [
      themeBtn,
      histBtn,
      h('button', { class: 'pp-ibtn', text: '⚙', title: '设置', onClick: () => chrome.runtime.openOptionsPage() }),
    ]),
  ]),
  h('div', { class: 'pp-search' }, [input, goBtn]),
  out,
  h('div', { class: 'pp-foot' }, [h('span', { text: '结果仅供参考 · 在 ⚙ 设置中配置 API Key' })]),
]);

// ===== 历史视图（二级页，默认隐藏）=====
const histList = h('div', { class: 'pp-histlist' });
const historyView = h('div', { class: 'pp-view', style: { display: 'none' } }, [
  h('div', { class: 'pp-histhead' }, [
    h('button', { class: 'pp-ibtn', html: BACK, title: '返回', onClick: () => showView('main') }),
    h('div', { class: 't', text: '最近查询' }),
    h('button', { class: 'pp-clear', text: '清空', onClick: async () => { await clearHistory(); renderHistory(); } }),
  ]),
  histList,
]);

document.body.append(mainView, historyView);

function showView(v: 'main' | 'history') {
  mainView.style.display = v === 'main' ? '' : 'none';
  historyView.style.display = v === 'history' ? '' : 'none';
}

// ===== 查询 =====
let last: { res: QueryResponse; list: Detected[]; index: number } | null = null;
function makeOpts(list: Detected[], index: number): RenderOpts {
  const det = list[index]!;
  return {
    theme: resolvedTheme(settings.theme),
    iocs: list.length > 1 ? list : undefined,
    index,
    onPrev: () => queryAndShow(list, (index - 1 + list.length) % list.length),
    onNext: () => queryAndShow(list, (index + 1) % list.length),
    onCopy: () => copyText(det.value),
    onRefresh: () => queryAndShow(list, index, true),
    onOpenSettings: () => chrome.runtime.openOptionsPage(),
  };
}
async function queryAndShow(list: Detected[], index: number, nocache = false) {
  const det = list[index]!;
  renderLoading(out);
  const res = await queryBackground({ kind: 'query', type: det.type, value: det.value, nocache });
  if (res.ok) {
    last = { res, list, index };
    renderResults(out, res, makeOpts(list, index));
  } else {
    ppHint(res.error || '查询失败，请到设置页检查 API Key');
  }
}
function ppHint(text: string) {
  out.replaceChildren(h('div', { class: 'pp-hint', text }));
}
function doQuery(nocache = false) {
  const list = detectAll(input.value);
  if (!list.length) {
    ppHint('无法识别为 IP 或域名，请检查输入');
    return;
  }
  queryAndShow(list, 0, nocache);
}
goBtn.addEventListener('click', () => doQuery(false));
input.addEventListener('keydown', e => { if (e.key === 'Enter') doQuery(false); });

// ===== 主题切换 =====
themeBtn.addEventListener('click', async () => {
  settings.theme = resolvedTheme(settings.theme) === 'dark' ? 'light' : 'dark';
  await saveSettings(settings);
  document.documentElement.dataset.theme = resolvedTheme(settings.theme);
  syncThemeIcon();
  if (last) renderResults(out, last.res, makeOpts(last.list, last.index));
});
syncThemeIcon();

// ===== 历史 =====
histBtn.addEventListener('click', () => { renderHistory(); showView('history'); });
async function renderHistory() {
  const list = await getHistory();
  histList.replaceChildren();
  if (!list.length) {
    histList.append(h('div', { class: 'pp-empty', text: '暂无查询记录' }));
    return;
  }
  for (const it of list.slice(0, 50)) {
    const item = h('div', { class: 'pp-hi' }, [
      h('span', { class: 'pp-hic', text: '●', style: { color: VC[it.label ?? 'unknown'] } }),
      h('span', { class: 'pp-hiv', text: it.value }),
      h('span', { class: 'pp-him', text: `${VT[it.label ?? 'unknown'] ?? ''} · ${it.score ?? '—'}` }),
    ]);
    item.addEventListener('click', () => {
      input.value = it.value;
      showView('main');
      queryAndShow([{ type: it.type, value: it.value }], 0, false);
    });
    histList.append(item);
  }
}

// ===== 初始化 =====
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const r = (await chrome.tabs.sendMessage(tab.id, { kind: 'getSelection' })) as { text?: string } | undefined;
      if (r?.text) input.value = r.text;
    } catch {
      /* 无 content script（如 chrome://），忽略 */
    }
  }
  input.focus();
  ppHint('输入或粘贴 IP / 域名，回车查询\n结果下方可一键跳转各情报平台');
})();
