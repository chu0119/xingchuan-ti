// 真实 Key 联网测试：从环境变量读各源 Key（绝不硬编码），对真实 IP 实查，验证解析与活跃链路。
// 运行示例：VT_KEY=xxx OTX_KEY=xxx SHODAN_KEY=xxx npm run test:live
// 未提供 Key 的源自动跳过。
import { virustotal } from '../src/adapters/virustotal';
import { abuseipdb } from '../src/adapters/abuseipdb';
import { otx } from '../src/adapters/otx';
import { shodan } from '../src/adapters/shodan';
import { greynoise } from '../src/adapters/greynoise';
import { threatbook } from '../src/adapters/threatbook';

const env = process.env;
const IP = env.LIVE_IP || '8.8.8.8';
let pass = 0;
let fail = 0;

async function tryLive(name: string, fn: () => Promise<any>) {
  try {
    const r = await fn();
    pass++;
    console.log(`  ✓ ${name}: verdict=${r.verdict} score=${r.score ?? '-'} | ${r.summary || r.error || ''}`);
  } catch (e: any) {
    const m = String(e?.message || e);
    // 限流/会员等级等“受限”情况不算解析失败
    if (/membership|429|rate limit|too many/i.test(m)) {
      console.log(`  ⚠ ${name}: 受限（非解析问题）— ${m}`);
    } else {
      fail++;
      console.log(`  ✗ ${name}: ${m}`);
    }
  }
}

(async () => {
  console.log(`真实联网测试，目标 IP=${IP}`);
  if (env.VT_KEY) await tryLive('VirusTotal', () => virustotal.query('ip', IP, env.VT_KEY!));
  if (env.ABUSEIPDB_KEY) await tryLive('AbuseIPDB', () => abuseipdb.query('ip', IP, env.ABUSEIPDB_KEY!));
  if (env.OTX_KEY) await tryLive('OTX', () => otx.query('ip', IP, env.OTX_KEY!));
  if (env.SHODAN_KEY) await tryLive('Shodan', () => shodan.query('ip', IP, env.SHODAN_KEY!));
  if (env.GREYNOISE_KEY) await tryLive('GreyNoise', () => greynoise.query('ip', IP, env.GREYNOISE_KEY!));
  if (env.THREATBOOK_KEY) await tryLive('微步', () => threatbook.query('ip', IP, env.THREATBOOK_KEY!));
  console.log(`\n${fail ? '❌ 有失败' : '✅ 全部通过'}：pass=${pass} fail=${fail}`);
  if (fail > 0) process.exit(1);
})();
