// 构建期抓取各平台真实 favicon，打包进 public/icons/platforms/，运行时不再依赖网络。
// 优先 PNG 源；仅拿到 ICO 时存 .ico；全部失败则不生成文件（代码回退到品牌色盾牌图标，非字母）。
// 运行：node scripts/fetch-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public/icons/platforms');
fs.mkdirSync(outDir, { recursive: true });

// id → 取图标的域名（与 src/lib/platforms.ts 一致）
const TARGETS = [
  ['threatbook', 'x.threatbook.com'],
  ['qianxin', 'ti.qianxin.com'],
  ['chaitin', 'rivers.chaitin.cn'],
  ['tencent', 'tix.qq.com'],
  ['360', 'ti.360.net'],
  ['nsfocus', 'ti.nsfocus.com'],
  ['dbapp', 'ti.dbappsecurity.com.cn'],
  ['chinaz', 'ip.tool.chinaz.com'],
  ['ip138', 'm.ip138.com'],
  ['virustotal', 'www.virustotal.com'],
  ['abuseipdb', 'www.abuseipdb.com'],
  ['otx', 'otx.alienvault.com'],
  ['shodan', 'www.shodan.io'],
  ['censys', 'search.censys.io'],
  ['greynoise', 'viz.greynoise.io'],
  ['urlscan', 'urlscan.io'],
  ['securitytrails', 'securitytrails.com'],
  ['threatfox', 'threatfox.abuse.ch'],
  ['malwarebazaar', 'bazaar.abuse.ch'],
];

const isPng = b => b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isIco = b => b.length > 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00;

async function tryFetch(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const report = [];
for (const [id, domain] of TARGETS) {
  const urls = [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?sz=64&domain_url=https://${domain}`,
    `https://icon.horse/icon/${domain}`,
    `https://${domain}/favicon.ico`,
  ];
  let png = null;
  let ico = null;
  for (const u of urls) {
    const buf = await tryFetch(u);
    if (!buf) continue;
    if (isPng(buf)) {
      png = buf;
      break;
    }
    if (isIco(buf) && !ico) ico = buf;
  }
  if (png) {
    fs.writeFileSync(path.join(outDir, `${id}.png`), png);
    report.push(`${id}: ✓ png`);
  } else if (ico) {
    fs.writeFileSync(path.join(outDir, `${id}.ico`), ico);
    report.push(`${id}: ~ ico`);
  } else {
    report.push(`${id}: ✗ 无（将用品牌色盾牌图标）`);
  }
}
console.log(report.join('\n'));
const ok = report.filter(r => r.includes('✓') || r.includes('~')).length;
console.log(`\n完成：${ok}/${TARGETS.length} 获取到图标`);
