// 选中文本 → 识别出 IP(v4/v6) / 域名 / URL / 文件哈希(MD5/SHA1/SHA256)。
// 优先整段当 host 解析（去协议、路径、端口、IPv6 方括号），失败回退到子串搜索。
// URL 识别：提取完整 URL（含协议/路径），用于钓鱼链接、恶意下载等场景。
// 哈希识别：MD5(32位)、SHA1(40位)、SHA256(64位) 十六进制字符串。

import type { IndicatorType } from '../adapters/types';

export interface Detected {
  type: IndicatorType;
  value: string;
}

// 严格 IPv4（每段 0-255）
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV4_SUB = /(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
// FQDN：多段标签 + 顶级域为纯字母（≥2）
const DOMAIN = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const DOMAIN_SUB = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/;
// 文件哈希：MD5(32)、SHA1(40)、SHA256(64) 十六进制
const HASH_RE = /\b[a-fA-F0-9]{64}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{32}\b/g;

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
  const trimmed = raw.trim();

  // 优先识别 URL（含协议/路径）
  const URL_RE = /^https?:\/\/[^\s,;|()\[\]"'<>]+$/i;
  if (URL_RE.test(trimmed)) {
    // 只对 hostname 小写化，保留路径大小写
    try {
      const u = new URL(trimmed);
      u.hostname = u.hostname.toLowerCase();
      return { type: 'url', value: u.toString() };
    } catch {
      return { type: 'url', value: trimmed.toLowerCase() };
    }
  }

  // 识别文件哈希（MD5/SHA1/SHA256）
  const hashMatch = trimmed.match(/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/);
  if (hashMatch) {
    return { type: 'hash', value: trimmed.toLowerCase() };
  }

  const host = toHost(trimmed);
  if (host) {
    if (IPV4.test(host)) return { type: 'ip', value: host };
    if (isIPv6(host)) return { type: 'ip', value: host.toLowerCase() };
    const noPort = host.replace(/:\d+$/, '');
    if (DOMAIN.test(noPort)) return { type: 'domain', value: noPort.toLowerCase() };
  }
  // 回退：子串搜索
  const ip4 = trimmed.match(IPV4_SUB);
  if (ip4) return { type: 'ip', value: ip4[0] };
  const ip6 = findIPv6(trimmed);
  if (ip6) return { type: 'ip', value: ip6.toLowerCase() };
  const dom = trimmed.match(DOMAIN_SUB);
  if (dom) return { type: 'domain', value: dom[0].toLowerCase() };
  return null;
}

/** 选中文本里所有可识别的指标（面板"下一个"切换用）。 */
export function detectAll(raw: string): Detected[] {
  if (!raw) return [];
  const out: Detected[] = [];
  const seen = new Set<string>();

  // 1. 提取 URL（含协议/路径），去重后作为 URL 类型
  const URL_RE = /https?:\/\/[^\s,;|()\[\]"'<>]+/gi;
  for (const m of raw.matchAll(URL_RE)) {
    const u = m[0].toLowerCase();
    if (!seen.has('url:' + u)) {
      seen.add('url:' + u);
      out.push({ type: 'url', value: u });
    }
  }

  // 2. 提取 IPv4
  for (const m of raw.matchAll(new RegExp(IPV4_SUB.source, 'g'))) {
    const v = m[0];
    if (!seen.has('ip:' + v)) {
      seen.add('ip:' + v);
      out.push({ type: 'ip', value: v });
    }
  }

  // 3. 提取 IPv6
  for (const tok of raw.split(/[\s,;|()\[\]]+/)) {
    const v = tok.trim().toLowerCase();
    if (v && isIPv6(v) && !seen.has('ip:' + v)) {
      seen.add('ip:' + v);
      out.push({ type: 'ip', value: v });
    }
  }

  // 4. 提取域名（排除已被 URL 覆盖的）
  for (const m of raw.matchAll(new RegExp(DOMAIN_SUB.source, 'g'))) {
    const v = m[0].toLowerCase();
    const dominated = out.some(d => d.type === 'url' && d.value.includes(v));
    if (!seen.has('dom:' + v) && !IPV4.test(v) && !dominated) {
      seen.add('dom:' + v);
      out.push({ type: 'domain', value: v });
    }
  }

  // 5. 提取文件哈希（MD5/SHA1/SHA256）——每次创建新正则避免 lastIndex 状态问题
  const hashRe = /\b[a-fA-F0-9]{64}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{32}\b/g;
  for (const m of raw.matchAll(hashRe)) {
    const v = m[0].toLowerCase();
    if (!seen.has('hash:' + v)) {
      seen.add('hash:' + v);
      out.push({ type: 'hash', value: v });
    }
  }

  return out;
}
