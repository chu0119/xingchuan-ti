// 真实扩展全方位 E2E：
// 1) 配置真实 Key（来自环境变量）→ popup 实查 → 多源结果校验
// 2) 内容面板：普通文本选区 + 输入框内选区 → 浮窗出现（验证选区 bug 修复）+ 图标加载（WAR）
// 运行：node test/e2e.mjs （先 npm run build；可选 VT_KEY/OTX_KEY/SHODAN_KEY 环境变量）
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-e2e');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const KEYS = {};
for (const [envName, id] of [['VT_KEY', 'virustotal'], ['ABUSEIPDB_KEY', 'abuseipdb'], ['OTX_KEY', 'otx'], ['SHODAN_KEY', 'shodan'], ['GREYNOISE_KEY', 'greynoise'], ['THREATBOOK_KEY', 'threatbook']]) {
  if (process.env[envName]) KEYS[id] = process.env[envName];
}

if (!fs.existsSync(ext)) {
  console.error('请先 npm run build');
  process.exit(1);
}
fs.rmSync(profile, { recursive: true, force: true });

(async () => {
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(profile, {
      headless: false,
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    });
  } catch (e) {
    console.error('⚠️ 无法有头启动浏览器（可能无桌面 GUI）：', e.message);
    process.exit(2);
  }

  let failed = 0;
  try {
    let sw = ctx.serviceWorkers()[0];
    for (let i = 0; i < 60 && !sw; i++) {
      await sleep(200);
      sw = ctx.serviceWorkers()[0];
    }
    if (!sw) throw new Error('service worker 未启动');
    const id = sw.url().match(/chrome-extension:\/\/([^/]+)/)[1];
    console.log('扩展 ID:', id);
    console.log('已配置 Key 源:', Object.keys(KEYS).join(', ') || '(无，仅 OTX 免Key)');

    // 配置真实 Key（写入扩展 storage）
    const pop = await ctx.newPage();
    await pop.goto(`chrome-extension://${id}/popup.html`);
    await pop.waitForSelector('.pp-in');
    if (Object.keys(KEYS).length) {
      await pop.evaluate(async keys => {
        const cur = (await chrome.storage.local.get('settings')).settings || { sources: {}, triggers: {}, cacheTtlMin: 10, theme: 'light' };
        cur.sources = cur.sources || {};
        for (const [sid, key] of Object.entries(keys)) {
          cur.sources[sid] = Object.assign({ enabled: true, apiKey: '', weight: 1 }, cur.sources[sid] || {}, { enabled: true, apiKey: key });
        }
        await chrome.storage.local.set({ settings: cur });
      }, KEYS);
      await sleep(300);
    }

    // ===== 1. popup 实查 8.8.8.8 → 多源结果 =====
    await pop.fill('.pp-in', '8.8.8.8');
    await pop.click('.pp-go');
    await pop.waitForSelector('.ti-smini', { timeout: 30000 });
    await sleep(1200);
    const blocks = await pop.locator('.ti-smini').count();
    const errBlocks = await pop.locator('.ti-smini[data-v="error"]').count();
    const popImgs = await pop.locator('.ti-jico img').count();
    const popTiles = await pop.locator('.ti-jico').count();
    console.log(`[popup] 源方块 ${blocks}（出错 ${errBlocks}）；跳转图标 ${popImgs}/${popTiles}`);
    await pop.screenshot({ path: path.join(root, '.output/e2e-popup.png') });
    const expectedMin = Math.max(1, Object.keys(KEYS).length + (KEYS.otx ? 0 : 1)); // OTX 免Key总会跑
    if (blocks < expectedMin) {
      console.error(`❌ popup 源方块过少：${blocks} < ${expectedMin}`);
      failed++;
    }
    if (popImgs < popTiles - 1) {
      console.error('❌ popup 图标盾牌回退');
      failed++;
    }

    // 评分修复验证：恶意 IP 综合判定应为 malicious（不应被 clean 稀释成可疑）
    const malRaw = await pop.evaluate(() =>
      chrome.runtime.sendMessage({ kind: 'query', type: 'ip', value: '185.220.101.42', nocache: true }),
    );
    console.log(`[popup·恶意IP] 综合判定=${malRaw?.aggregate?.label} 分数=${malRaw?.aggregate?.score}`);
    await sleep(300);
    if (malRaw?.aggregate?.label !== 'malicious') {
      console.error('❌ 恶意IP综合判定非 malicious: ' + malRaw?.aggregate?.label);
      failed++;
    }

    // ===== 2. 内容面板：普通文本选区 =====
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:8765/test/e2e-page.html');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      const sel = window.getSelection();
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(document.body);
      sel.addRange(r);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    const fabText = await page.waitForSelector('.ti-fab', { timeout: 8000 }).catch(() => null);
    console.log('[内容面板·普通选区] 浮窗出现:', !!fabText);
    if (!fabText) failed++;
    if (fabText) {
      await page.locator('.ti-fab').first().click();
      await page.waitForSelector('.ti-jico', { timeout: 30000 });
      await sleep(900);
      const cpTiles = await page.locator('.ti-jico').count();
      const cpImgs = await page.locator('.ti-jico img').count();
      console.log(`[内容面板·普通选区] 跳转图标 ${cpImgs}/${cpTiles}`);
      await page.screenshot({ path: path.join(root, '.output/e2e-content.png') });
      if (cpImgs < cpTiles - 1) failed++;
      // 关闭面板
      await page.keyboard.press('Escape').catch(() => {});
    }

    // ===== 3. 内容面板：输入框内选区（核心 bug 验证）=====
    await page.evaluate(() => {
      const inp = document.getElementById('ipinput');
      inp.focus();
      inp.setSelectionRange(0, inp.value.length);
      inp.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    const fabInput = await page.waitForSelector('.ti-fab', { timeout: 8000 }).catch(() => null);
    console.log('[内容面板·输入框选区] 浮窗出现:', !!fabInput, '(核心修复)');
    if (!fabInput) failed++;

    console.log(failed === 0 ? '\n✅ E2E 全通过：多源查询 + 普通选区 + 输入框选区 + 图标均正常' : '\n❌ E2E 存在失败');
    if (failed) process.exit(1);
  } finally {
    await ctx.close();
  }
})().catch(e => {
  console.error('❌ E2E 异常：', e.message);
  process.exit(1);
});
