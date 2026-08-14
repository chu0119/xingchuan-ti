// 批量查询 E2E：在 popup textarea 里粘贴多行 IOC，验证批量模式生效
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-batch');
fs.rmSync(profile, { recursive: true, force: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    await page.goto(`chrome-extension://${id}/popup.html`);
    await page.waitForSelector('.pp-in');

    // 输入多行 IOC
    await page.fill('.pp-in', '8.8.8.8\n1.1.1.1\nexample.com');
    await sleep(200);
    await page.click('.pp-go');

    // 等待批量结果
    await page.waitForSelector('.batch-row', { timeout: 60000 });
    await sleep(500);

    const rows = await page.locator('.batch-row').count();
    const summary = await page.locator('.batch-summary').textContent();
    console.log('批量查询结果:', rows, '行');
    console.log('摘要:', summary?.trim());
    await page.screenshot({ path: path.join(root, '.output/batch-test.png'), fullPage: true });

    if (rows < 3) {
      console.error('❌ 批量查询结果行数不足');
      process.exit(1);
    }
    console.log('✅ 批量查询 E2E 通过');
  } finally {
    await ctx.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
