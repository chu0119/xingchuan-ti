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
  verdictEscalated?: boolean;
  lastLabel?: string;
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
  /** verdict 升级告警 */
  verdictEscalated?: boolean;
  lastLabel?: string;
}

const VERDICT_TEXT: Record<string, string> = { malicious: '恶意', suspicious: '可疑', clean: '干净', unknown: '未知' };

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

function verdictChip(verdict: Verdict | 'error') {
  const text = verdict === 'error' ? '出错' : VERDICT_TEXT[verdict] ?? verdict;
  const color = verdict === 'error' ? LABEL_COLOR.malicious : LABEL_COLOR[verdict];
  return h('span', { class: 'ti-vchip', text, style: { background: color } });
}

function barFor(r: QueryResult) {
  if (r.error || r.verdict === 'unknown' || r.score == null) return null;
  return h('div', { class: 'ti-bar' }, [h('i', { style: { width: `${Math.max(4, r.score)}%`, background: LABEL_COLOR[r.verdict] } })]);
}

/** 源列表：紧凑单行 + 点击手风琴展开详情（单开） */
function sourceList(results: QueryResult[]) {
  const wrap = h('div', { class: 'ti-section' }, [
    h('div', { class: 'ti-stitle' }, ['多源研判', h('span', { class: 'ti-count', text: String(results.length) })]),
  ]);
  for (const r of results) {
    const v: Verdict | 'error' = r.error ? 'error' : r.verdict;
    const sc = r.error ? '!' : r.score == null ? '—' : String(r.score);
    const row = h('div', { class: 'ti-srow' }, [
      makeIcon(r.source, '#646a73'),
      h('span', { class: 'nm', text: r.sourceName }),
      verdictChip(v),
      h('span', { class: 'sc', text: sc }),
      h('span', { class: 'ti-arrow', text: '▾' }),
    ]);
    // 详情面板（默认收起）
    const detail = h('div', { class: 'ti-srow-detail', style: { display: 'none' } });
    if (r.error) {
      detail.append(h('div', { class: 'ti-err-row' }, [
        h('span', { class: 'ti-err-icon', text: '⚠' }),
        h('span', { class: 'ti-summary ti-err', text: r.error }),
      ]));
    } else {
      if (r.summary) detail.append(h('div', { class: 'ti-summary', text: r.summary }));
      const bar = barFor(r);
      if (bar) detail.append(bar);
      if (r.tags.length) {
        detail.append(h('div', { class: 'ti-tags' }, r.tags.slice(0, 8).map(t => h('span', { class: 'ti-tag', text: t }))));
      }
      if (r.detailsUrl) {
        detail.append(h('a', {
          class: 'ti-src-link', text: '在源站查看详情 →', href: r.detailsUrl,
          target: '_blank', rel: 'noopener', style: { display: 'inline-block', marginTop: '4px' },
        }));
      }
    }
    row.addEventListener('click', () => {
      const wasOpen = detail.style.display !== 'none';
      // 单开手风琴：收起其他行
      wrap.querySelectorAll('.ti-srow-detail').forEach(d => ((d as HTMLElement).style.display = 'none'));
      wrap.querySelectorAll('.ti-srow.open').forEach(x => x.classList.remove('open'));
      if (!wasOpen) {
        detail.style.display = '';
        row.classList.add('open');
      }
    });
    wrap.append(row, detail);
  }
  return wrap;
}

function jumpSection(type: IndicatorType, value: string) {
  const all = platformsFor(type);
  const row = (tag: string, list: typeof all) => {
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
    return h('div', { class: 'ti-jrow' }, [h('span', { class: 'ti-jtag', text: tag }), h('div', { class: 'ti-jumpline' }, icons)]);
  };
  return h('div', { class: 'ti-section' }, [
    h('div', { class: 'ti-stitle' }, ['一键跳转']),
    row('国内', all.filter(p => p.region === 'cn')),
    row('国外', all.filter(p => p.region === 'intl')),
  ]);
}

export function renderResults(root: HTMLElement | ShadowRoot, p: PanelPayload, opts: RenderOpts = {}): void {
  root.replaceChildren();
  const agg = p.aggregate;
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

  const TYPE_LABEL: Record<string, string> = { ip: 'IP', domain: 'DOMAIN', url: 'URL', hash: 'HASH' };
  const head = h('div', { class: 'ti-head' }, [
    h('span', { class: 'ti-typechip', text: TYPE_LABEL[p.type] ?? p.type.toUpperCase() }),
    h('span', { class: 'ti-value', text: p.value }),
    h('div', { class: 'ti-acts' }, acts),
  ]);
  // 判定横幅：全宽彩色渐变（红=恶意/橙=可疑/绿=干净/灰=无数据）
  const subParts: string[] = [];
  if (agg.flagCount > 0) subParts.push(`${agg.flagCount} 源确认${agg.label === 'malicious' ? '恶意' : '可疑'}`);
  if (agg.cleanCount > 0) subParts.push(`${agg.cleanCount} 源查无记录`);
  subParts.push(`${agg.contributors} 源参与`);
  const banner = h('div', { class: 'ti-verdict', dataset: { v: agg.label } }, [
    h('div', { class: 'v-main' }, [
      h('span', { class: 'v-label', text: labelText }),
      h('span', { class: 'v-score', text: agg.score == null ? '—' : `${agg.score}/100` }),
    ]),
    h('div', { class: 'v-sub', text: subParts.join(' · ') }),
  ]);
  // verdict 升级告警条
  const escalation = opts.verdictEscalated
    ? h('div', { class: 'ti-escalation', text: `⚠ 上次查为 ${opts.lastLabel === 'clean' ? '干净' : opts.lastLabel}，本次升级为 ${VERDICT_TEXT[agg.label]}` })
    : null;

  const foot = h('div', { class: 'ti-foot' }, [
    h('span', { text: '结果仅供参考，最终判断请结合上下文' }),
    opts.onOpenSettings ? h('a', { text: '设置', onClick: opts.onOpenSettings }) : null,
  ]);

  const kids: (Node | null)[] = [head, escalation, banner, sourceList(p.results), jumpSection(p.type, p.value), foot];
  const shell = h('div', { class: 'ti-shell', dataset: { theme: opts.theme ?? 'light' } }, kids.filter(Boolean) as Node[]);
  root.append(shell);
}

export function renderLoading(root: HTMLElement | ShadowRoot, text = '正在查询多个情报源…', theme: 'light' | 'dark' = 'light', onClose?: () => void): void {
  const close = onClose
    ? h('button', { class: 'ti-close-btn', html: SVG.close, title: '关闭', onClick: onClose })
    : null;
  root.replaceChildren(
    h('div', { class: 'ti-shell', style: { position: 'relative' }, dataset: { theme } }, [
      close,
      h('div', { class: 'ti-loading' }, [h('div', { class: 'ti-spinner' }), text]),
    ]),
  );
}

export function renderHint(root: HTMLElement | ShadowRoot, text: string, theme: 'light' | 'dark' = 'light', onClose?: () => void): void {
  const close = onClose
    ? h('button', { class: 'ti-close-btn', html: SVG.close, title: '关闭', onClick: onClose })
    : null;
  root.replaceChildren(
    h('div', { class: 'ti-shell', style: { position: 'relative' }, dataset: { theme } }, [close, h('div', { class: 'ti-empty', text })]),
  );
}
