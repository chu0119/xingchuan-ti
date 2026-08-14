// AbuseIPDB v2 适配器（仅 IP）。
// 文档：https://www.abuseipdb.com/api （免费 1000次/天，含 check+report）
// 判定：abuseConfidenceScore（0-100）。

import type { Adapter } from './types';
import { fetchJson, qs } from '../lib/http';

export const abuseipdb: Adapter = {
  id: 'abuseipdb',
  name: 'AbuseIPDB',
  supports: ['ip'],
  requiresKey: true,
  rateLimit: { perDay: 1000 },
  async query(type, value, key) {
    if (type !== 'ip') throw new Error('AbuseIPDB 仅支持 IP');
    const url = `https://api.abuseipdb.com/api/v2/check?${qs({
      ipAddress: value,
      maxAgeInDays: 90,
    })}`;
    const data = await fetchJson(url, { headers: { Key: key, Accept: 'application/json' } });
    const d = data?.data ?? {};
    const score = d.abuseConfidenceScore ?? 0;
    const reports = d.totalReports ?? 0;
    const verdict = score >= 75 ? 'malicious' : score >= 25 ? 'suspicious' : 'clean';
    const tags: string[] = [];
    if (d.usageType) tags.push(d.usageType);
    if (d.isp) tags.push(d.isp);
    if (d.countryName) tags.push(d.countryName);

    return {
      source: 'abuseipdb',
      sourceName: 'AbuseIPDB',
      verdict,
      score,
      summary: `滥用置信度 ${score}%，近90天 ${reports} 次举报`,
      tags,
      detailsUrl: `https://www.abuseipdb.com/check/${value}`,
      queriedAt: Date.now(),
    };
  },
};
