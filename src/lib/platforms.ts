// 一键跳转注册表（B 功能）：各情报平台的详情页 URL 模板 + 真实 favicon。
// 无论平台有没有 API，都能跳。SPA 平台没有公开直链，退化为打开搜索首页。
// 跳转图标用各平台自身的 favicon.ico（真实厂家图标），加载失败回退首字母色块。

import type { IndicatorType } from '../adapters/types';

export interface Platform {
  id: string;
  name: string;
  region: 'cn' | 'intl';
  supports: IndicatorType[];
  /** 不支持的类型返回 null（前端隐藏） */
  buildUrl: (type: IndicatorType, value: string) => string | null;
  /** 品牌色（回退色块 + 渐变用） */
  color: string;
  /** 取 favicon 的域名 */
  favicon: string;
}

const ip = (base: (v: string) => string): Platform['buildUrl'] => (t, v) => (t === 'ip' ? base(v) : null);
const both = (ipFn: (v: string) => string, domFn: (v: string) => string): Platform['buildUrl'] => (t, v) => {
  if (t === 'ip') return ipFn(v);
  if (t === 'domain') return domFn(v);
  if (t === 'url') {
    try { return domFn(new URL(v).hostname.toLowerCase()); } catch { return null; }
  }
  if (t === 'hash') return null; // 哈希类型：仅 VT 支持，由 VT 单独处理
  return null;
};

export const PLATFORMS: Platform[] = [
  // ===== 国内 =====
  { id: 'threatbook', name: '微步', region: 'cn', supports: ['ip', 'domain'], favicon: 'x.threatbook.com',
    buildUrl: both(v => `https://x.threatbook.com/v5/ip/${v}`, v => `https://x.threatbook.com/v5/domain/${v}`), color: '#1e88e5' },
  { id: 'qianxin', name: '奇安信', region: 'cn', supports: ['ip', 'domain'], favicon: 'ti.qianxin.com',
    buildUrl: both(v => `https://ti.qianxin.com/v2/ip/${v}`, v => `https://ti.qianxin.com/v2/domain/${v}`), color: '#d32f2f' },
  { id: 'chaitin', name: '长亭', region: 'cn', supports: ['ip'], favicon: 'rivers.chaitin.cn',
    buildUrl: ip(v => `https://rivers.chaitin.cn/ip-intelligence?search=${v}`), color: '#1565c0' },
  { id: 'tencent', name: '腾讯TIX', region: 'cn', supports: ['ip', 'domain'], favicon: 'tix.qq.com',
    buildUrl: both(v => `https://tix.qq.com/#/ti/ip/${v}`, v => `https://tix.qq.com/#/ti/domain/${v}`), color: '#0052d9' },
  { id: '360', name: '360', region: 'cn', supports: ['ip', 'domain'], favicon: 'ti.360.net',
    buildUrl: both(v => `https://ti.360.net/ip/${v}`, v => `https://ti.360.net/domain/${v}`), color: '#43a047' },
  { id: 'nsfocus', name: '绿盟', region: 'cn', supports: ['ip', 'domain'], favicon: 'ti.nsfocus.com',
    buildUrl: both(v => `https://ti.nsfocus.com/ip?query=${v}`, v => `https://ti.nsfocus.com/domain?query=${v}`), color: '#6a1b9a' },
  { id: 'dbapp', name: '安恒', region: 'cn', supports: ['ip', 'domain'], favicon: 'ti.dbappsecurity.com.cn',
    buildUrl: both(v => `https://ti.dbappsecurity.com.cn/ip/${v}`, v => `https://ti.dbappsecurity.com.cn/domain/${v}`), color: '#ef6c00' },
  { id: 'chinaz', name: '站长之家', region: 'cn', supports: ['ip', 'domain'], favicon: 'ip.tool.chinaz.com',
    buildUrl: both(v => `https://ip.tool.chinaz.com/${v}`, v => `https://whois.chinaz.com/${v}`), color: '#5e35b1' },
  { id: 'ip138', name: 'IP138', region: 'cn', supports: ['ip'], favicon: 'm.ip138.com',
    buildUrl: ip(v => `https://m.ip138.com/iplookup.asp?ip=${v}`), color: '#8d6e63' },

  // ===== 国外 =====
  { id: 'virustotal', name: 'VirusTotal', region: 'intl', supports: ['ip', 'domain', 'hash'], favicon: 'www.virustotal.com',
    buildUrl: (t, v) => {
      if (t === 'ip') return `https://www.virustotal.com/gui/ip-address/${v}`;
      if (t === 'domain') return `https://www.virustotal.com/gui/domain/${v}`;
      if (t === 'hash') return `https://www.virustotal.com/gui/file/${v}`;
      if (t === 'url') { try { return `https://www.virustotal.com/gui/domain/${new URL(v).hostname.toLowerCase()}`; } catch { return null; } }
      return null;
    }, color: '#1a73e8' },
  { id: 'abuseipdb', name: 'AbuseIPDB', region: 'intl', supports: ['ip'], favicon: 'www.abuseipdb.com',
    buildUrl: ip(v => `https://www.abuseipdb.com/check/${v}`), color: '#0d47a1' },
  { id: 'otx', name: 'AlienVault', region: 'intl', supports: ['ip', 'domain'], favicon: 'otx.alienvault.com',
    buildUrl: both(v => `https://otx.alienvault.com/indicator/ip/${v}`, v => `https://otx.alienvault.com/indicator/domain/${v}`), color: '#e65100' },
  { id: 'shodan', name: 'Shodan', region: 'intl', supports: ['ip'], favicon: 'www.shodan.io',
    buildUrl: ip(v => `https://www.shodan.io/host/${v}`), color: '#c62828' },
  { id: 'censys', name: 'Censys', region: 'intl', supports: ['ip'], favicon: 'search.censys.io',
    buildUrl: ip(v => `https://search.censys.io/hosts/${v}`), color: '#2e7d32' },
  { id: 'greynoise', name: 'GreyNoise', region: 'intl', supports: ['ip'], favicon: 'viz.greynoise.io',
    buildUrl: ip(v => `https://viz.greynoise.io/ip/${v}`), color: '#37474f' },
  { id: 'urlscan', name: 'urlscan.io', region: 'intl', supports: ['ip', 'domain'], favicon: 'urlscan.io',
    buildUrl: both(v => `https://urlscan.io/ip/${v}`, v => `https://urlscan.io/domain/${v}`), color: '#00838f' },
  { id: 'securitytrails', name: 'SecurityTrails', region: 'intl', supports: ['ip', 'domain'], favicon: 'securitytrails.com',
    buildUrl: both(v => `https://securitytrails.com/list/ip/${v}`, v => `https://securitytrails.com/domain/${v}/dns`), color: '#ad1457' },
  { id: 'threatfox', name: 'ThreatFox', region: 'intl', supports: ['ip', 'domain', 'url', 'hash'], favicon: 'threatfox.abuse.ch',
    buildUrl: (t, v) => `https://threatfox.abuse.ch/browse/search/${encodeURIComponent(v)}`, color: '#7b1fa2' },
  { id: 'malwarebazaar', name: 'MalwareBazaar', region: 'intl', supports: ['hash', 'domain'], favicon: 'bazaar.abuse.ch',
    buildUrl: (t, v) => t === 'hash'
      ? `https://bazaar.abuse.ch/browse.php?search=sha256:${v}`
      : `https://bazaar.abuse.ch/browse.php?search=tag:${v}`, color: '#4a148c' },
];

export function platformsFor(type: IndicatorType): Platform[] {
  return PLATFORMS.filter(p => p.supports.includes(type));
}
