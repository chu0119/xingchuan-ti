// 真实浏览器验证所有跳转链接：用 Playwright 打开每个 URL，检查页面是否真正加载成功
// curl 状态码不可靠（有些平台不管什么都返回200），必须用浏览器看实际页面
import { chromium } from 'playwright';
const IP = '108.160.129.105';
const DOM = 'example.com';
const HASH = '44d88612fea8a8f36de82e1278abb02f';

const URLS = [
  // 国内
  ['微步IP',       `https://x.threatbook.com/v5/ip/${IP}`],
  ['微步域名',     `https://x.threatbook.com/v5/domain/${DOM}`],
  ['奇安信IP',     `https://ti.qianxin.com/v2/ip/${IP}`],
  ['奇安信域名',   `https://ti.qianxin.com/v2/domain/${DOM}`],
  ['长亭IP',       `https://rivers.chaitin.cn/ip-intelligence?search=${IP}`],
  ['腾讯TIX IP',   `https://tix.qq.com/search/single?keyword=${IP}`],
  ['腾讯TIX域名',  `https://tix.qq.com/search/single?keyword=${DOM}`],
  ['360 IP',       `https://ti.360.net/ip/${IP}`],
  ['360 域名',     `https://ti.360.net/domain/${DOM}`],
  ['绿盟IP',       `https://ti.nsfocus.com/ip?query=${IP}`],
  ['绿盟域名',     `https://ti.nsfocus.com/domain?query=${DOM}`],
  ['安恒IP',       `https://ti.dbappsecurity.com.cn/ip/${IP}`],
  ['安恒域名',     `https://ti.dbappsecurity.com.cn/domain/${DOM}`],
  ['站长之家IP',   `https://ip.tool.chinaz.com/${IP}`],
  ['站长之家域名', `https://whois.chinaz.com/${DOM}`],
  ['IP138',        `https://m.ip138.com/iplookup.asp?ip=${IP}`],
  // 国外
  ['VT IP',        `https://www.virustotal.com/gui/ip-address/${IP}`],
  ['VT 域名',      `https://www.virustotal.com/gui/domain/${DOM}`],
  ['VT 哈希',      `https://www.virustotal.com/gui/file/${HASH}`],
  ['AbuseIPDB',    `https://www.abuseipdb.com/check/${IP}`],
  ['OTX IP',       `https://otx.alienvault.com/indicator/ip/${IP}`],
  ['OTX 域名',     `https://otx.alienvault.com/indicator/domain/${DOM}`],
  ['Shodan',       `https://www.shodan.io/host/${IP}`],
  ['Censys',       `https://search.censys.io/hosts/${IP}`],
  ['GreyNoise',    `https://viz.greynoise.io/ip/${IP}`],
  ['urlscan IP',   `https://urlscan.io/ip/${IP}`],
  ['urlscan域名',  `https://urlscan.io/domain/${DOM}`],
  ['SecurityTrails IP',   `https://securitytrails.com/list/ip/${IP}`],
  ['SecurityTrails域名',  `https://securitytrails.com/domain/${DOM}/dns`],
  ['ThreatFox',    `https://threatfox.abuse.ch/browse.php?search=${IP}`],
  ['MalwareBazaar',`https://bazaar.abuse.ch/browse.php?search=sha256:${HASH}`],
];

(async () => {
  const ctx = await chromium.launch({ headless: false });
  const page = await ctx.newPage();
  const results = [];

  for (const [name, url] of URLS) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const title = await page.title();
      const finalUrl = page.url();
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
      // 判断是否真正到达了查询页面（而非首页/登录页/错误页）
      const isQueryPage = finalUrl.includes(IP) || finalUrl.includes(DOM) || finalUrl.includes(HASH) ||
                          bodyText.includes(IP) || bodyText.includes('search') || bodyText.includes('result');
      const isLoginPage = finalUrl.includes('login') || finalUrl.includes('passport') || finalUrl.includes('verify-ua');
      const status = isLoginPage ? '⚠️ 需登录' : isQueryPage ? '✅ 查询页' : '❓ 需确认';
      results.push({ name, status, title: title.slice(0, 40), finalUrl: finalUrl.slice(0, 80) });
      console.log(`${status} ${name}: ${title.slice(0, 40)}`);
    } catch (e) {
      results.push({ name, status: '❌ 失败', title: e.message.slice(0, 40), finalUrl: '' });
      console.log(`❌ ${name}: ${e.message.slice(0, 60)}`);
    }
  }

  console.log('\n===== 汇总 =====');
  const ok = results.filter(r => r.status.includes('✅')).length;
  const login = results.filter(r => r.status.includes('⚠️')).length;
  const fail = results.filter(r => r.status.includes('❌')).length;
  console.log(`✅ 查询页: ${ok}  ⚠️ 需登录: ${login}  ❌ 失败: ${fail}`);

  await ctx.close();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
