// background service worker：编排器（并发查源 + 限流 + 缓存 + 加权评分）、右键菜单、消息中枢、查询历史。
// 所有情报 API 在此发起（host_permissions 绕过 CORS）。

import type { IndicatorType, QueryResult } from '../src/adapters/types';
import { ADAPTERS } from '../src/adapters';
import { extractHost } from '../src/lib/http';
import { getSettings } from '../src/lib/storage';
import { aggregate } from '../src/lib/score';
import { tryConsume } from '../src/lib/rateLimit';
import { getCached, setCached } from '../src/lib/cache';
import { detectIndicator } from '../src/lib/detect';
import { addHistory, getHistory } from '../src/lib/history';
import { sendRenderPanel } from '../src/lib/messaging';
import type { ErrorResponse, QueryResponse, RenderPanelMessage } from '../src/lib/messaging';

function errorResult(id: string, name: string, msg: string): QueryResult {
  return {
    source: id,
    sourceName: name,
    verdict: 'unknown',
    score: null,
    summary: '',
    tags: [],
    detailsUrl: '',
    queriedAt: Date.now(),
    error: msg,
  };
}

async function runQuery(
  type: IndicatorType,
  value: string,
  nocache = false,
): Promise<QueryResponse | ErrorResponse> {
  const settings = await getSettings();

  if (!nocache) {
    const cached = await getCached(type, value);
    if (cached) return { ok: true, type, value, results: cached.results, aggregate: cached.aggregate };
  }

  // URL 类型：从 URL 提取域名后查询各源（评分逻辑与域名相同）
  const queryType: IndicatorType = type === 'url' ? 'domain' : type;
  const queryValue = type === 'url' ? extractHost(value) : value;

  const enabled = ADAPTERS.filter(a => {
    const s = settings.sources[a.id];
    if (!s?.enabled) return false;
    if (!a.supports.includes(queryType)) return false;
    if (a.requiresKey && !s.apiKey) return false;
    return true;
  });

  const results: QueryResult[] = [];
  await Promise.all(
    enabled.map(async a => {
      const s = settings.sources[a.id]!;
      const lim = await tryConsume(a.id, a.rateLimit);
      if (!lim.ok) {
        results.push(errorResult(a.id, a.name, lim.reason || '已达配额上限，已跳过'));
        return;
      }
      try {
        results.push(await a.query(queryType, queryValue, s.apiKey));
      } catch (e: any) {
        results.push(errorResult(a.id, a.name, e?.message || String(e)));
      }
    }),
  );

  const agg = aggregate(results, settings);

  // verdict 升级告警：比对上次 verdict
  const hist = await getHistory();
  const prev = hist.find(h => h.type === type && h.value === value);
  const prevLabel = prev?.label;
  const verdictEscalated = prevLabel === 'clean' && (agg.label === 'suspicious' || agg.label === 'malicious');

  await setCached(type, value, { results, aggregate: agg }, settings.cacheTtlMin);
  // 记入最近查询历史（仅本地，确保写入完成后再返回）
  await addHistory({ type, value, ts: Date.now(), label: agg.label, score: agg.score });

  // 恶性 verdict 桌面通知
  if (settings.notifyOnMalicious && agg.label === 'malicious' && agg.score != null) {
    const title = `🚨 恶意指标: ${value}`;
    const msg = `综合评分 ${agg.score}/100 · ${agg.flagCount} 源确认恶意`;
    chrome.notifications?.create?.(`mal-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/128.png',
      title,
      message: msg,
      priority: 2,
    });
  }

  return { ok: true, type, value, results, aggregate: agg, verdictEscalated, lastLabel: prevLabel };
}

export default defineBackground(() => {
  // 右键菜单随“触发方式”设置增删
  async function syncContextMenu() {
    const settings = await getSettings();
    try {
      await chrome.contextMenus.removeAll();
    } catch {
      /* */
    }
    if (settings.triggers.contextMenu) {
      chrome.contextMenus.create({ id: 'ti-query', title: '威胁情报查询 "%s"', contexts: ['selection'] });
    }
  }
  chrome.runtime.onInstalled.addListener(() => void syncContextMenu());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) void syncContextMenu();
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const settings = await getSettings();
    if (!settings.triggers.contextMenu) return;
    if (info.menuItemId !== 'ti-query' || !info.selectionText || !tab?.id) return;
    const det = detectIndicator(info.selectionText);
    if (!det) return;
    const res = await runQuery(det.type, det.value);
    if (!res.ok) return;
    const msg: RenderPanelMessage = {
      kind: 'renderPanel',
      type: res.type,
      value: res.value,
      results: res.results,
      aggregate: res.aggregate,
    };
    sendRenderPanel(tab.id, msg).catch(() => {});
  });

  chrome.runtime.onMessage.addListener((msg, _src, sendResponse) => {
    if (msg?.kind === 'query') {
      runQuery(msg.type as IndicatorType, msg.value as string, Boolean(msg.nocache)).then(r =>
        sendResponse(r),
      );
      return true;
    }
    return false;
  });

  // 键盘快捷键：Ctrl+Shift+Y 查询当前选中文本
  chrome.commands?.onCommand?.addListener(async (command) => {
    if (command !== 'query-selection') return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      const resp = (await chrome.tabs.sendMessage(tab.id, { kind: 'getSelection' })) as { text?: string } | undefined;
      const text = resp?.text;
      if (!text) return;
      const det = detectIndicator(text);
      if (!det) return;
      const res = await runQuery(det.type, det.value);
      if (!res.ok) return;
      sendRenderPanel(tab.id, {
        kind: 'renderPanel',
        type: res.type,
        value: res.value,
        results: res.results,
        aggregate: res.aggregate,
      }).catch(() => {});
    } catch {
      /* 无 content script */
    }
  });
});
