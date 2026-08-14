// VirusTotal v3 适配器。
// 文档：https://docs.virustotal.com/reference/ip-info （免费 Public API：4次/分、500次/天）
// 判定：last_analysis_stats.malicious 引擎数 → 阈值。

import type { Adapter, IndicatorType } from './types';
import { fetchJson } from '../lib/http';

const BASE = 'https://www.virustotal.com/api/v3';

function gui(type: IndicatorType, v: string) {
  if (type === 'url') {
    try { v = new URL(v).hostname.toLowerCase(); } catch { /* keep */ }
    type = 'domain';
  }
  return type === 'ip'
    ? `https://www.virustotal.com/gui/ip-address/${v}`
    : `https://www.virustotal.com/gui/domain/${v}`;
}

export const virustotal: Adapter = {
  id: 'virustotal',
  name: 'VirusTotal',
  supports: ['ip', 'domain', 'hash'],
  requiresKey: true,
  rateLimit: { perMin: 4, perDay: 500 },
  async query(type, value, key) {
    let path: string;
    if (type === 'hash') {
      path = `files/${value}`;
    } else if (type === 'ip') {
      path = `ip_addresses/${value}`;
    } else {
      path = `domains/${value}`;
    }
    const data = await fetchJson(`${BASE}/${path}`, {
      headers: { 'x-apikey': key, accept: 'application/json' },
    });
    const attr = data?.data?.attributes ?? {};
    const stats = attr.last_analysis_stats ?? {};
    const malicious = stats.malicious ?? 0;
    const suspicious = stats.suspicious ?? 0;
    const harmless = stats.harmless ?? 0;
    const undetected = stats.undetected ?? 0;
    const total = malicious + suspicious + harmless + undetected;
    const tags: string[] = Array.isArray(attr.tags) ? attr.tags.slice(0, 8) : [];

    let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    let score: number;
    if (malicious >= 3) {
      verdict = 'malicious';
      score = Math.min(100, 45 + malicious * 6);
    } else if (malicious >= 1 || suspicious >= 2) {
      verdict = 'suspicious';
      score = 40;
    } else {
      verdict = total > 0 ? 'clean' : 'unknown';
      score = 0;
    }

    return {
      source: 'virustotal',
      sourceName: 'VirusTotal',
      verdict,
      score,
      summary: `${malicious}/${total} 引擎判定恶意（可疑 ${suspicious}）`,
      tags,
      detailsUrl: type === 'hash'
        ? `https://www.virustotal.com/gui/file/${value}`
        : gui(type, value),
      queriedAt: Date.now(),
    };
  },
};
