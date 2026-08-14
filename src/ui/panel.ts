// 结果渲染：content 内嵌面板 与 popup 共用同一函数。
// 紧凑布局：评分环 + 多源方块(悬停"查看详情"/点击展开持久详情) + 一行跳转小图标(悬停厂名) + 操作按钮 + 亮暗主题。
// 图标用打包的真实 favicon（icons/platforms/{id}.png），加载失败回退品牌色盾牌（非字母）。

import type { AggregateResult, IndicatorType, QueryResult, Verdict } from '../adapters/types';
import { platformsFor } from '../lib/platforms';
import { LABEL_COLOR } from '../lib/score';
import type { Detected } from '../lib/detect';
import { h } from './dom';

export interface PanelPayload {
  type: IndicatorType;
  value: string;
  results: QueryResult[];
  aggregate: AggregateResult;
}

export interface RenderOpts {
  theme?: 'light' | 'dark';
  onClose?: () => void;
  onRefresh?: () => void;
  onCopy?: () => void;
  onOpenSettings?: () => void;
  iocs?: Detected[];
  index?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

const VERDICT_TEXT: Record<string, string> = { malicious: '恶意', suspicious: '可疑', clean: '干净', unknown: '未知' };
const SHORT: Record<string, string> = {
  virustotal: 'VirusTotal', abuseipdb: 'AbuseIPDB', otx: 'OTX', shodan: 'Shodan', greynoise: 'GreyNoise', threatbook: '微步',
};

const SVG = {
  copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`,
  close: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  prev: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  next: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
};

/** 打包图标的扩展内绝对 URL（非扩展环境如测试台回退到本地相对路径）。 */
function iconUrl(id: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL('icons/platforms/' + id + '.png');
  }
  return new URL('../public/icons/platforms/' + id + '.png', location.href).href;
}

/** 品牌色盾牌图标（favicon 加载失败时回退，非字母）。 */
function shieldSvg(color: string): string {
  return `<svg viewBox="0 0 128 128" width="13" height="13"><path d="M64 24 L98 37 V63 C98 88 83 104 64 110 C45 104 30 88 30 63 V37 Z" fill="${color}"/></svg>`;
}

function makeIcon(id: string, fallbackColor: string): HTMLElement {
  const chip = h('span', { class: 'ti-ic' });
  const img = h('img', { src: iconUrl(id), alt: '', loading: 'lazy' });
  img.addEventListener('error', () => {
    chip.innerHTML = shieldSvg(fallbackColor);
  });
  chip.append(img);
  return chip;
}

function ibtn(svg: string, title: string, onClick?: () => void) {
  return h('button', { class: 'ti-ibtn', html: svg, title, type: 'button', ...(onClick ? { onClick } : {}) });
}

function ring(score: number | null, color: string): string {
  const r = 26;
  const C = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, (score ?? 0) / 100));
  const dash = score == null ? 0 : C * frac;
  const center = score == null ? '?' : String(score);
  return `<svg width="60" height="60" viewBox="0 0 60 60">
    <circle class="ti-ringtrack" cx="30" cy="30" r="${r}" fill="none" stroke-width="6"/>
    <circle cx="30" cy="30" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 30 30)"/>
    <text x="30" y="31" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="700" fill="${color}">${center}</text>
  </svg>`;
}

function verdictChip(verdict: Verdict | 'error') {
  const text = verdict === 'error' ? '出错' : VERDICT_TEXT[verdict] ?? verdict;
  const color = verdict === 'error' ? LABEL_COLOR.malicious : LABEL_COLOR[verdict];
  return h('span', { class: 'ti-vchip', text, style: { background: color } });
}

function dot(v: Verdict | 'error') {
  const c = v === 'error' ? LABEL_COLOR.malicious : LABEL_COLOR[v];
  return h('span', { class: 'dot', style: { background: c } });
}

function barFor(r: QueryResult) {
  if (r.error || r.verdict === 'unknown' || r.score == null) return null;
  return h('div', { class: 'ti-bar' }, [h('i', { style: { width: `${Math.max(4, r.score)}%`, background: LABEL_COLOR[r.verdict] } })]);
}

/** 详情卡：r 为 null 时显示提示；点击方块后传入具体源，持久显示。 */
function renderDetail(el: HTMLElement, r: QueryResult | null) {
  el.replaceChildren();
  const kids: (Node | string)[] = [];
  if (!r) {
    el.classList.add('idle');
    kids.push(h('div', { class: 'ti-dhint', text: '点击方块查看该源的判定详情' }));
  } else {
    el.classList.remove('idle');
    const v: Verdict | 'error' = r.error ? 'error' : r.verdict;
    kids.push(
      h('div', { class: 'ti-dtop' }, [
        makeIcon(r.source, '#646a73'),
        h('span', { class: 'ti-name', text: r.sourceName }),
        verdictChip(v),
        h('span', { class: 'ti-srcscore', text: r.error ? '' : r.score == null ? '—' : String(r.score) }),
        r.detailsUrl ? h('a', { class: 'ti-src-link', text: '详情 →', href: r.detailsUrl, target: '_blank', rel: 'noopener' }) : null,
      ]),
    );
    if (r.error) {
      kids.push(h('div', { class: 'ti-summary ti-err', text: r.error }));
    } else {
      if (r.summary) kids.push(h('div', { class: 'ti-summary', text: r.summary }));
      const bar = barFor(r);
      if (bar) kids.push(bar);
      if (r.tags.length) kids.push(h('div', { class: 'ti-tags' }, r.tags.slice(0, 8).map(t => h('span', { class: 'ti-tag', text: t }))));
    }
  }
  el.append(...kids);
}

function sourceSection(results: QueryResult[]) {
  const detailEl = h('div', { class: 'ti-srcdetail' });
  renderDetail(detailEl, null);
  const grid = h('div', { class: 'ti-srcgrid' });
  const tiles: HTMLElement[] = [];
  for (const r of results) {
    const v: Verdict | 'error' = r.error ? 'error' : r.verdict;
    const sc = r.error ? '!' : r.score == null ? '—' : String(r.score);
    const tile = h('div', { class: 'ti-smini', dataset: { v } }, [
      makeIcon(r.source, '#646a73'),
      h('span', { class: 'nm', text: SHORT[r.source] || r.sourceName }),
      h('span', { class: 'sc' }, [dot(v), h('span', { text: sc })]),
      h('div', { class: 'ti-sgo', text: '查看详情' }),
    ]);
    tile.addEventListener('click', () => {
      tiles.forEach(t => t.classList.remove('sel'));
      tile.classList.add('sel');
      renderDetail(detailEl, r);
    });
    grid.append(tile);
    tiles.push(tile);
  }
  return h('div', { class: 'ti-section' }, [
    h('div', { class: 'ti-stitle' }, ['多源研判', h('span', { class: 'ti-count', text: String(results.length) })]),
    grid,
    detailEl,
  ]);
}

function jumpSection(type: IndicatorType, value: string) {
  const all = platformsFor(type);
  const group = (title: string, list: typeof all) => {
    const icons = list
      .map(p => {
        const url = p.buildUrl(type, value);
        if (!url) return null;
        const a = h('a', { class: 'ti-jico', href: url, target: '_blank', rel: 'noopener', dataset: { name: p.name } });
        const img = h('img', { src: iconUrl(p.id), alt: '', loading: 'lazy' });
        img.addEventListener('error', () => {
          a.innerHTML = shieldSvg(p.color);
        });
        a.append(img);
        return a;
      })
      .filter(Boolean);
    if (!icons.length) return null;
    return h('div', {}, [h('div', { class: 'ti-jlab', text: title }), h('div', { class: 'ti-jumpline' }, icons)]);
  };
  const kids = [
    h('div', { class: 'ti-stitle' }, ['一键跳转']),
    group('国内', all.filter(p => p.region === 'cn')),
    group('国外', all.filter(p => p.region === 'intl')),
  ].filter(Boolean);
  return h('div', { class: 'ti-section' }, kids);
}

export function renderResults(root: HTMLElement | ShadowRoot, p: PanelPayload, opts: RenderOpts = {}): void {
  root.replaceChildren();
  const agg = p.aggregate;
  const color = LABEL_COLOR[agg.label];
  const labelText = agg.label === 'unknown' ? '无数据' : VERDICT_TEXT[agg.label];

  const acts: Node[] = [];
  if (opts.onCopy) acts.push(ibtn(SVG.copy, '复制', opts.onCopy));
  if (opts.onRefresh) acts.push(ibtn(SVG.refresh, '刷新（绕过缓存）', opts.onRefresh));
  if (opts.iocs && opts.iocs.length > 1) {
    acts.push(ibtn(SVG.prev, '上一个', opts.onPrev));
    acts.push(h('span', { class: 'ti-nav', text: `${(opts.index ?? 0) + 1}/${opts.iocs.length}` }));
    acts.push(ibtn(SVG.next, '下一个', opts.onNext));
  }
  if (opts.onClose) acts.push(ibtn(SVG.close, '关闭', opts.onClose));

  const head = h('div', { class: 'ti-head' }, [
    h('span', { class: 'ti-typechip', text: p.type === 'ip' ? 'IP' : 'DOMAIN' }),
    h('span', { class: 'ti-value', text: p.value }),
    h('div', { class: 'ti-acts' }, acts),
  ]);
  const flagInfo = agg.flagCount > 0
    ? ` · ${agg.flagCount} 源确认${agg.label === 'malicious' ? '恶意' : '可疑'}`
    : '';
  const cleanInfo = agg.cleanCount > 0 ? ` · ${agg.cleanCount} 源查无记录` : '';
  const scoreband = h('div', { class: 'ti-scoreband' }, [
    h('div', { class: 'ti-ring', html: ring(agg.score, color) }),
    h('div', { class: 'ti-sinfo' }, [
      h('div', { class: 'lab', text: labelText, style: { color } }),
      h('div', { class: 'meta', text: `综合置信度 ${agg.score == null ? '—' : agg.score + '/100'} · ${agg.contributors} 源参与${flagInfo}${cleanInfo}` }),
      h('div', { class: 'ti-legend' }, [
        h('span', {}, [h('i', { style: { background: LABEL_COLOR.malicious } }), '恶意']),
        h('span', {}, [h('i', { style: { background: LABEL_COLOR.suspicious } }), '可疑']),
        h('span', {}, [h('i', { style: { background: LABEL_COLOR.clean } }), '干净']),
      ]),
    ]),
  ]);
  const foot = h('div', { class: 'ti-foot' }, [
    h('span', { text: '结果仅供参考，最终判断请结合上下文' }),
    opts.onOpenSettings ? h('a', { text: '设置', onClick: opts.onOpenSettings }) : null,
  ]);

  const shell = h('div', { class: 'ti-shell', dataset: { theme: opts.theme ?? 'light' } }, [
    head,
    scoreband,
    sourceSection(p.results),
    jumpSection(p.type, p.value),
    foot,
  ]);
  root.append(shell);
}

export function renderLoading(root: HTMLElement | ShadowRoot, text = '正在查询多个情报源…'): void {
  root.replaceChildren(h('div', { class: 'ti-shell', dataset: { theme: 'light' } }, [h('div', { class: 'ti-loading' }, [h('div', { class: 'ti-spinner' }), text])]));
}

export function renderHint(root: HTMLElement | ShadowRoot, text: string): void {
  root.replaceChildren(h('div', { class: 'ti-shell', dataset: { theme: 'light' } }, [h('div', { class: 'ti-empty', text })]));
}
