// 校验弹窗初始状态：输入框数量应为 1（避免"两个输入框"困惑）。
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-check');
fs.rmSync(profile, { recursive: true, force: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  try {
    let sw = ctx.serviceWorkers()[0];
    for (let i = 0; i < 60 && !sw; i++) {
      await sleep(200);
      sw = ctx.serviceWorkers()[0];
    }
    const id = sw.url().match(/chrome-extension:\/\/([^/]+)/)[1];
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${id}/popup.html`);
    await page.waitForSelector('.pp-in');
    await sleep(400);
    const inputCount = await page.locator('input').count();
    const inputs = await page.locator('input').evaluateAll(els => els.map(e => ({ cls: e.className, ph: e.placeholder, type: e.type, html: e.outerHTML.slice(0, 100) })));
    console.log('输入框明细:', JSON.stringify(inputs, null, 2));
    await page.screenshot({ path: path.join(root, '.output/popup-initial.png') });
    if (inputCount !== 1) {
      console.error('❌ 输入框数量不为 1');
      process.exit(1);
    }
    console.log('✅ 弹窗初始只有 1 个输入框');
  } finally {
    await ctx.close();
  }
})().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
