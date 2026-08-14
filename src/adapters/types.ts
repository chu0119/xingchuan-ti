// 统一的情报源适配器类型定义。
// 所有适配器把各自平台的返回归一到这里的 QueryResult，编排器据此做加权评分。

export type IndicatorType = 'ip' | 'domain' | 'url' | 'hash';

/** 单源判定结果（归一后）。 */
export type Verdict = 'malicious' | 'suspicious' | 'clean' | 'unknown';

export interface QueryResult {
  /** 适配器 id，对应 Settings.sources 的 key */
  source: string;
  /** 展示名 */
  sourceName: string;
  verdict: Verdict;
  /** 该源原始评分 0-100，没有则 null */
  score: number | null;
  /** 一句话结论 */
  summary: string;
  /** 标签：botnet / scanner / phishing / 端口 等 */
  tags: string[];
  /** 该源详情页（点击跳转） */
  detailsUrl: string;
  queriedAt: number;
  /** 出错时填，前端据此显示错误而非判定 */
  error?: string;
}

/** 适配器接口：每个情报源实现一个。 */
export interface Adapter {
  id: string;
  name: string;
  supports: IndicatorType[];
  requiresKey: boolean;
  rateLimit: { perDay?: number; perMin?: number };
  /** 调用失败应 throw，由编排器捕获并转成 error 结果。 */
  query(type: IndicatorType, value: string, key: string): Promise<QueryResult>;
}

/** 加权聚合后的总体结论。 */
export interface AggregateResult {
  /** 0-100，无数据为 null */
  score: number | null;
  label: Verdict;
  /** 实际参与评分的源数量 */
  contributors: number;
  /** 报恶意/可疑的源数（确认恶意/可疑） */
  flagCount: number;
  /** 报 clean 的源数 */
  cleanCount: number;
}

export interface SourceSetting {
  enabled: boolean;
  apiKey: string;
  /** 加权权重，可在设置页调整 */
  weight: number;
}

export interface Settings {
  sources: Record<string, SourceSetting>;
  triggers: { selection: boolean; contextMenu: boolean; popup: boolean };
  /** 缓存 TTL（分钟） */
  cacheTtlMin: number;
  /** 主题：light / dark / auto（跟随系统） */
  theme: 'light' | 'dark' | 'auto';
  /** 恶性 verdict 桌面通知 */
  notifyOnMalicious: boolean;
  /** 允许清单：用户标记为已知良性的 IP/域名，查询时跳过 */
  allowlist: string[];
}
