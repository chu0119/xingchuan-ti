// 核心纯逻辑自测：识别 / 加权评分 / 跳转 URL。
// 用 esbuild 打包后由 node 运行：见 package.json（或手动见 README）。

import { detectAll, detectIndicator, isIPv6 } from '../src/lib/detect';
import { aggregate } from '../src/lib/score';
import { PLATFORMS, platformsFor } from '../src/lib/platforms';
import type { QueryResult, Settings } from '../src/adapters/types';

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
  }
}

// ===== 识别 =====
eq('ipv4 纯 IP', detectIndicator('8.8.8.8'), { type: 'ip', value: '8.8.8.8' });
eq('ipv4 带噪音', detectIndicator('连接到 1.2.3.4 即可'), { type: 'ip', value: '1.2.3.4' });
eq('域名', detectIndicator('example.com'), { type: 'domain', value: 'example.com' });
eq('多级域名', detectIndicator('a.b.example.org'), { type: 'domain', value: 'a.b.example.org' });
eq('URL 取 host(域)', detectIndicator('https://www.example.com/path?q=1'), {
  type: 'url',
  value: 'https://www.example.com/path?q=1',
});
eq('URL 取 host(IP)+去端口', detectIndicator('http://10.0.0.1:8080/x'), { type: 'url', value: 'http://10.0.0.1:8080/x' });
eq('非法(纯文本)', detectIndicator('hello world'), null);
eq('空串', detectIndicator(''), null);
eq('大小写归一', detectIndicator('EXAMPLE.COM'), { type: 'domain', value: 'example.com' });

eq('detectAll 去重计数', detectAll('see 8.8.8.8 and bad.com and 8.8.8.8').length, 2);

// IPv6
eq('ipv6 纯地址', detectIndicator('2001:db8::1'), { type: 'ip', value: '2001:db8::1' });
eq('ipv6 回环', detectIndicator('::1'), { type: 'ip', value: '::1' });
eq('ipv6 链路本地', detectIndicator('fe80::1'), { type: 'ip', value: 'fe80::1' });
eq('ipv6 URL 取 host', detectIndicator('http://[2001:db8::1]:8080/path'), { type: 'ip', value: '2001:db8::1' });
eq('ipv6 子串提取', detectIndicator('源地址 2001:db8::ff00:42:8329 已记录'), { type: 'ip', value: '2001:db8::ff00:42:8329' });
eq('非ipv6(host:port域)', detectIndicator('example.com:8080'), { type: 'domain', value: 'example.com' });
eq('ipv6 不误判域名', isIPv6('example.com'), false);

// URL 识别
eq('URL 完整识别', detectIndicator('http://malware.example.com/payload.exe'), { type: 'url', value: 'http://malware.example.com/payload.exe' });
eq('detectAll URL 仅 hostname 小写', (detectAll('see https://Example.COM/Path/Case.EXT?q=A')[0] || {}).value, 'https://example.com/Path/Case.EXT?q=A');
eq('URL https', detectIndicator('https://phishing.site/login.php'), { type: 'url', value: 'https://phishing.site/login.php' });
eq('URL 带端口', detectIndicator('http://c2.example.com:8080/beacon'), { type: 'url', value: 'http://c2.example.com:8080/beacon' });
eq('非URL(纯域名)', detectIndicator('example.com'), { type: 'domain', value: 'example.com' });

// detectAll 中的 URL 提取
const allUrl = detectAll('see http://malware.com/payload and 1.2.3.4 and example.org');
eq('detectAll 提取 URL', allUrl.some(d => d.type === 'url' && d.value.includes('malware.com')), true);
eq('detectAll URL 后域名去重', allUrl.filter(d => d.type === 'domain' && d.value === 'malware.com').length, 0);

// 跳转 URL 类型
const tbUrl = PLATFORMS.find(p => p.id === 'threatbook')!;
eq('微步 URL→域名跳转', tbUrl.buildUrl('url', 'http://malware.example.com/path'), 'https://x.threatbook.com/v5/domain/malware.example.com');
eq('微步 URL→null(无效URL)', tbUrl.buildUrl('url', 'not-a-url'), null);

