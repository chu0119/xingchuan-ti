// UI 测试台 v3：渲染真实 popup 外壳(.pp-*) + options 卡片样本，亮/暗各一份，供截图验证。
// chrome.* 不可用，故数据为 mock；样式与结构与真实 popup/main.ts、options/main.ts 一致。

import { renderResults } from '../src/ui/panel';
import { PANEL_CSS, THEME_VARS } from '../src/ui/css';
import { h } from '../src/ui/dom';
import type { AggregateResult, QueryResult } from '../src/adapters/types';

// 与 popup/main.ts 的 POPUP_CSS 保持一致
const POPUP_CSS = `
*{box-sizing:border-box;}
body{margin:0;}
.pp-head{display:flex;align-items:center;gap:9px;padding:11px 12px;border-bottom:1px solid var(--border2);background:linear-gradient(180deg,var(--softbg),var(--bg));}
.pp-logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#06b6d4);flex:none;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(79,70,229,.35);}
.pp-logo svg{width:16px;height:16px;}
.pp-title{font-weight:700;font-size:15px;flex:1;}
.pp-title small{display:block;font-size:10px;font-weight:400;color:var(--muted);}
.pp-ibtn{border:none;background:var(--chipbg);color:var(--chips);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px;}
.pp-search{display:flex;gap:6px;padding:10px;border-bottom:1px solid var(--border2);}
.pp-in{flex:1;min-width:0;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;background:var(--bg);color:var(--fg);outline:none;}
.pp-go{border:none;background:var(--btn);color:#fff;border-radius:8px;padding:0 16px;font-size:13px;font-weight:600;cursor:pointer;}
.pp-hist{border-top:1px solid var(--border2);background:var(--softbg);padding:4px 10px 10px;}
.pp-histt{display:flex;align-items:center;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:8px 4px;}
.pp-clear{margin-left:auto;background:var(--chipbg);border:none;border-radius:7px;color:var(--chips);font-size:11px;padding:3px 8px;cursor:pointer;}
.pp-hi{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;cursor:pointer;}
.pp-hi:hover{background:var(--bg);}
.pp-hic{font-size:9px;}
.pp-hiv{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pp-him{font-size:11px;color:var(--muted);}
.pp-foot{display:flex;align-items:center;gap:14px;padding:9px 12px;border-top:1px solid var(--border2);font-size:11px;color:var(--muted);background:var(--softbg);}
.pp-foot a{color:var(--accent);text-decoration:none;cursor:pointer;}
`;
const PAGE_CSS = `
body{background:#cfd6e1;padding:30px 20px 60px;font:13px/1.55 -apple-system,"Segoe UI",sans-serif;}
.page{max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;gap:34px;justify-content:center;align-items:flex-start;}
.col h2{font-size:13px;color:#4a5160;margin:0 0 12px;font-weight:600;text-align:center;}
.frame{border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.25);}
.opt{width:400px;background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 12px 36px rgba(15,23,42,.2);}
.src-head{display:flex;align-items:center;gap:10px;}
.src-name{font-weight:700;font-size:15px;}
.tag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--accentbg);color:var(--accent);}
.req{font-size:11px;color:var(--muted);}
.row{display:flex;align-items:center;gap:10px;margin:8px 0;}
.row label.k{font-weight:600;min-width:74px;}
.row input{flex:1;border:1px solid var(--border);border-radius:8px;padding:9px 11px;font-size:13px;background:var(--bg);color:var(--fg);}
.guide{margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);}
.guide-t{font-size:12px;font-weight:700;color:var(--sub);margin-bottom:4px;}
.guide .lim{display:inline-block;font-size:11px;background:var(--chipbg);color:var(--chips);padding:2px 8px;border-radius:8px;margin:4px 0;}
.guide ol{margin:4px 0;color:var(--sub);font-size:13px;padding-left:20px;}
.guide a{color:var(--accent);}
`;
const LOGO = `<svg viewBox="0 0 128 128" fill="none"><path d="M64 24 L98 37 V63 C98 88 83 104 64 110 C45 104 30 88 30 63 V37 Z" fill="#fff"/><circle cx="56" cy="57" r="13" fill="none" stroke="#4f46e5" stroke-width="7"/><line x1="65" y1="66" x2="76" y2="78" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/></svg>`;

