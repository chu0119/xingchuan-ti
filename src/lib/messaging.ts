// 消息协议：content / popup → background 查询；background → content 渲染面板（右键菜单触发）。

import type { AggregateResult, IndicatorType, QueryResult } from '../adapters/types';

export interface QueryRequest {
  kind: 'query';
  type: IndicatorType;
  value: string;
  /** true 时跳过缓存（刷新按钮） */
  nocache?: boolean;
}

export interface QueryResponse {
  ok: true;
  type: IndicatorType;
  value: string;
  results: QueryResult[];
  aggregate: AggregateResult;
  /** verdict 升级告警：上次为 clean，本次为 suspicious/malicious */
  verdictEscalated?: boolean;
  lastLabel?: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

/** content / popup → background */
export function queryBackground(req: QueryRequest): Promise<QueryResponse | ErrorResponse> {
  return chrome.runtime.sendMessage(req);
}

/** background → 指定 tab 的 content script（右键菜单查完弹内嵌面板） */
export interface RenderPanelMessage {
  kind: 'renderPanel';
  type: IndicatorType;
  value: string;
  results: QueryResult[];
  aggregate: AggregateResult;
}

export function sendRenderPanel(tabId: number, msg: RenderPanelMessage): Promise<void> {
  return chrome.tabs.sendMessage(tabId, msg);
}
