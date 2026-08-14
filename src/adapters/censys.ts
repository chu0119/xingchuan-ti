// Censys 适配器（仅 IP）。需要 API Key（免费注册）。
// 文档：https://search.censys.io/api （免费层有查询额度）
// 判定：开放端口、已知漏洞、地理位置。

import type { Adapter } from './types';
import { fetchJson } from '../lib/http';

export const censys: Adapter = {
  id: 'censys',
  name: 'Censys',
  supports: ['ip'],
  requiresKey: true,
  rateLimit: { perDay: 100 },
  async query(type, value, key) {
    if (type !== 'ip') throw new Error('Censys 仅支持 IP');

    // Censys API 使用 HTTP Basic Auth（AppID:Secret）
    const auth = btoa(key);
    const data = await fetchJson(`https://search.censys.io/api/v2/hosts/${value}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    const result = data?.result ?? {};
    const services = result.services ?? [];
    const ports = services.map((s: any) => s.port).filter(Boolean);
    const vulns: string[] = [];
    for (const svc of services) {
      if (Array.isArray(svc.vulns)) vulns.push(...svc.vulns);
    }

    const tags: string[] = [];
    if (result.location?.country) tags.push(result.location.country);
    if (result.autonomous_system?.name) tags.push(result.autonomous_system.name);
    ports.slice(0, 6).forEach((p: number) => tags.push(`端口 ${p}`));
    vulns.slice(0, 4).forEach(v => tags.push(v));

    let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown';
    let score: number | null;
    if (vulns.length >= 3) {
      verdict = 'suspicious';
      score = Math.min(70, 30 + vulns.length * 8);
    } else if (vulns.length > 0) {
      verdict = 'suspicious';
      score = 25;
    } else {
      verdict = 'clean';
      score = 0;
    }

    return {
      source: 'censys',
      sourceName: 'Censys',
      verdict,
      score,
      summary: vulns.length > 0
        ? `${vulns.length} 个已知漏洞，开放 ${ports.length} 端口`
        : `开放 ${ports.length} 个端口，无已知漏洞`,
      tags: tags.slice(0, 8),
      detailsUrl: `https://search.censys.io/hosts/${value}`,
      queriedAt: Date.now(),
    };
  },
};
