// 测试长链接溢出：用超长 URL、超长域名、长错误消息验证面板布局
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-longurl');
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
    const pop = await ctx.newPage();
    await pop.goto(`chrome-extension://${id}/popup.html`);
    await pop.waitForSelector('.pp-in');

    // 测试1：长 URL
    await pop.fill('.pp-in', 'https://www.example.com/very/long/path/that/goes/on/and/on/and/on/with/many/segments?param1=value1&param2=value2&param3=value3&param4=value4&token=abc123def456ghi789jkl012mno345pqr678stu901vwx234');
    await pop.click('.pp-go');
    await sleep(3000);
    await pop.screenshot({ path: path.join(root, '.output/long-url.png'), fullPage: true });
    console.log('✓ long-url.png');

    // 测试2：长域名
    await pop.fill('.pp-in', 'this-is-a-very-long-subdomain-name-that-should-not-break-the-layout.example.co.uk');
    await pop.click('.pp-go');
    await sleep(3000);
    await pop.screenshot({ path: path.join(root, '.output/long-domain.png'), fullPage: true });
    console.log('✓ long-domain.png');

    // 测试3：多个长 URL 批量
    await pop.fill('.pp-in', [
      'https://www.example.com/very/long/path/number/one?token=abc123def456ghi789',
      'https://www.example.com/very/long/path/number/two?token=xyz789abc123def456',
      'https://www.example.com/very/long/path/number/three?token=qwe456rty789uio123',
    ].join('\n'));
    await pop.click('.pp-go');
    await sleep(5000);
    await pop.screenshot({ path: path.join(root, '.output/long-batch.png'), fullPage: true });
    console.log('✓ long-batch.png');

    // 测试4：溢出检测 - 检查是否有元素宽度超出容器
    const overflow = await pop.evaluate(() => {
      const shell = document.querySelector('.ti-shell');
      if (!shell) return { found: false };
      const shellW = shell.getBoundingClientRect().width;
      const issues = [];
      shell.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > shellW + 2 && el.className && !el.className.includes('ti-head')) {
          issues.push({ cls: el.className.slice(0, 30), w: Math.round(r.width), shellW: Math.round(shellW) });
        }
      });
      return { shellW: Math.round(shellW), overflowCount: issues.length, issues: issues.slice(0, 5) };
    });
    console.log('溢出检测:', JSON.stringify(overflow, null, 2));

    console.log('\n✅ 长链接测试完成');
  } finally {
    await ctx.close();
  }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
