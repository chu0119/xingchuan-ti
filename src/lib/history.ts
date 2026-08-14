// 最近查询历史：存 chrome.storage.local，按 (type,value) 去重后置顶，最多保留 N 条。
// 仅本地、可一键清空，用于 popup 快速回查。

import type { IndicatorType } from '../adapters/types';

export interface HistoryItem {
  type: IndicatorType;
  value: string;
  ts: number;
  label?: string;
  score?: number | null;
}

const KEY = 'history';
const CAP = 50;

export async function getHistory(): Promise<HistoryItem[]> {
  const arr = (await chrome.storage.local.get(KEY))[KEY];
  return Array.isArray(arr) ? arr : [];
}

export async function addHistory(item: HistoryItem): Promise<void> {
  const list = await getHistory();
  const filtered = list.filter(x => !(x.type === item.type && x.value === item.value));
  filtered.unshift(item);
  await chrome.storage.local.set({ [KEY]: filtered.slice(0, CAP) });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}
