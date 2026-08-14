// GreyNoise 适配器（仅 IP）。区分"互联网扫描器"性质：malicious / benign / unknown。
// 文档：https://docs.greynoise.io/docs/using-the-greynoise-community-api （Community API，免费 ~50次/周）

import type { Adapter } from './types';
import { fetchJson, HttpError } from '../lib/http';

export const greynoise: Adapter = {
  id: 'greynoise',
  name: 'GreyNoise',
  supports: ['ip'],
  requiresKey: true,
  rateLimit: { perDay: 50 },
  async query(type, value, key) {
    if (type !== 'ip') throw new Error('GreyNoise 仅支持 IP');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (key) headers['key'] = key;
    let data: any;
    try {
      data = await fetchJson(`https://api.greynoise.io/v3/community/ip?q=${encodeURIComponent(value)}`, {
        headers,
      });
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        return {
          source: 'greynoise',
          sourceName: 'GreyNoise',
          verdict: 'unknown',
          score: null,
          summary: 'GreyNoise 未收录该 IP',
          tags: [],
          detailsUrl: `https://viz.greynoise.io/ip/${value}`,
          queriedAt: Date.now(),
        };
      }
      throw e;
    }

    const cls = data?.classification; // malicious | benign | unknown
    const verdict = cls === 'malicious' ? 'malicious' : cls === 'benign' ? 'clean' : 'unknown';
    const score = cls === 'malicious' ? 80 : cls === 'benign' ? 0 : null;
    const tags: string[] = [];
    if (data?.name) tags.push(data.name);
    if (Array.isArray(data?.tags)) tags.push(...data.tags.slice(0, 6));
    const label = cls === 'malicious' ? '恶意扫描器' : cls === 'benign' ? '良性' : '未分类';

    return {
      source: 'greynoise',
      sourceName: 'GreyNoise',
      verdict,
      score,
      summary: `${label}${data?.noise ? '（活跃扫描）' : ''}`,
      tags,
      detailsUrl: `https://viz.greynoise.io/ip/${value}`,
      queriedAt: Date.now(),
    };
  },
};
