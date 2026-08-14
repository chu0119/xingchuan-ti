// urlscan.io 适配器（IP + 域名 + URL）。免费、无需 Key；API Key 可选（提高限额）。
// 文档：https://urlscan.io/docs/api/ （免费 ~100 次/天）
// 判定：扫描结果中的 malicious 标签和分数。

import type { Adapter } from './types';
import { fetchJson, extractHost } from '../lib/http';

export const urlscan: Adapter = {
  id: 'urlscan',
  name: 'urlscan.io',
  supports: ['ip', 'domain', 'url'],
  requiresKey: false,
  rateLimit: { perDay: 100 },
  async query(type, value, key) {
    const queryValue = type === 'url' ? extractHost(value) : value;
    const queryType = type === 'url' ? 'domain' : type;
    const query = queryType === 'ip' ? `ip:${queryValue}` : `domain:${queryValue}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (key) headers['API-Key'] = key;

    const data = await fetchJson(`https://urlscan.io/api/v1/search/?q=${encodeURIComponent(query)}&size=1`, { headers });

    const results = data?.results ?? [];
    if (results.length === 0) {
      return {
        source: 'urlscan',
        sourceName: 'urlscan.io',
        verdict: 'unknown',
        score: null,
        summary: 'urlscan.io 无扫描记录',
        tags: [],
        detailsUrl: queryType === 'ip'
          ? `https://urlscan.io/ip/${queryValue}`
          : `https://urlscan.io/domain/${queryValue}`,
        queriedAt: Date.now(),
      };
    }

    const r = results[0];
    const stats = r?.stats ?? {};
    const malicious = stats.malicious ?? 0;
    const suspicious = stats.suspicious ?? 0;
    const total = malicious + suspicious + (stats.harmless ?? 0) + (stats.undetected ?? 0);
    const tags: string[] = [];
    if (r?.page?.country) tags.push(r.page.country);
    if (r?.page?.server) tags.push(r.page.server);
    if (r?.task?.url) tags.push(r.task.url.slice(0, 60));

    let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    let score: number | null;
    if (malicious >= 2) {
      verdict = 'malicious';
      score = Math.min(100, 60 + malicious * 10);
    } else if (malicious >= 1 || suspicious >= 2) {
      verdict = 'suspicious';
      score = 40;
    } else {
      verdict = total > 0 ? 'clean' : 'unknown';
      score = 0;
    }

    return {
      source: 'urlscan',
      sourceName: 'urlscan.io',
      verdict,
      score,
      summary: malicious > 0
        ? `${malicious}/${total} 引擎判定恶意（可疑 ${suspicious}）`
        : `扫描记录存在，无恶意标记`,
      tags: tags.slice(0, 8),
      detailsUrl: r?.result
        ? `https://urlscan.io/api/v1/result/${r._id}/`
        : queryType === 'ip'
          ? `https://urlscan.io/ip/${queryValue}`
          : `https://urlscan.io/domain/${queryValue}`,
      queriedAt: Date.now(),
    };
  },
};
