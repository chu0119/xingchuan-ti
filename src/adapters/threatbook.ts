// 微步在线 ThreatBook 适配器（IP + 域名）。
// IP 文档：https://x.threatbook.com/apiDocs/ip/reputation
// 域名文档：https://x.threatbook.com/apiDocs/domain/query
// 鉴权：apikey 参数。个人免费 ~10次/天 + 100次/月。

import type { Adapter, QueryResult, Verdict } from './types';
import { fetchJson, qs } from '../lib/http';

export const threatbook: Adapter = {
  id: 'threatbook',
  name: '微步在线',
  supports: ['ip', 'domain'],
  requiresKey: true,
  rateLimit: { perDay: 10 },
  async query(type, value, key) {
    const isIP = type === 'ip';
    const endpoint = isIP ? 'scene/ip_reputation' : 'domain/query';
    const url = `https://api.threatbook.cn/v3/${endpoint}?${qs({ apikey: key, resource: value })}`;
    const data = await fetchJson(url);

    // 微步 API 错误时返回非零 response_code + verbose_msg（如 Key 无效），必须显式报错
    if (data?.response_code != null && data.response_code !== 0) {
      throw new Error(data?.verbose_msg || `微步 API 错误 (code ${data.response_code})`);
    }

    // 微步返回结构（IP/域名类似）：{ response_code, verbose_msg, threat_infos: { judgements:[...], confidence, tags_classes:[...] } }
    const ti = data?.threat_infos ?? {};
    const judgementsRaw: any[] = ti.judgements ?? data?.judgements ?? [];
    const judgements: string[] = judgementsRaw.map((j: any) =>
      typeof j === 'string' ? j : j?.judgement ?? j?.label ?? '',
    );
    const confidence: number | null = ti.confidence ?? data?.confidence ?? null;
    const tagClasses: string[] = (ti.tags_classes ?? ti.tags ?? []).map((t: any) =>
      typeof t === 'string' ? t : t?.tag ?? t?.tags_class ?? '',
    );

    // 域名查询的 judgments 可能包含 "Whitelist"、"C2"、"Malware" 等
    const joined = judgements.join(' ');
    let verdict: Verdict;
    if (/malicious|恶意|c2|malware|botnet|phishing/i.test(joined)) verdict = 'malicious';
    else if (/suspicious|可疑|gray|grey|灰/i.test(joined)) verdict = 'suspicious';
    else if (/whitelist|clean|白名单/i.test(joined)) verdict = 'clean';
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
      detailsUrl: isIP
        ? `https://x.threatbook.com/v5/ip/${value}`
        : `https://x.threatbook.com/v5/domain/${value}`,
      queriedAt: Date.now(),
    } satisfies QueryResult;
  },
};
