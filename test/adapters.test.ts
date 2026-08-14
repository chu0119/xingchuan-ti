// 适配器解析单测：模拟各源 API 返回样本，验证归一化(verdict/score/tags)逻辑。
// 末尾含一次 OTX 真实联网查询（免 Key），验证活跃链路。用 esbuild 打包后 node 运行。

import { virustotal } from '../src/adapters/virustotal';
import { abuseipdb } from '../src/adapters/abuseipdb';
import { otx } from '../src/adapters/otx';
import { shodan } from '../src/adapters/shodan';
import { greynoise } from '../src/adapters/greynoise';
import { threatbook } from '../src/adapters/threatbook';

const nativeFetch = (globalThis as any).fetch;
let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else {
    fail++;
    console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
  }
}
let r: Awaited<ReturnType<typeof virustotal.query>>;
function mockJson(json: any, status = 200) {
  (globalThis as any).fetch = async () => ({ ok: status < 400, status, text: async () => JSON.stringify(json) });
}
function mockStatus(status: number, body = '') {
  (globalThis as any).fetch = async () => ({ ok: status < 400, status, text: async () => body });
}

// VirusTotal
mockJson({ data: { attributes: { last_analysis_stats: { malicious: 5, suspicious: 1, harmless: 80, undetected: 3 }, tags: ['botnet', 'worm'] } } });
r = await virustotal.query('ip', '1.2.3.4', 'k');
eq('VT malicious', r.verdict, 'malicious');
eq('VT tags 含 botnet', r.tags.includes('botnet'), true);
mockJson({ data: { attributes: { last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 80, undetected: 3 } } } });
r = await virustotal.query('ip', '1.2.3.4', 'k');
eq('VT clean', r.verdict, 'clean');

// AbuseIPDB
mockJson({ data: { abuseConfidenceScore: 90, totalReports: 100, usageType: 'Datacenter', isp: 'X', countryName: 'US' } });
r = await abuseipdb.query('ip', '1.2.3.4', 'k');
eq('AbuseIPDB malicious', r.verdict, 'malicious');
eq('AbuseIPDB score 90', r.score, 90);
mockJson({ data: { abuseConfidenceScore: 0, totalReports: 0 } });
r = await abuseipdb.query('ip', '1.2.3.4', 'k');
eq('AbuseIPDB clean', r.verdict, 'clean');

// OTX（pulses 数组 + related 对象）
mockJson({ pulse_info: { count: 20, pulses: [{ name: 'Emotet' }], related: { alienvault: { malware_families: ['Foo'] } } } });
r = await otx.query('ip', '1.2.3.4', '');
eq('OTX malicious(20)', r.verdict, 'malicious');
eq('OTX tag Emotet', r.tags.includes('Emotet'), true);
mockJson({ pulse_info: { count: 0, pulses: [], related: {} } });
r = await otx.query('ip', '1.2.3.4', '');
eq('OTX clean(0)', r.verdict, 'clean');

// Shodan
mockJson({ ports: [22, 80], vulns: ['CVE-2021-44228'], org: 'Acme', country_name: 'US' });
r = await shodan.query('ip', '1.2.3.4', 'k');
eq('Shodan suspicious(有漏洞)', r.verdict, 'suspicious');
mockStatus(404);
r = await shodan.query('ip', '1.2.3.4', 'k');
eq('Shodan 404 unknown', r.verdict, 'unknown');

// GreyNoise
mockJson({ classification: 'malicious', name: 'SSH Scanner', tags: ['ssh'], noise: true });
r = await greynoise.query('ip', '1.2.3.4', 'k');
eq('GreyNoise malicious', r.verdict, 'malicious');
mockJson({ classification: 'benign' });
r = await greynoise.query('ip', '1.2.3.4', 'k');
eq('GreyNoise benign clean', r.verdict, 'clean');

// 微步 ThreatBook
mockJson({ threat_infos: { judgements: ['malicious'], confidence: 90, tags_classes: ['botnet'] } });
r = await threatbook.query('ip', '1.2.3.4', 'k');
eq('微步 malicious', r.verdict, 'malicious');
eq('微步 tag botnet', r.tags.includes('botnet'), true);

// 错误传递：VT 401 应抛错
mockStatus(401, '{"message":"Invalid API key"}');
try {
  await virustotal.query('ip', '1.2.3.4', 'bad');
  eq('VT 401 应抛错', false, true);
} catch {
  eq('VT 401 抛错', true, true);
}

// ===== 真实联网：OTX（免 Key）=====
(globalThis as any).fetch = nativeFetch;
let liveOk = false;
try {
  const lr = await otx.query('ip', '8.8.8.8', '');
  liveOk = true;
  eq('OTX 真实查询返回判定', typeof lr.verdict === 'string', true);
  console.log('   OTX live(8.8.8.8):', lr.verdict, '-', lr.summary);
} catch (e: any) {
  console.log('   OTX 真实查询失败（可能无网络）:', e?.message);
}

console.log(`\n${fail === 0 ? '✅ 全部通过' : '❌ 有失败'}：pass=${pass} fail=${fail}${liveOk ? '（含1次 OTX 真实联网）' : ''}`);
if (fail > 0) process.exit(1);
