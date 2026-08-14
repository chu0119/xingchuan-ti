// ThreatFox (abuse.ch) 适配器（IP + 域名 + URL + 哈希）。需要 Auth-Key（免费注册）。
// 文档：https://threatfox.abuse.ch/api/ （免费，注册后获取 Auth-Key）
// 判定：IOC 质量高（社区提交+人工审核），C2 指标覆盖 malware family、端口、协议。

import type { Adapter } from './types';
import { fetchJson, extractHost } from '../lib/http';

export const threatfox: Adapter = {
  id: 'threatfox',
  name: 'ThreatFox',
  supports: ['ip', 'domain', 'url', 'hash'],
  requiresKey: true,
  rateLimit: { perDay: 100 },
  async query(type, value, key) {
    const queryValue = type === 'url' ? extractHost(value) : value;

    const headers: Record<string, string> = {
      'Auth-Key': key,
      'Content-Type': 'application/json',
    };

    const data = await fetchJson('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'search_ioc', search_term: queryValue }),
    });

    if (data?.query_status === 'no_result') {
      return {
        source: 'threatfox',
        sourceName: 'ThreatFox',
        verdict: 'clean',
        score: 0,
        summary: 'ThreatFox 无匹配 IOC',
        tags: [],
        detailsUrl: `https://threatfox.abuse.ch/browse/search/${encodeURIComponent(queryValue)}`,
        queriedAt: Date.now(),
      };
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    const iocs = Array.isArray(data?.data) ? data.data : [];
    const tags: string[] = [];
    for (const ioc of iocs.slice(0, 5)) {
      if (ioc?.malware) tags.push(ioc.malware);
      if (ioc?.threat_type) tags.push(ioc.threat_type);
    }

    const count = iocs.length;
    let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    let score: number | null;
    if (count >= 3) {
      verdict = 'malicious';
      score = Math.min(100, 70 + count * 5);
    } else if (count >= 1) {
      verdict = 'malicious';
      score = 60;
    } else {
      verdict = 'clean';
      score = 0;
    }

    return {
      source: 'threatfox',
      sourceName: 'ThreatFox',
      verdict,
      score,
      summary: count > 0
        ? `${count} 个 C2 IOC 匹配`
        : '无匹配 IOC',
      tags: tags.filter(Boolean).slice(0, 8),
      detailsUrl: `https://threatfox.abuse.ch/browse/search/${encodeURIComponent(queryValue)}`,
      queriedAt: Date.now(),
    };
  },
};
