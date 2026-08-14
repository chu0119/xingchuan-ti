// 选中文本 → 识别出 IP(v4/v6) / 域名。
// 优先整段当 host 解析（去协议/路径/端口/IPv6 方括号），失败回退到子串搜索。

import type { IndicatorType } from '../adapters/types';

export interface Detected {
  type: IndicatorType;
  value: string;
}

// 严格 IPv4（每段 0-255）
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV4_SUB = /(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)/;
// FQDN：多段标签 + 顶级域为纯字母（≥2）
const DOMAIN = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const DOMAIN_SUB = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/;

/** 实用 IPv6 校验（纯 IPv6；不支持 IPv4 映射的混合写法） */
export function isIPv6(s: string): boolean {
  if (!s || !s.includes(':')) return false;
  if (/[^0-9a-fA-F:]/.test(s)) return false;
  const parts = s.split(':');
  if (parts.length < 3 || parts.length > 8) return false;
  if (s.split('::').length > 2) return false; // 至多一个 ::
  for (const p of parts) {
    if (p === '') continue; // '::' 产生的空段
    if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return false;
  }
  return true;
}

/** 在文本里找首个 IPv6 token */
function findIPv6(raw: string): string | null {
  for (const tok of raw.split(/[\s,;|()\[\]]+/)) {
    const t = tok.trim();
    if (t && isIPv6(t)) return t;
  }
  return null;
}

/** 把选中文本规整成 host（去协议、路径、查询、userinfo、IPv6 方括号）。 */
function toHost(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, ''); // 协议头
  s = s.split('/')[0] ?? ''; // 路径
  s = s.split('?')[0] ?? '';
  s = s.split('#')[0] ?? '';
  s = s.replace(/^[^@]+@/, ''); // userinfo
  s = s.trim().replace(/^\[|\]$/g, ''); // IPv6 方括号
  return s;
}

export function detectIndicator(raw: string): Detected | null {
  if (!raw) return null;
  const host = toHost(raw);
  if (host) {
    if (IPV4.test(host)) return { type: 'ip', value: host };
    if (isIPv6(host)) return { type: 'ip', value: host.toLowerCase() };
    const noPort = host.replace(/:\d+$/, '');
    if (DOMAIN.test(noPort)) return { type: 'domain', value: noPort.toLowerCase() };
  }
  // 回退：子串搜索
  const ip4 = raw.match(IPV4_SUB);
  if (ip4) return { type: 'ip', value: ip4[0] };
  const ip6 = findIPv6(raw);
  if (ip6) return { type: 'ip', value: ip6.toLowerCase() };
  const dom = raw.match(DOMAIN_SUB);
  if (dom) return { type: 'domain', value: dom[0].toLowerCase() };
  return null;
}

/** 选中文本里所有可识别的指标（面板"下一个"切换用）。 */
export function detectAll(raw: string): Detected[] {
  if (!raw) return [];
  const out: Detected[] = [];
  const seen = new Set<string>();
  for (const m of raw.matchAll(new RegExp(IPV4_SUB.source, 'g'))) {
    const v = m[0];
    if (!seen.has('ip:' + v)) {
      seen.add('ip:' + v);
      out.push({ type: 'ip', value: v });
    }
  }
  for (const tok of raw.split(/[\s,;|()\[\]]+/)) {
    const v = tok.trim().toLowerCase();
    if (v && isIPv6(v) && !seen.has('ip:' + v)) {
      seen.add('ip:' + v);
      out.push({ type: 'ip', value: v });
    }
  }
  for (const m of raw.matchAll(new RegExp(DOMAIN_SUB.source, 'g'))) {
    const v = m[0].toLowerCase();
    if (!seen.has('dom:' + v) && !IPV4.test(v)) {
      seen.add('dom:' + v);
      out.push({ type: 'domain', value: v });
    }
  }
  return out;
}
