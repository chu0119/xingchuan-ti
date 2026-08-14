// 星川威胁情报助手 · 真实浏览器全功能实测（full-audit）
// 覆盖：A popup / B 内容面板 / C 设置页 / D 右键菜单 / E 一致性
// 运行前：npm run build（产物 .output/chrome-mv3）
// 运行：VT_KEY=... OTX_KEY=... SHODAN_KEY=... node test/full-audit.mjs
// 每次运行使用全新 profile，避免旧扩展缓存。只读测试，不修改源码。

import { chromium } from 'playwright';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ext = path.join(root, '.output/chrome-mv3');
const profile = path.join(root, '.output/profile-audit');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const KEYS = {};
for (const [envName, id] of [['VT_KEY', 'virustotal'], ['OTX_KEY', 'otx'], ['SHODAN_KEY', 'shodan']]) {
  if (process.env[envName]) KEYS[id] = process.env[envName];
}

if (!fs.existsSync(ext)) {
  console.error('请先 npm run build（缺少 .output/chrome-mv3）');
  process.exit(1);
}
fs.rmSync(profile, { recursive: true, force: true });

// ===== 结果收集 =====
const results = [];
const activePages = []; // 失败时 dump 用
async function t(id, desc, fn) {
  try {
    await fn();
    results.push({ id, desc, ok: true, err: '' });
    console.log(`✅ ${id} ${desc}`);
  } catch (e) {
    results.push({ id, desc, ok: false, err: e?.message || String(e) });
    console.log(`❌ ${id} ${desc}\n     ↳ ${e?.message || e}`);
    for (const p of activePages) await dump(p, id);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// 失败时 dump 当前页面 URL + 可见元素类名
async function dump(page, tag) {
  try {
    const url = page.url();
    const info = await page.evaluate(() => {
      const cls = new Set();
      for (const el of document.querySelectorAll('body *')) {
        if (typeof el.className === 'string' && el.className.trim()) cls.add(el.className.split(/\s+/)[0]);
        if (cls.size > 40) break;
      }
      return { theme: document.documentElement.dataset.theme, classes: Array.from(cls).slice(0, 40) };
    }).catch(() => ({ theme: '?', classes: [] }));
    console.log(`     [dump:${tag}] url=${url} theme=${info.theme}`);
    console.log(`     [dump:${tag}] 可见类名: ${info.classes.join(', ') || '(无)'}`);
  } catch { /* ignore */ }
}

// ===== 本地测试页 HTTP 服务 =====
const AUDIT_HTML = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>audit</title></head>
<body style="font:18px/1.8 sans-serif;padding:40px">
<h2>星川威胁情报助手 · 全功能实测页</h2>
<p id="mal">可疑主机 <strong>185.220.101.42</strong> 出现在出口日志中。</p>
<p id="pair">相关解析器 8.8.8.8 and 1.1.1.1 均被使用。</p>
<p>日志框：<input id="ipinput" value="8.8.8.8" size="40" /></p>
<p id="fresh">未缓存探针 93.184.216.34 在这里。</p>
</body></html>`;

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/audit')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(AUDIT_HTML);
  } else {
    res.writeHead(404); res.end('no');
  }
});
let PORT = 8799;
await new Promise((res) => { server.once('error', () => { PORT++; server.listen(PORT, '127.0.0.1', res); }); server.listen(PORT, '127.0.0.1', res); });
const PAGE_URL = `http://127.0.0.1:${PORT}/audit.html`;
console.log(`本地测试页: ${PAGE_URL}`);

let ctx;
try {
  ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
} catch (e) {
  console.error('⚠️ 无法有头启动浏览器（可能无桌面 GUI）：', e.message);
  server.close();
  process.exit(2);
}

// ===== 工具 =====
async function getSW() {
  let sw = ctx.serviceWorkers()[0];
  for (let i = 0; i < 60 && !sw; i++) { await sleep(200); sw = ctx.serviceWorkers()[0]; }
  return sw;
}
async function selectText(page, selector) {
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    const s = window.getSelection();
    s.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(el);
    s.addRange(r);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, selector);
}
async function clearSelection(page) {
  await page.evaluate(() => {
    window.getSelection().removeAllRanges();
    const ae = document.activeElement;
    if (ae && ae.setSelectionRange) ae.setSelectionRange(0, 0);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
}
function parseRGB(s) {
  const m = s?.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function luminance([r, g, b]) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(c1, c2) {
  const l1 = luminance(c1), l2 = luminance(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
// 面板在 open Shadow Root 内，原生 querySelector 不穿透 —— 递归统计 document + 所有 shadow root
const panelInfoSrc = `(() => {
  const count = (root) => {
    const c = { close: 0, shell: 0, loading: 0 };
    c.close += root.querySelectorAll('.ti-close-btn').length + root.querySelectorAll('.ti-acts button[title="关闭"]').length;
    c.shell += root.querySelectorAll('.ti-shell').length;
    c.loading += root.querySelectorAll('.ti-loading').length;
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const s = count(el.shadowRoot);
        c.close += s.close; c.shell += s.shell; c.loading += s.loading;
      }
    }
    return c;
  };
  return count(document);
})()`;

(async () => {
  let failed = 0;
  let pop, page, opt;
  try {
    const sw = await getSW();
    assert(sw, 'service worker 未启动');
    const extId = sw.url().match(/chrome-extension:\/\/([^/]+)/)[1];
    console.log('扩展 ID:', extId);
    console.log('已配置 Key 源:', Object.keys(KEYS).join(', ') || '(无)');

    // ===== 公共初始化：打开 popup + 写入真实 Key + 固定亮色主题，然后重载 =====
    pop = await ctx.newPage();
    activePages.push(pop);
    pop.setDefaultTimeout(45000);
    await pop.goto(`chrome-extension://${extId}/popup.html`);
    await pop.waitForSelector('.pp-in');
    await pop.evaluate(async keys => {
      const cur = (await chrome.storage.local.get('settings')).settings || {};
      cur.sources = cur.sources || {};
      for (const [sid, key] of Object.entries(keys)) {
        cur.sources[sid] = Object.assign({ enabled: true, apiKey: '', weight: 1 }, cur.sources[sid] || {}, { enabled: true, apiKey: key });
      }
      cur.theme = 'light'; // 固定初始主题，保证 A7 切换方向确定
      await chrome.storage.local.set({ settings: cur });
    }, KEYS);
    await pop.reload();
    await pop.waitForSelector('.pp-in');

    // ============ A. popup ============
    console.log('\n────── A. popup ──────');

    await t('A1', 'popup 查询 8.8.8.8 → 出现 .ti-smini（≥1 源）', async () => {
      await pop.fill('.pp-in', '8.8.8.8');
      await pop.click('.pp-go');
      await pop.waitForSelector('.ti-smini', { timeout: 60000 });
      await sleep(800);
      const n = await pop.locator('.ti-smini').count();
      assert(n >= 1, `源方块数量 ${n} < 1`);
    });

    await t('A2', 'typechip 显示 "IP"', async () => {
      const txt = (await pop.locator('.ti-typechip').first().textContent())?.trim();
      assert(txt === 'IP', `typechip = "${txt}"（期望 IP）`);
    });

    await t('A3', '恶意 IP 185.220.101.42 → aggregate.label=malicious', async () => {
      const raw = await pop.evaluate(() =>
        chrome.runtime.sendMessage({ kind: 'query', type: 'ip', value: '185.220.101.42', nocache: true }),
      );
      assert(raw?.aggregate?.label === 'malicious', `综合判定 = ${raw?.aggregate?.label}（分数 ${raw?.aggregate?.score}）`);
      console.log(`     ↳ label=${raw.aggregate.label} score=${raw.aggregate.score} contributors=${raw.aggregate.contributors}`);
    });

    await t('A4', '批量查询 3 个指标 → .batch-row×3 + .batch-summary', async () => {
      await pop.fill('.pp-in', '8.8.8.8\n1.1.1.1\nexample.com');
      await pop.click('.pp-go');
      await pop.waitForSelector('.batch-summary', { timeout: 30000 });
      await pop.waitForFunction(() => document.querySelectorAll('.batch-row').length === 3, null, { timeout: 240000 });
      const n = await pop.locator('.batch-row').count();
      assert(n === 3, `batch-row 数量 ${n} ≠ 3`);
    });

    await t('A5', '批量导出按钮存在', async () => {
      assert(await pop.locator('.batch-export').count() >= 1, '.batch-export 不存在');
    });

    await t('A6', '历史页：.pp-hi 有记录 + #hf-verdict + 导出 CSV 按钮', async () => {
      await pop.click('.pp-ibtn[title="最近查询"]');
      await pop.waitForSelector('.pp-hi', { timeout: 15000 });
      const n = await pop.locator('.pp-hi').count();
      assert(n >= 1, `.pp-hi 数量 ${n} < 1`);
      assert(await pop.locator('#hf-verdict').count() === 1, '#hf-verdict 不存在');
      assert(await pop.locator('.pp-export-btn').count() >= 1, '.pp-export-btn 不存在');
      console.log(`     ↳ 历史记录 ${n} 条`);
      await pop.click('.pp-ibtn[title="返回"]');
    });

    await t('A7', '主题切换：html[data-theme] light → dark', async () => {
      const before = await pop.evaluate(() => document.documentElement.dataset.theme);
      await pop.click('.pp-ibtn[title="切换亮/暗主题"]');
      await pop.waitForFunction(prev => document.documentElement.dataset.theme !== prev, before, { timeout: 5000 });
      const after = await pop.evaluate(() => document.documentElement.dataset.theme);
      assert(before === 'light' && after === 'dark', `主题 ${before} → ${after}（期望 light → dark）`);
    });

    await t('A8', '配额显示：#pp-quota 存在且有内容', async () => {
      assert(await pop.locator('#pp-quota').count() === 1, '#pp-quota 不存在');
      const txt = (await pop.locator('#pp-quota').textContent())?.trim();
      assert(txt.length > 0, `#pp-quota 内容为空（已配置源: ${Object.keys(KEYS).join(',') || '无'}）`);
      console.log(`     ↳ quota: ${txt}`);
    });

    await t('A9', 'URL 查询 → typechip 显示 "URL"', async () => {
      await pop.fill('.pp-in', 'http://example.com/path');
      await pop.click('.pp-go');
      await pop.waitForSelector('.ti-typechip', { timeout: 60000 });
      const txt = (await pop.locator('.ti-typechip').first().textContent())?.trim();
      assert(txt === 'URL', `typechip = "${txt}"（期望 URL）`);
    });

    await t('A10', '哈希查询 → typechip 显示 "HASH"', async () => {
      await pop.fill('.pp-in', '44d88612fea8a8f36de82e1278abb02f');
      await pop.click('.pp-go');
      await pop.waitForSelector('.ti-typechip', { timeout: 60000 });
      const txt = (await pop.locator('.ti-typechip').first().textContent())?.trim();
      assert(txt === 'HASH', `typechip = "${txt}"（期望 HASH）`);
    });

    // ============ B. 内容面板 ============
    console.log('\n────── B. 内容面板 ──────');
    page = await ctx.newPage();
    activePages.push(page);
    page.setDefaultTimeout(30000);
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');

    await t('B1', '选中 185.220.101.42 → .ti-fab 出现', async () => {
      await selectText(page, '#mal');
      await page.waitForSelector('.ti-fab', { timeout: 8000 });
    });

    let panelReady = false;
    await t('B2', '点击 fab → 面板出现 .ti-smini', async () => {
      await page.locator('.ti-fab').first().click();
      await page.waitForSelector('.ti-smini', { timeout: 90000 });
      await sleep(600);
      panelReady = (await page.locator('.ti-smini').count()) >= 1;
      assert(panelReady, '面板中无 .ti-smini');
    });

    // B3 拆两步：结果态（当前面板） + 加载态（另查未缓存 IP）
    let b3Result = true, b3ResultErr = '', b3Loading = true, b3LoadingErr = '';
    try {
      const n = (await page.evaluate(panelInfoSrc)).close;
      assert(n === 1, `结果态关闭按钮数量 ${n} ≠ 1`);
    } catch (e) { b3Result = false; b3ResultErr = e.message; }
    try {
      // 关闭当前面板 → 用未缓存 IP 验证加载态
      await page.keyboard.press('Escape');
      await page.waitForFunction(`(() => { let s=0; const w=r=>{s+=r.querySelectorAll('.ti-shell').length; for(const el of r.querySelectorAll('*')) if(el.shadowRoot) w(el.shadowRoot);}; w(document); return s===0; })()`, null, { timeout: 5000 });
      await selectText(page, '#fresh');
      await page.waitForSelector('.ti-fab', { timeout: 8000 });
      await page.locator('.ti-fab').first().click();
      let sample = null;
      for (let i = 0; i < 40; i++) {
        const s = await page.evaluate(panelInfoSrc);
        if (s.loading > 0) { sample = s; break; }
        await sleep(120);
      }
      assert(sample, '未能采样到加载态（响应过快）');
      assert(sample.close === 1, `加载态关闭按钮数量 ${sample.close} ≠ 1`);
      await page.waitForSelector('.ti-smini', { timeout: 90000 });
      await sleep(400);
      const n2 = (await page.evaluate(panelInfoSrc)).close;
      assert(n2 === 1, `加载后结果态关闭按钮数量 ${n2} ≠ 1`);
    } catch (e) { b3Loading = false; b3LoadingErr = e.message; }
    results.push({
      id: 'B3', desc: '关闭按钮数量 == 1（加载态 + 结果态）',
      ok: b3Result && b3Loading,
      err: [b3Result ? '' : `结果态: ${b3ResultErr}`, b3Loading ? '' : `加载态: ${b3LoadingErr}`].filter(Boolean).join('；'),
    });
    console.log(`${b3Result && b3Loading ? '✅' : '❌'} B3 关闭按钮数量 == 1（加载态 + 结果态）${results[results.length - 1].err ? '\n     ↳ ' + results[results.length - 1].err : ''}`);

    await t('B4', 'Escape 键关闭面板', async () => {
      const shellCountFn = () => { let s = 0; const w = r => { s += r.querySelectorAll('.ti-shell').length; for (const el of r.querySelectorAll('*')) if (el.shadowRoot) w(el.shadowRoot); }; w(document); return s; };
      const goneFn = () => { let s = 0; const w = r => { s += r.querySelectorAll('.ti-shell').length; for (const el of r.querySelectorAll('*')) if (el.shadowRoot) w(el.shadowRoot); }; w(document); return s === 0; };
      // 若上面已关闭则重新开一个面板（选中 #mal，走缓存很快）
      let has = await page.evaluate(shellCountFn);
      if (!has) {
        await selectText(page, '#mal');
        await page.waitForSelector('.ti-fab', { timeout: 8000 });
        await page.locator('.ti-fab').first().click();
        await page.waitForSelector('.ti-shell', { timeout: 90000 });
        has = await page.evaluate(shellCountFn);
      }
      assert(has >= 1, '面板未打开，无法测试 Escape');
      await page.keyboard.press('Escape');
      await page.waitForFunction(goneFn, null, { timeout: 5000, polling: 100 });
    });

    await t('B5', '输入框内选区 → fab 出现', async () => {
      await clearSelection(page);
      await page.evaluate(() => {
        const inp = document.getElementById('ipinput');
        inp.focus();
        inp.setSelectionRange(0, inp.value.length);
        inp.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });
      await page.waitForSelector('.ti-fab', { timeout: 8000 });
    });

    await t('B6', '多指标切换：8.8.8.8 and 1.1.1.1 → 面板出现 ◀▶ 导航（.ti-nav）', async () => {
      await clearSelection(page);
      await selectText(page, '#pair');
      await page.waitForSelector('.ti-fab', { timeout: 8000 });
      await page.locator('.ti-fab').first().click();
      await page.waitForSelector('.ti-nav', { timeout: 90000 });
      const txt = (await page.locator('.ti-nav').first().textContent())?.trim();
      assert(txt === '1/2', `.ti-nav 文本 = "${txt}"（期望 1/2）`);
      await page.keyboard.press('Escape').catch(() => {});
    });

    // ============ C. 设置页 ============
    console.log('\n────── C. 设置页 ──────');
    opt = await ctx.newPage();
    activePages.push(opt);
    opt.setDefaultTimeout(20000);
    await opt.goto(`chrome-extension://${extId}/options.html`);
    await opt.waitForSelector('.card');

    await t('C1', '各源卡片存在（.card ≥ 10）', async () => {
      const n = await opt.locator('.card').count();
      assert(n >= 10, `.card 数量 ${n} < 10`);
      console.log(`     ↳ .card 共 ${n} 个`);
    });
    await t('C2', 'API Key 输入框存在（#key-virustotal 等）', async () => {
      for (const id of ['key-virustotal', 'key-otx', 'key-shodan']) {
        assert(await opt.locator('#' + id).count() === 1, `#${id} 不存在`);
      }
    });
    await t('C3', '主题选择器存在（input[name=theme] 3 个选项）', async () => {
      const n = await opt.locator('input[name="theme"]').count();
      assert(n === 3, `主题选项 ${n} ≠ 3`);
    });
    await t('C4', '通知开关存在（#notify-malicious）', async () => {
      assert(await opt.locator('#notify-malicious').count() === 1, '#notify-malicious 不存在');
    });
    await t('C5', '配置导入导出区存在（#cfg-export / #cfg-import）', async () => {
      assert(await opt.locator('#cfg-export').count() === 1, '#cfg-export 不存在');
      assert(await opt.locator('#cfg-import').count() === 1, '#cfg-import 不存在');
    });
    await t('C6', '检测 Key 按钮存在（#check-health-btn）', async () => {
      assert(await opt.locator('#check-health-btn').count() === 1, '#check-health-btn 不存在');
    });
    await t('C7', '自动保存：改 TTL → 1 秒后出现"已自动保存"', async () => {
      await opt.fill('#ttl', '15');
      await opt.waitForFunction(() => document.body.textContent.includes('已自动保存'), null, { timeout: 8000 });
      // 还原 TTL，避免影响后续（仍是测试 profile，无副作用）
      await opt.fill('#ttl', '10');
      await sleep(1200);
    });
    await t('C8', '暗色主题下设置页文字可读（body 背景 = 深色 var(--page)）', async () => {
      const theme = await opt.evaluate(() => document.documentElement.dataset.theme);
      if (theme !== 'dark') {
        await opt.check('#th-dark'); // 通过真实控件切到暗色
        await sleep(300);
      }
      const c = await opt.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { bg: cs.backgroundColor, fg: cs.color, theme: document.documentElement.dataset.theme };
      });
      const bg = parseRGB(c.bg), fg = parseRGB(c.fg);
      assert(bg && luminance(bg) < 0.1, `body 背景 ${c.bg} 不是深色`);
      const cr = contrast(fg, bg);
      assert(cr >= 4.5, `正文对比度 ${cr.toFixed(2)} < 4.5`);
      console.log(`     ↳ data-theme=${c.theme} bg=${c.bg} fg=${c.fg} 对比度=${cr.toFixed(1)}:1`);
    });

    // ============ D. 右键菜单 ============
    console.log('\n────── D. 右键菜单 ──────');
    await t('D1', 'triggers.contextMenu 默认 true + background 已创建 contextMenus', async () => {
      const flag = await pop.evaluate(() => chrome.storage.local.get('settings').then(s => s?.settings?.triggers?.contextMenu));
      assert(flag === true, `storage triggers.contextMenu = ${flag}`);
      // 用“重复 id 创建必然报 duplicate 错”间接验证 'ti-query' 菜单已存在
      await pop.evaluate(() => chrome.runtime.sendMessage({ kind: 'noop-ping' }).catch(() => null)); // 唤醒/复活 SW
      await sleep(500);
      const swNow = await getSW();
      assert(swNow, 'service worker 不可用');
      let dup = null;
      for (let i = 0; i < 2; i++) {
        try { dup = await swNow.evaluate(() => new Promise(res => {
          try {
            chrome.contextMenus.create({ id: 'ti-query', title: 'audit-dup-probe', contexts: ['selection'] }, () => {
              res(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'created-no-error');
            });
          } catch (e) { res('thrown: ' + String(e)); }
        })); break; }
        catch (e) { await sleep(500); }
      }
      assert(dup != null, '无法在 service worker 中探测 contextMenus');
      assert(/duplicate/i.test(dup), `菜单 'ti-query' 未创建（create 返回: ${dup}）`);
      console.log(`     ↳ contextMenus.create('ti-query') → ${dup}`);
    });

    // ============ E. 一致性 ============
    console.log('\n────── E. 一致性 ──────');
    await t('E1', 'popup 暗色主题下批量结果文字可读（.batch-val 颜色）', async () => {
      // 重新加载 popup（settings.theme 已是 dark），批量查缓存指标
      await pop.goto(`chrome-extension://${extId}/popup.html`);
      await pop.waitForSelector('.pp-in');
      const theme = await pop.evaluate(() => document.documentElement.dataset.theme);
      assert(theme === 'dark', `popup 当前主题 ${theme}（期望 dark）`);
      await pop.fill('.pp-in', '8.8.8.8\n1.1.1.1');
      await pop.click('.pp-go');
      await pop.waitForSelector('.batch-summary', { timeout: 30000 });
      await pop.waitForFunction(() => document.querySelectorAll('.batch-row').length === 2, null, { timeout: 120000 });
      const c = await pop.evaluate(() => {
        const el = document.querySelector('.batch-val');
        return { color: getComputedStyle(el).color, bg: getComputedStyle(document.body).backgroundColor };
      });
      const fg = parseRGB(c.color), bg = parseRGB(c.bg);
      assert(fg && bg, `无法解析颜色 color=${c.color} bg=${c.bg}`);
      const cr = contrast(fg, bg);
      assert(cr >= 4.5, `.batch-val 对比度 ${cr.toFixed(2)} < 4.5（color=${c.color} bg=${c.bg}）`);
      console.log(`     ↳ color=${c.color} bg=${c.bg} 对比度=${cr.toFixed(1)}:1`);
    });

    await t('E2', '面板结果态 .ti-escalation 样式已在 CSS 中定义', async () => {
      const found = await pop.evaluate(() => {
        let css = '';
        for (const sheet of document.styleSheets) {
          try { for (const r of sheet.cssRules) css += r.cssText; } catch { /* ignore */ }
        }
        return /\.ti-escalation\s*\{/.test(css);
      });
      assert(found, '样式表中未找到 .ti-escalation 规则');
    });

  } catch (e) {
    console.error('\n❌ 审计流程异常中断：', e);
    if (pop) await dump(pop, 'popup');
    if (page) await dump(page, 'content');
    if (opt) await dump(opt, 'options');
  } finally {
    // ===== 汇总 =====
    console.log('\n════════════ 汇总 ════════════');
    const order = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','B1','B2','B3','B4','B5','B6','C1','C2','C3','C4','C5','C6','C7','C8','D1','E1','E2'];
    for (const id of order) {
      const r = results.find(x => x.id === id);
      if (!r) { console.log(`❌ ${id} （未执行）`); failed++; continue; }
      if (r.ok) console.log(`✅ ${id.padEnd(4)} ${r.desc}`);
      else { console.log(`❌ ${id.padEnd(4)} ${r.desc}\n        失败详情: ${r.err}`); failed++; }
    }
    const total = order.length, pass = total - failed;
    console.log('══════════════════════════════');
    console.log(`通过 ${pass}/${total}${failed ? `，失败 ${failed} 项` : '，全部通过 ✅'}`);
    await ctx.close().catch(() => {});
    server.close();
    process.exit(failed ? 1 : 0);
  }
})().catch(async e => {
  console.error('❌ 审计脚本异常：', e);
  await ctx.close().catch(() => {});
  server.close();
  process.exit(1);
});
