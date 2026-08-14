// 配置导入/导出 往返 E2E（真实扩展）：
// 配 Key → 导出(含Key) → 导出(不含Key) → 导入修改过的配置 → 验证生效。
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-cfg');
fs.rmSync(profile, { recursive: true, force: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  let failed = 0;
  try {
    let sw = ctx.serviceWorkers()[0];
    for (let i = 0; i < 60 && !sw; i++) {
      await sleep(200);
      sw = ctx.serviceWorkers()[0];
    }
    const id = sw.url().match(/chrome-extension:\/\/([^/]+)/)[1];
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${id}/options.html`);
    await page.waitForSelector('#cfg-export');

    // 配置一个测试 Key
    await page.evaluate(async () => {
      const s = (await chrome.storage.local.get('settings')).settings || { sources: {}, triggers: {}, cacheTtlMin: 10, theme: 'light' };
      s.sources = s.sources || {};
      s.sources.virustotal = { enabled: true, apiKey: 'TESTKEY123', weight: 1.5 };
      await chrome.storage.local.set({ settings: s });
    });
    await sleep(200);

    // 导出（含 Key）
    let d = await Promise.all([page.waitForEvent('download'), page.click('#cfg-export')]);
    const f1 = path.join(root, '.output/cfg1.json');
    await d[0].saveAs(f1);
    const j1 = JSON.parse(fs.readFileSync(f1, 'utf8'));
    console.log('导出(含Key)  type=%s  vt.apiKey=%s', j1?.type, j1?.settings?.sources?.virustotal?.apiKey);
    if (j1?.type !== 'threat-intel-helper-config' || j1?.settings?.sources?.virustotal?.apiKey !== 'TESTKEY123') {
      console.error('❌ 导出(含Key) 失败');
      failed++;
    }

    // 导出（不含 Key）
    await page.uncheck('#cfg-keys');
    d = await Promise.all([page.waitForEvent('download'), page.click('#cfg-export')]);
    const f2 = path.join(root, '.output/cfg2.json');
    await d[0].saveAs(f2);
    const j2 = JSON.parse(fs.readFileSync(f2, 'utf8'));
    console.log('导出(不含Key) vt.apiKey=%s', JSON.stringify(j2?.settings?.sources?.virustotal?.apiKey));
    if (j2?.settings?.sources?.virustotal?.apiKey !== '') {
      console.error('❌ 导出(不含Key) 应为空');
      failed++;
    }

    // 导入：把 virustotal.enabled 改成 false
    const importCfg = JSON.parse(JSON.stringify(j1));
    importCfg.settings.sources.virustotal.enabled = false;
    const tmpf = path.join(root, '.output/import.json');
    fs.writeFileSync(tmpf, JSON.stringify(importCfg));
    await page.locator('#cfg-file').setInputFiles(tmpf);
    await sleep(1200); // 等保存+刷新
    await page.goto(`chrome-extension://${id}/options.html`);
    await page.waitForSelector('#en-virustotal');
    const stored = await page.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
    console.log('导入后 storage vt =', JSON.stringify(stored?.sources?.virustotal));
    const en = await page.locator('#en-virustotal').isChecked();
    console.log('导入后 vt.enabled(表单) =', en);
    if (en !== false) {
      console.error('❌ 导入未生效');
      failed++;
    }

    // 导入非法文件应提示失败（不崩溃）
    fs.writeFileSync(tmpf, '{"type":"not-ours","settings":{}}');
    await page.locator('#cfg-file').setInputFiles(tmpf);
    await sleep(500);
    const cfgText = (await page.locator('#cfg-status').textContent()) || '';
    console.log('非法导入提示:', cfgText.trim().slice(0, 40));
    if (!/失败|格式/.test(cfgText)) {
      console.error('❌ 非法导入未给出失败提示');
      failed++;
    }

    console.log(failed ? '\n❌ 配置导入导出有失败' : '\n✅ 配置导入/导出 全通过');
    if (failed) process.exit(1);
  } finally {
    await ctx.close();
  }
})().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
