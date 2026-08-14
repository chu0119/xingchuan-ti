// Shodan 适配器（仅 IP）。定位为"富化"：开放端口 / 已知漏洞，权重默认较低。
// 文档：https://book.shodan.io/developer-apis/shodan-api/ （免费 Key 可无限查 host）
// 判定：有已知漏洞 → suspicious；否则 unknown（无定性）。未收录(404) → unknown。

import type { Adapter, QueryResult } from './types';
import { fetchJson, HttpError } from '../lib/http';

export const shodan: Adapter = {
  id: 'shodan',
  name: 'Shodan',
  supports: ['ip'],
  requiresKey: true,
  rateLimit: { perMin: 1 },
  async query(type, value, key) {
    if (type !== 'ip') throw new Error('Shodan 仅支持 IP');
    let data: any;
    try {
      data = await fetchJson(`https://api.shodan.io/shodan/host/${encodeURIComponent(value)}?key=${encodeURIComponent(key)}`);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        return {
          source: 'shodan',
          sourceName: 'Shodan',
          verdict: 'unknown',
          score: null,
          summary: 'Shodan 未收录该 IP',
          tags: [],
          detailsUrl: `https://www.shodan.io/host/${value}`,
          queriedAt: Date.now(),
        } satisfies QueryResult;
      }
      if (e instanceof HttpError && e.status === 403) {
        // 免费账号对部分 IP 需付费会员，非 Key 错误
        return {
          source: 'shodan',
          sourceName: 'Shodan',
          verdict: 'unknown',
          score: null,
          summary: 'Shodan 需付费会员才能查看该 IP',
          tags: [],
          detailsUrl: `https://www.shodan.io/host/${value}`,
          queriedAt: Date.now(),
        } satisfies QueryResult;
      }
      throw e;
    }

    const ports: number[] = data.ports ?? [];
    const vulns: string[] = data.vulns ?? [];
    const tags: string[] = [];
    if (data.org) tags.push(data.org);
    if (data.country_name) tags.push(data.country_name);
    ports.slice(0, 6).forEach(p => tags.push(`端口 ${p}`));
    vulns.slice(0, 4).forEach(v => tags.push(v));

    const verdict = vulns.length > 0 ? 'suspicious' : 'unknown';
    const score = vulns.length > 0 ? Math.min(60, 20 + vulns.length * 8) : null;

    return {
      source: 'shodan',
      sourceName: 'Shodan',
      verdict,
      score,
      summary: vulns.length
        ? `${vulns.length} 个已知漏洞，开放 ${ports.length} 端口`
        : `开放 ${ports.length} 个端口（无定性）`,
      tags,
      detailsUrl: `https://www.shodan.io/host/${value}`,
      queriedAt: Date.now(),
    };
  },
};
