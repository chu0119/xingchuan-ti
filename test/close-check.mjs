// 验证内容面板只有一个关闭按钮（之前 makeFrame 常驻按钮 + ti-acts 按钮重叠导致两个 X）
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-close');
fs.rmSync(profile, { recursive: true, force: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const srv = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><html><body style="font:16px sans-serif;padding:40px"><p>选中这个 IP 查询：185.220.101.42</p></body></html>');
});
srv.listen(18899, '127.0.0.1');

(async () => {
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  try {
    let sw = ctx.serviceWorkers()[0];
    for (let i = 0; i < 60 && !sw; i++) { await sleep(200); sw = ctx.serviceWorkers()[0]; }
    const id = sw.url().match(/chrome-extension:\/\/([^/]+)/)[1];

    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:18899/');
    await page.waitForLoadState('domcontentloaded');

    // 选中 IP 触发浮窗
    await page.evaluate(() => {
      const sel = window.getSelection();
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(document.querySelector('p'));
      sel.addRange(r);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await page.waitForSelector('.ti-fab', { timeout: 8000 });
    await page.locator('.ti-fab').first().click();

    // 加载状态：面板内关闭按钮数量
    const loadingClose = await page.evaluate(() => {
      const host = document.querySelector('div[style*="z-index"]') || document.documentElement.lastElementChild;
      const sr = host?.shadowRoot;
      if (!sr) return -1;
      return sr.querySelectorAll('.ti-close-btn, .ti-acts button[title="关闭"]').length;
    });
    console.log('加载中 关闭按钮数量:', loadingClose);

    // 等结果渲染完成
    await page.waitForSelector('.ti-smini', { timeout: 30000 }).catch(() => {});
    await sleep(800);
    const resultClose = await page.evaluate(() => {
      const hosts = [...document.querySelectorAll('div')].filter(d => d.shadowRoot);
      for (const hh of hosts) {
        const sr = hh.shadowRoot;
        if (sr.querySelector('.ti-shell')) {
          return sr.querySelectorAll('.ti-close-btn, .ti-acts button[title="关闭"]').length;
        }
      }
      return -1;
    });
    console.log('结果态 关闭按钮数量:', resultClose);

    await page.screenshot({ path: path.join(root, '.output/close-check.png'), fullPage: false });

    const ok = loadingClose === 1 && resultClose === 1;
    console.log(ok ? '\n✅ 任何状态都只有 1 个关闭按钮' : '\n❌ 关闭按钮数量异常');
    process.exit(ok ? 0 : 1);
  } finally {
    await ctx.close();
    srv.close();
  }
})().catch(e => { console.error('❌', e.message); srv.close(); process.exit(1); });
