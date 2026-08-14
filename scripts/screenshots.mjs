// 拍摄开源 README 截图：弹窗(亮/暗)、设置页、多源研判(恶意)、内容面板
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-shots');
const shotDir = path.join(root, '.tmp-screenshots');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(shotDir, { recursive: true });

const KEYS = {};
for (const [envName, id] of [['VT_KEY', 'virustotal'], ['OTX_KEY', 'otx'], ['SHODAN_KEY', 'shodan']]) {
  if (process.env[envName]) KEYS[id] = process.env[envName];
}

(async () => {
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
    await pop.goto(`chrome-extension://${id}/popup.html`);
    await pop.waitForSelector('.pp-in');
    if (Object.keys(KEYS).length) {
      await pop.evaluate(async keys => {
        const cur = (await chrome.storage.local.get('settings')).settings || { sources: {}, triggers: {}, cacheTtlMin: 10, theme: 'light' };
        for (const [sid, key] of Object.entries(keys)) {
          cur.sources[sid] = Object.assign({ enabled: true, apiKey: '', weight: 1 }, cur.sources[sid] || {}, { enabled: true, apiKey: key });
        }
        await chrome.storage.local.set({ settings: cur });
      }, KEYS);
      await sleep(300);
    }

    // ===== 1. 弹窗空态(亮色) =====
    await pop.screenshot({ path: path.join(shotDir, 'popup-empty-light.png') });
    console.log('✓ popup-empty-light.png');

    // ===== 2. 查询恶意 IP =====
    await pop.fill('.pp-in', '185.220.101.42');
    await pop.click('.pp-go');
    await pop.waitForSelector('.ti-smini', { timeout: 30000 });
    await sleep(1500);
    // 点击第一个源方块展开详情
    await pop.locator('.ti-smini').first().click();
    await sleep(400);
    await pop.screenshot({ path: path.join(shotDir, 'popup-malicious-light.png'), fullPage: true });
    console.log('✓ popup-malicious-light.png');

    // ===== 3. 弹窗暗色 =====
    await pop.click('button[title="切换亮/暗主题"]');
    await sleep(600);
    await pop.screenshot({ path: path.join(shotDir, 'popup-malicious-dark.png'), fullPage: true });
    console.log('✓ popup-malicious-dark.png');

    // ===== 4. 设置页 =====
    const opts = await ctx.newPage();
    await opts.goto(`chrome-extension://${id}/options.html`);
    await opts.waitForSelector('.wrap');
    await sleep(600);
    await opts.screenshot({ path: path.join(shotDir, 'options-light.png'), fullPage: false });
    console.log('✓ options-light.png');
    // 暗色
    await opts.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    await sleep(300);
    await opts.screenshot({ path: path.join(shotDir, 'options-dark.png'), fullPage: false });
    console.log('✓ options-dark.png');

    // ===== 5. 内容面板(网页内) =====
    const http = await import('node:http');
    const srv = http.createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html><body style="font:16px sans-serif;padding:40px;background:#f7f8fa"><h2>威胁情报助手 演示</h2><p>选中下方 IP 查询：<strong>185.220.101.42</strong> 或 <strong>8.8.8.8</strong></p><p>在实际使用中，你可以在任意网页上划词识别 IP/域名。</p></body></html>');
    });
    srv.listen(18899, '127.0.0.1');
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:18899/');
    await page.waitForLoadState('domcontentloaded');
    // 选中整个页面触发浮窗
    await page.evaluate(() => {
      const sel = window.getSelection();
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(document.body);
      sel.addRange(r);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await page.waitForSelector('.ti-fab', { timeout: 8000 }).catch(() => {});
    // 选中纯 IP
    await page.evaluate(() => {
      const sel = window.getSelection();
      sel.removeAllRanges();
      const text = document.body.innerText;
      const idx = text.indexOf('185.220.101.42');
      if (idx >= 0) {
        const range = document.createRange();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node, pos = 0;
        while (node = walker.nextNode()) {
          const len = node.textContent.length;
          if (pos + len > idx) {
            range.setStart(node, idx - pos);
            range.setEnd(node, idx - pos + '185.220.101.42'.length);
            break;
          }
          pos += len;
        }
        sel.addRange(range);
      }
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    const fab = await page.waitForSelector('.ti-fab', { timeout: 5000 }).catch(() => null);
    if (fab) {
      await page.locator('.ti-fab').first().click();
      await page.waitForSelector('.ti-smini', { timeout: 30000 });
      await sleep(1500);
      await page.locator('.ti-smini').first().click();
      await sleep(400);
      await page.screenshot({ path: path.join(shotDir, 'content-panel.png'), fullPage: false });
      console.log('✓ content-panel.png');
    } else {
      console.log('⚠ 内容面板浮窗未出现（跳过截图）');
    }
    srv.close();

    console.log('\n截图全部保存到:', shotDir);
    console.log('共', fs.readdirSync(shotDir).length, '张');
  } finally {
    await ctx.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
