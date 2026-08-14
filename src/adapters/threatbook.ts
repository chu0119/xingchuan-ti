// 微步在线 ThreatBook 适配器（IP；域名 v1 暂未接入）。
// 文档：https://x.threatbook.com/apiDocs/ip/reputation （个人免费 ~10次/天 + 100次/月）
// 鉴权：apikey 参数。判定字段依公开文档解析，必要时按线上返回微调。

import type { Adapter, QueryResult, Verdict } from './types';
import { fetchJson, qs } from '../lib/http';

export const threatbook: Adapter = {
  id: 'threatbook',
  name: '微步在线',
  supports: ['ip'],
  requiresKey: true,
  rateLimit: { perDay: 10 },
  async query(type, value, key) {
    if (type !== 'ip') throw new Error('微步域名查询 v1 暂未接入');
    const url = `https://api.threatbook.cn/v3/scene/ip_reputation?${qs({ apikey: key, resource: value })}`;
    const data = await fetchJson(url);

    // 微步返回结构示例：{ response_code, verbose_msg, threat_infos: { judgements:[...], confidence, tags_classes:[...] } }
    const ti = data?.threat_infos ?? {};
    const judgementsRaw: any[] = ti.judgements ?? data?.judgements ?? [];
    const judgements: string[] = judgementsRaw.map((j: any) =>
      typeof j === 'string' ? j : j?.judgement ?? j?.label ?? '',
    );
    const confidence: number | null = ti.confidence ?? data?.confidence ?? null;
    const tagClasses: string[] = (ti.tags_classes ?? ti.tags ?? []).map((t: any) =>
      typeof t === 'string' ? t : t?.tag ?? t?.tags_class ?? '',
    );

    const joined = judgements.join(' ');
    let verdict: Verdict;
    if (/malicious|恶意/i.test(joined)) verdict = 'malicious';
    else if (/suspicious|可疑|gray|grey|灰/i.test(joined)) verdict = 'suspicious';
    else if (judgements.length) verdict = 'clean';
    else verdict = 'unknown';

    let score: number | null = null;
    if (verdict === 'malicious') score = confidence != null ? Math.min(100, Math.max(60, confidence)) : 85;
    else if (verdict === 'suspicious') score = 45;
    else if (verdict === 'clean') score = 0;

    return {
      source: 'threatbook',
      sourceName: '微步在线',
      verdict,
      score,
      summary: judgements.length ? `判定: ${judgements.join(' / ')}` : '微步无明确判定',
      tags: tagClasses.slice(0, 8),
      detailsUrl: `https://x.threatbook.com/v5/ip/${value}`,
      queriedAt: Date.now(),
    } satisfies QueryResult;
  },
};