const mal: QueryResult[] = [
  { source: 'abuseipdb', sourceName: 'AbuseIPDB', verdict: 'malicious', score: 95, summary: '滥用置信度 95%，近90天 1320 次举报', tags: ['SSH Brute Force', 'Datacenter'], detailsUrl: '#', queriedAt: 0 },
  { source: 'virustotal', sourceName: 'VirusTotal', verdict: 'malicious', score: 88, summary: '12/89 引擎判定恶意（可疑 3）', tags: ['botnet', 'worm'], detailsUrl: '#', queriedAt: 0 },
  { source: 'threatbook', sourceName: '微步在线', verdict: 'malicious', score: 85, summary: '判定: 恶意 / Sinkhole', tags: ['僵尸网络', '挖矿'], detailsUrl: '#', queriedAt: 0 },
  { source: 'greynoise', sourceName: 'GreyNoise', verdict: 'malicious', score: 80, summary: '恶意扫描器（活跃扫描）', tags: ['SSH Scanner'], detailsUrl: '#', queriedAt: 0 },
  { source: 'otx', sourceName: 'AlienVault OTX', verdict: 'suspicious', score: 42, summary: '相关 6 个威胁 Pulse', tags: ['Emotet'], detailsUrl: '#', queriedAt: 0 },
];
const malAgg: AggregateResult = { score: 81, label: 'malicious', contributors: 5, flagCount: 4, cleanCount: 1 };

function buildPopup(theme: 'light' | 'dark') {
  const out = h('div', { class: 'pp-out' });
  const popup = h('div', { style: { width: '400px', background: 'var(--bg)' } }, [
    h('div', { class: 'pp-head' }, [
      h('div', { class: 'pp-logo', html: LOGO }),
    h('div', { class: 'pp-title' }, ['威胁情报助手', h('small', { text: '多源研判 · 一键跳转' })]),
    h('button', { class: 'pp-ibtn', text: '🕐', title: '最近查询' }),
    h('button', { class: 'pp-ibtn', text: '⚙' }),
  ]),
  h('div', { class: 'pp-search' }, [
    h('input', { class: 'pp-in', value: '185.220.101.42' }),
    h('button', { class: 'pp-go', text: '查询' }),
  ]),
  out,
  h('div', { class: 'pp-foot' }, [h('span', { text: '结果仅供参考 · 在 ⚙ 设置中配置 API Key' })]),
  ]);
  renderResults(out, { type: 'ip', value: '185.220.101.42', results: mal, aggregate: malAgg }, { theme });
  return h('div', { dataset: { theme }, style: { color: 'var(--fg)' } }, [popup]);
}

function buildOptionsSample(theme: 'light' | 'dark') {
  const card = h('div', { class: 'opt' }, [
    h('div', { class: 'row' }, [
      h('input', { type: 'checkbox', checked: true }),
      h('div', { class: 'src-head' }, [h('span', { class: 'src-name', text: 'VirusTotal' }), h('span', { class: 'tag', text: 'IP / DOMAIN' }), h('span', { class: 'req', text: '需 API Key' })]),
    ]),
    h('div', { class: 'row' }, [h('label', { class: 'k', text: 'API Key' }), h('input', { type: 'password', value: 'a1b2c3d4e5f6g7h8i9j0' })]),
    h('div', { class: 'row' }, [h('label', { class: 'k', text: '权重' }), h('input', { value: '1.5' })]),
    h('div', { class: 'guide' }, [
      h('div', { class: 'guide-t', text: '如何获取 API Key' }),
      h('div', { class: 'lim', text: '免费额度：4 次/分钟、500 次/天' }),
      h('div', {}, [h('a', { text: '前往 virustotal.com/gui/my-apikey', href: '#' })]),
      h('ol', {}, ['打开 virustotal.com 注册账号（需邮箱验证）。', '登录后点右上角头像 → “API key”。', '复制 Personal API Key 填入本插件设置。'].map(s => h('li', { text: s }))),
    ]),
  ]);
  return h('div', { dataset: { theme }, style: { color: 'var(--fg)' } }, [card]);
}

document.head.append(h('style', { text: PAGE_CSS }), h('style', { text: THEME_VARS }), h('style', { text: PANEL_CSS }), h('style', { text: POPUP_CSS }));
const app = h('div', { class: 'page' }, [
  h('div', { class: 'col' }, [h('h2', { text: '弹窗 · 亮色' }), h('div', { class: 'frame' }, [buildPopup('light')])]),
  h('div', { class: 'col' }, [h('h2', { text: '弹窗 · 暗色' }), h('div', { class: 'frame' }, [buildPopup('dark')])]),
  h('div', { class: 'col' }, [h('h2', { text: '设置 · API 申请指引卡片（亮色）' }), buildOptionsSample('light')]),
  h('div', { class: 'col' }, [h('h2', { text: '设置 · 卡片（暗色）' }), buildOptionsSample('dark')]),
]);
document.body.append(app);