// 哈希识别
eq('MD5 识别', detectIndicator('44d88612fea8a8f36de82e1278abb02f'), { type: 'hash', value: '44d88612fea8a8f36de82e1278abb02f' });
eq('SHA1 识别', detectIndicator('da39a3ee5e6b4b0d3255bfef95601890afd80709'), { type: 'hash', value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' });
eq('SHA256 识别', detectIndicator('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'), { type: 'hash', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' });
eq('非哈希(太短)', detectIndicator('abc123'), null);
eq('非哈希(含非hex)', detectIndicator('44d88612fea8a8f36de82e1278abb02g'), null);
eq('VT 哈希跳转', PLATFORMS.find(p => p.id === 'virustotal')!.buildUrl('hash', '44d88612fea8a8f36de82e1278abb02f'), 'https://www.virustotal.com/gui/file/44d88612fea8a8f36de82e1278abb02f');
eq('detectAll 提取哈希', detectAll('hash is 44d88612fea8a8f36de82e1278abb02f and 1.2.3.4').some(d => d.type === 'hash'), true);

// ===== 加权评分 =====
function mkSettings(weights: Record<string, number>): Settings {
  const sources: Settings['sources'] = {};
  for (const [k, w] of Object.entries(weights)) sources[k] = { enabled: true, apiKey: 'x', weight: w };
  return { sources, triggers: { selection: true, contextMenu: true, popup: true }, cacheTtlMin: 10, theme: 'auto', notifyOnMalicious: true, allowlist: [] };
}
const r = (source: string, verdict: QueryResult['verdict'], score: number | null = null): QueryResult => ({
  source,
  sourceName: source,
  verdict,
  score,
  summary: '',
  tags: [],
  detailsUrl: '',
  queriedAt: 0,
});

eq('双恶意=100', aggregate([r('a', 'malicious'), r('b', 'malicious')], mkSettings({ a: 1, b: 1 })).score, 100);
eq('恶意+干净(clean不稀释)=100', aggregate([r('a', 'malicious'), r('b', 'clean')], mkSettings({ a: 1, b: 1 })).score, 100);
eq('恶意(w3)+干净=100', aggregate([r('a', 'malicious'), r('b', 'clean')], mkSettings({ a: 3, b: 1 })).score, 100);
eq('恶意+可疑=(100+50)/2=75', aggregate([r('a', 'malicious'), r('b', 'suspicious')], mkSettings({ a: 1, b: 1 })).score, 75);
eq('恶意(w3)+可疑(w1)=88', aggregate([r('a', 'malicious'), r('b', 'suspicious')], mkSettings({ a: 3, b: 1 })).score, 88);
eq('仅可疑=50', aggregate([r('a', 'suspicious')], mkSettings({ a: 1 })).score, 50);
eq('仅可疑→标签suspicious', aggregate([r('a', 'suspicious')], mkSettings({ a: 1 })).label, 'suspicious');
eq('全干净→0分', aggregate([r('a', 'clean'), r('b', 'clean')], mkSettings({ a: 1, b: 1 })).score, 0);
eq('全干净标签clean', aggregate([r('a', 'clean')], mkSettings({ a: 1 })).label, 'clean');
eq('仅unknown→null', aggregate([r('a', 'unknown')], mkSettings({ a: 1 })).score, null);
eq('error被忽略', aggregate([r('a', 'malicious'), { ...r('b', 'unknown'), error: 'x' }], mkSettings({ a: 1, b: 1 })).score, 100);
eq('contributors含clean', aggregate([r('a', 'malicious'), r('b', 'clean'), r('c', 'unknown')], mkSettings({ a: 1, b: 1, c: 1 })).contributors, 2);
eq('flagCount=1', aggregate([r('a', 'malicious'), r('b', 'clean')], mkSettings({ a: 1, b: 1 })).flagCount, 1);
eq('cleanCount=1', aggregate([r('a', 'malicious'), r('b', 'clean')], mkSettings({ a: 1, b: 1 })).cleanCount, 1);
eq('双恶意flagCount=2', aggregate([r('a', 'malicious'), r('b', 'malicious')], mkSettings({ a: 1, b: 1 })).flagCount, 2);

// ===== 跳转 URL =====
const tb = PLATFORMS.find(p => p.id === 'threatbook')!;
eq('微步 IP URL', tb.buildUrl('ip', '1.2.3.4'), 'https://x.threatbook.com/v5/ip/1.2.3.4');
eq('微步 域名 URL', tb.buildUrl('domain', 'x.com'), 'https://x.threatbook.com/v5/domain/x.com');
const ab = PLATFORMS.find(p => p.id === 'abuseipdb')!;
eq('AbuseIPDB 不支持域名→null', ab.buildUrl('domain', 'x.com'), null);
eq('AbuseIPDB IP URL', ab.buildUrl('ip', '1.1.1.1'), 'https://www.abuseipdb.com/check/1.1.1.1');
eq('IP 平台含微步', platformsFor('ip').some(p => p.id === 'threatbook'), true);
eq('域名平台不含 AbuseIPDB', platformsFor('domain').some(p => p.id === 'abuseipdb'), false);

// 回归：每个跳转链接必须携带指标值（防"点过去是裸首页"）
for (const p of PLATFORMS) {
  for (const sup of p.supports) {
    const v = sup === 'ip' ? '8.8.8.8' : 'example.com';
    const url = p.buildUrl(sup, v);
    eq(`跳转携带指标 ${p.id}/${sup}`, !!(url && url.includes(v)), true);
  }
}

console.log(`\n${fail === 0 ? '✅ 全部通过' : '❌ 有失败'}：pass=${pass} fail=${fail}`);
if (fail > 0) process.exit(1);
