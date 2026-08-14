// 拍摄 Chrome Web Store 宣传截图（1280x800）
// 运行：node scripts/store-screenshot.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-store');
const shotDir = path.join(root, 'docs/store');
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
    await pop.setViewportSize({ width: 1280, height: 800 });
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

    // 查询恶意 IP
    await pop.fill('.pp-in', '185.220.101.42');
    await pop.click('.pp-go');
    await pop.waitForSelector('.ti-smini', { timeout: 30000 });
    await sleep(1500);
    await pop.locator('.ti-smini').first().click();
    await sleep(400);

    // 截图（Chrome Web Store 要求 1280x800 或 640x400）
    await pop.screenshot({
      path: path.join(shotDir, 'chrome-store-1280x800.png'),
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
    console.log('✓ chrome-store-1280x800.png');

    // 640x400 版本
    await pop.screenshot({
      path: path.join(shotDir, 'chrome-store-640x400.png'),
      clip: { x: 0, y: 0, width: 640, height: 400 },
    });
    console.log('✓ chrome-store-640x400.png');

    console.log('\n截图保存到:', shotDir);
  } finally {
    await ctx.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
