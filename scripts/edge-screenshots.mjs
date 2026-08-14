// 拍摄 Edge Add-ons 商店截图（1280×800），6 张覆盖所有核心功能
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-edge');
const outDir = path.join(root, 'docs/edge-store');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const KEYS = {};
for (const [envName, id] of [['VT_KEY', 'virustotal'], ['OTX_KEY', 'otx'], ['SHODAN_KEY', 'shodan']]) {
  if (process.env[envName]) KEYS[id] = process.env[envName];
}

// 本地测试页（模拟网页选中 IP 的场景）
const testHtml = `<!doctype html><html><head><meta charset="utf-8"><title>SIEM Alert Dashboard</title>
<style>body{font:14px/1.8 -apple-system,sans-serif;margin:0;padding:0;background:#f5f5f5;}
.header{background:#1a73e8;color:#fff;padding:12px 24px;font-size:16px;font-weight:700;}
.container{max-width:900px;margin:20px auto;padding:0 20px;}
.card{background:#fff;border-radius:10px;padding:18px 22px;margin:12px 0;box-shadow:0 1px 4px rgba(0,0,0,.08);}
.card h3{margin:0 0 8px;font-size:15px;color:#1a73e8;}
.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#fff;}
.badge.critical{background:#e53935;} .badge.high{background:#fb8c00;} .badge.medium{background:#43a047;}
code{font-family:ui-monospace,Menlo,Consolas;background:#f0f2f5;padding:2px 6px;border-radius:4px;font-size:13px;}
.meta{color:#666;font-size:12px;margin-top:4px;}</style></head>
<body><div class="header">🛡️ SIEM Alert Dashboard — Security Operations Center</div>
<div class="container">
<div class="card"><h3><span class="badge critical">CRITICAL</span> Suspicious Outbound Connection Detected</h3>
<p>Source: <code>192.168.1.105</code> → Destination: <code>185.220.101.42</code> (TOR Exit Node)</p>
<p>Protocol: TCP/443 | Payload size: 2.4MB | Duration: 47min</p>
<p class="meta">Alert ID: SIEM-2026-08841 | Time: 2026-08-14 09:23:17 UTC | Sensor: corp-fw-01</p></div>
<div class="card"><h3><span class="badge high">HIGH</span> DNS Query to Known Malicious Domain</h3>
<p>Query: <code>malware-c2.evil.com</code> from <code>10.0.0.55</code></p>
<p>Response: 185.220.101.42 | TTL: 60s | Query type: A</p>
<p class="meta">Alert ID: SIEM-2026-08842 | Time: 2026-08-14 09:24:03 UTC | Sensor: dns-mon-01</p></div>
<div class="card"><h3><span class="badge medium">MEDIUM</span> Failed Login Attempts</h3>
<p>Target: <code>ssh://10.0.0.1:22</code> | Attempts: 847 from <code>8.8.8.8</code></p>
<p>Time window: 2026-08-14 08:00-09:00 UTC | Usernames tried: root, admin, ubuntu</p>
<p class="meta">Alert ID: SIEM-2026-08843 | Time: 2026-08-14 09:25:11 UTC | Sensor: ids-01</p></div>
</div></body></html>`;

(async () => {
  const srv = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(testHtml);
  });
  srv.listen(18877, '127.0.0.1');

  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  try {
    let sw = ctx.serviceWorkers()[0];
    for (let i = 0; i < 60 && !sw; i++) { await sleep(200); sw = ctx.serviceWorkers()[0]; }
    const id = sw.url().match(/chrome-extension:\/\/([^/]+)/)[1];
    console.log('扩展 ID:', id);

    // 配置 Key
    const pop = await ctx.newPage();
    await pop.setViewportSize({ width: 420, height: 800 });
    await pop.goto(`chrome-extension://${id}/popup.html`);
    await pop.waitForSelector('.pp-in');
    if (Object.keys(KEYS).length) {
      await pop.evaluate(async keys => {
        const cur = (await chrome.storage.local.get('settings')).settings || { sources: {}, triggers: {}, cacheTtlMin: 10, theme: 'light', notifyOnMalicious: true };
        for (const [sid, key] of Object.entries(keys)) {
          cur.sources[sid] = Object.assign({ enabled: true, apiKey: '', weight: 1 }, cur.sources[sid] || {}, { enabled: true, apiKey: key });
        }
        await chrome.storage.local.set({ settings: cur });
      }, KEYS);
      await sleep(300);
    }

    // ===== 截图 1：弹窗空态（亮色）=====
    const pop2 = await ctx.newPage();
    await pop2.setViewportSize({ width: 1280, height: 800 });
    await pop2.goto(`chrome-extension://${id}/popup.html`);
    await pop2.waitForSelector('.pp-in');
    await sleep(500);
    await pop2.screenshot({ path: path.join(outDir, '01-popup-empty-light.png') });
    console.log('✓ 01-popup-empty-light.png');

    // ===== 截图 2：弹窗恶意 IP 查询结果（亮色）=====
    await pop2.fill('.pp-in', '185.220.101.42');
    await pop2.click('.pp-go');
    await pop2.waitForSelector('.ti-srow', { timeout: 30000 });
    await sleep(1500);
    await pop2.locator('.ti-srow').first().click();
    await sleep(400);
    await pop2.screenshot({ path: path.join(outDir, '02-popup-malicious-light.png') });
    console.log('✓ 02-popup-malicious-light.png');

    // ===== 截图 3：弹窗恶意 IP 查询结果（暗色）=====
    await pop2.click('button[title="切换亮/暗主题"]');
    await sleep(600);
    await pop2.screenshot({ path: path.join(outDir, '03-popup-malicious-dark.png') });
    console.log('✓ 03-popup-malicious-dark.png');

    // ===== 截图 4：内容面板（网页内划词浮窗）=====
    const web = await ctx.newPage();
    await web.setViewportSize({ width: 1280, height: 800 });
    await web.goto('http://127.0.0.1:18877/');
    await web.waitForLoadState('domcontentloaded');
    await sleep(500);
    // 选中第一个 IP
    await web.evaluate(() => {
      const sel = window.getSelection();
      sel.removeAllRanges();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const idx = node.textContent.indexOf('185.220.101.42');
        if (idx >= 0) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + '185.220.101.42'.length);
          sel.addRange(range);
          break;
        }
      }
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await web.waitForSelector('.ti-fab', { timeout: 8000 });
    await sleep(300);
    await web.locator('.ti-fab').first().click();
    await web.waitForSelector('.ti-srow', { timeout: 30000 });
    await sleep(1500);
    await web.locator('.ti-srow').first().click();
    await sleep(400);
    await web.screenshot({ path: path.join(outDir, '04-content-panel-web.png') });
    console.log('✓ 04-content-panel-web.png');

    // ===== 截图 5：设置页（亮色）=====
    const opts = await ctx.newPage();
    await opts.setViewportSize({ width: 1280, height: 800 });
    await opts.goto(`chrome-extension://${id}/options.html`);
    await opts.waitForSelector('.wrap');
    await sleep(600);
    await opts.screenshot({ path: path.join(outDir, '05-settings-light.png') });
    console.log('✓ 05-settings-light.png');

    // ===== 截图 6：设置页（暗色）=====
    await opts.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await sleep(300);
    await opts.screenshot({ path: path.join(outDir, '06-settings-dark.png') });
    console.log('✓ 06-settings-dark.png');

    console.log(`\n截图保存到: ${outDir}`);
    console.log('共', fs.readdirSync(outDir).filter(f => f.endsWith('.png')).length, '张');
  } finally {
    await ctx.close();
    srv.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
