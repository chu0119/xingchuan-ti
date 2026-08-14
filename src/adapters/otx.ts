// AlienVault OTX 适配器（ip[v4/v6] + domain）。免费、宽松；API Key 可选。
// 文档：https://otx.alienvault.com/api （/api/v1/indicators/{IPv4|IPv6|domain}/{value}/general）
// 注：OTX 的指标类型区分大小写——IPv4 / IPv6 / domain（小写 ip 会 404）。
// 判定：相关 pulse 数（启发式阈值）。

import type { Adapter } from './types';
import { fetchJson } from '../lib/http';
import { isIPv6 } from '../lib/detect';

export const otx: Adapter = {
  id: 'otx',
  name: 'AlienVault OTX',
  supports: ['ip', 'domain'],
  requiresKey: false,
  rateLimit: {},
  async query(type, value, key) {
    const seg = type === 'ip' ? (isIPv6(value) ? 'IPv6' : 'IPv4') : 'domain';
    const headers: Record<string, string> = {};
    if (key) headers['X-OTX-API-KEY'] = key;
    const data = await fetchJson(`https://otx.alienvault.com/api/v1/indicators/${seg}/${value}/general`, { headers });

    const pi = data?.pulse_info ?? {};
    const count = pi.count ?? 0;
    const tags: string[] = [];

    // 相关 pulse 名称
    const pulses = Array.isArray(pi.pulses) ? pi.pulses : [];
    for (const p of pulses.slice(0, 5)) {
      if (p?.name) tags.push(p.name);
    }
    // 关联恶意软件家族（related 是对象）
    const rel = pi.related ?? {};
    for (const k of ['alienvault', 'other'] as const) {
      const mf = rel[k]?.malware_families;
      if (Array.isArray(mf)) {
        for (const m of mf.slice(0, 3)) tags.push(typeof m === 'string' ? m : m?.display_name || m?.name || '');
      }
    }

    let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    let score: number | null;
    if (count >= 15) {
      verdict = 'malicious';
      score = Math.min(100, 50 + count * 2);
    } else if (count >= 3) {
      verdict = 'suspicious';
      score = 40 + count * 2;
    } else if (count > 0) {
      verdict = 'suspicious';
      score = 30;
    } else {
      verdict = 'clean';
      score = 0;
    }

    return {
      source: 'otx',
      sourceName: 'AlienVault OTX',
      verdict,
      score,
      summary: `相关 ${count} 个威胁 Pulse`,
      tags: tags.filter(Boolean).slice(0, 8),
      detailsUrl:
        type === 'ip'
          ? `https://otx.alienvault.com/indicator/ip/${value}`
          : `https://otx.alienvault.com/indicator/domain/${value}`,
      queriedAt: Date.now(),
    };
  },
};
