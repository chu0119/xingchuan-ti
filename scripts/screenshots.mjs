// 拍摄规范的 README 截图：统一尺寸、位置，用于开源项目文档。
// 运行：node scripts/screenshots.mjs
import { Resvg } from '@resvg/resvg-js';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-shots');
const shotDir = path.join(root, 'docs/images');
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

    // ===== 1. 弹窗空态(亮色) - 统一 420px 宽 =====
    await pop.setViewportSize({ width: 420, height: 600 });
    await pop.screenshot({ path: path.join(shotDir, 'popup-empty-light.png'), clip: { x: 0, y: 0, width: 420, height: 200 } });
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

    // ===== 4. 设置页(亮色) - 固定宽度 =====
    const opts = await ctx.newPage();
    await opts.setViewportSize({ width: 860, height: 700 });
    await opts.goto(`chrome-extension://${id}/options.html`);
    await opts.waitForSelector('.wrap');
    await sleep(600);
    await opts.screenshot({ path: path.join(shotDir, 'options-light.png'), clip: { x: 0, y: 0, width: 860, height: 500 } });
    console.log('✓ options-light.png');

    // ===== 5. 设置页(暗色) =====
    await opts.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await sleep(300);
    await opts.screenshot({ path: path.join(shotDir, 'options-dark.png'), clip: { x: 0, y: 0, width: 860, height: 500 } });
    console.log('✓ options-dark.png');

    console.log('\n截图保存到:', shotDir);
    console.log('共', fs.readdirSync(shotDir).filter(f => f.endsWith('.png')).length, '张');
  } finally {
    await ctx.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
