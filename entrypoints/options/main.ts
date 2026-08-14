// 设置页：主题、各情报源开关/Key/权重、内置分步申请指引、触发方式、缓存、跳转说明。
// 所有内容存 chrome.storage.local。

import { ADAPTERS } from '../../src/adapters';
import type { Settings } from '../../src/adapters/types';
import { getSettings, saveSettings } from '../../src/lib/storage';
import { SOURCE_GUIDES, JUMP_ONLY_NOTE } from '../../src/lib/guides';
import { PANEL_CSS, THEME_VARS } from '../../src/ui/css';
import { resolvedTheme } from '../../src/ui/theme';
import { h } from '../../src/ui/dom';

const CSS = `
*{box-sizing:border-box;}
body{margin:0;padding:28px 20px 60px;background:var(--page);font:14px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--fg);}
.wrap{max-width:820px;margin:0 auto;}
.hd{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
.hd-logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#06b6d4);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(79,70,229,.35);}
.hd-logo svg{width:21px;height:21px;}
.hd h1{font-size:22px;margin:0;}
.hd-sub{color:var(--muted);font-size:13px;margin-bottom:18px;}
h2{font-size:15px;margin:28px 0 0;display:flex;align-items:center;gap:8px;}
h2 .n{display:inline-flex;width:22px;height:22px;border-radius:6px;background:var(--btn);color:#fff;font-size:12px;align-items:center;justify-content:center;}
.card{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:12px 0;box-shadow:0 1px 3px rgba(15,23,42,.04);}
.row{display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap;}
.row label.k{font-weight:600;min-width:88px;color:var(--fg);}
input[type=text],input[type=password]{flex:1;min-width:200px;padding:9px 11px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--fg);outline:none;}
input[type=password]:focus,input[type=text]:focus,input[type=number]:focus{border-color:var(--accent);}
input[type=number]{width:90px;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--fg);}
.muted{color:var(--muted);font-size:12px;}
.src-head{display:flex;align-items:center;gap:10px;}
.src-name{font-weight:700;font-size:15px;}
.tag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--accentbg);color:var(--accent);}
.req{font-size:11px;color:var(--muted);}
.guide{margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);}
.guide-t{font-size:12px;font-weight:700;color:var(--sub);margin-bottom:4px;}
.guide ol{margin:4px 0 8px;padding-left:20px;color:var(--sub);font-size:13px;}
.guide ol li{margin:3px 0;}
.guide .lim{display:inline-block;font-size:11px;background:var(--chipbg);color:var(--chips);padding:2px 8px;border-radius:8px;margin-bottom:6px;}
.guide .note{font-size:12px;color:#b26a00;background:rgba(251,140,0,.10);border:1px solid rgba(251,140,0,.25);padding:6px 10px;border-radius:8px;}
.guide a{color:var(--accent);}
.seg{display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden;}
.seg label{padding:8px 16px;cursor:pointer;font-size:13px;color:var(--muted);}
.seg input{display:none;}
.seg input:checked + span{background:var(--btn);color:#fff;}
.seg span{display:block;padding:8px 16px;}
.save{background:var(--btn);color:#fff;border:none;padding:11px 26px;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;}
.btn2{background:var(--chipbg);color:var(--fg);border:1px solid var(--border);border-radius:9px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer;}
.btn2:hover{background:var(--hover);}
.save:hover{filter:brightness(1.06);}
.toast{color:#43a047;font-weight:600;margin-left:12px;}
.tip{background:var(--accentbg);color:var(--accent);border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:6px;}
`;

const LOGO = `<svg viewBox="0 0 128 128" fill="none"><path d="M64 24 L98 37 V63 C98 88 83 104 64 110 C45 104 30 88 30 63 V37 Z" fill="#fff"/><circle cx="56" cy="57" r="13" fill="none" stroke="#4f46e5" stroke-width="7"/><line x1="65" y1="66" x2="76" y2="78" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/></svg>`;

const settings = await getSettings();
document.documentElement.dataset.theme = resolvedTheme(settings.theme);
document.head.append(h('style', { text: THEME_VARS }), h('style', { text: PANEL_CSS }), h('style', { text: CSS }));

// API Key 健康检查（手动触发，避免浪费配额）
async function checkKeyHealth() {
  const btn = document.getElementById('check-health-btn') as HTMLButtonElement;
  if (btn) { btn.disabled = true; btn.textContent = '检测中…'; }
  let ok = 0, fail = 0;
  for (const a of ADAPTERS) {
    const s = settings.sources[a.id];
    if (!s?.enabled || !s.apiKey || !a.requiresKey) continue;
    const el = document.getElementById(`key-${a.id}`);
    try {
      await a.query('ip', '8.8.8.8', s.apiKey);
      if (el) { el.style.borderColor = '#43a047'; el.title = 'Key 有效'; }
      ok++;
    } catch (e: any) {
      if (el) { el.style.borderColor = '#e53935'; el.title = `Key 可能无效：${e?.message || '请求失败'}`; }
      fail++;
    }
  }
  if (btn) { btn.disabled = false; btn.textContent = `检测完成 ✓ 有效 ${ok} 无效 ${fail}`; setTimeout(() => { btn.textContent = '检测所有 Key'; }, 3000); }
}

function themeSeg() {
  const wrap = h('div', { class: 'seg' });
  for (const t of ['light', 'dark', 'auto'] as const) {
    const id = `th-${t}`;
    const radio = h('input', { type: 'radio', name: 'theme', id, value: t, ...(settings.theme === t ? { checked: true } : {}) });
    radio.addEventListener('change', () => (document.documentElement.dataset.theme = resolvedTheme(t)));
    wrap.append(h('label', { for: id }, [radio, h('span', { text: t === 'light' ? '亮色' : t === 'dark' ? '暗色' : '跟随系统' })]));
  }
  return wrap;
}

function trigRow(id: string, label: string, checked: boolean) {
  const cb = h('input', { type: 'checkbox', id: `trig-${id}`, ...(checked ? { checked: true } : {}) });
  return h('div', { class: 'row' }, [cb, h('label', { for: `trig-${id}`, text: label })]);
}

// 配置导入 / 导出
const inclKeys = h('input', { type: 'checkbox', checked: true, id: 'cfg-keys' });
const cfgStatus = h('span', { class: 'muted', id: 'cfg-status' });
const fileInput = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, id: 'cfg-file' });
function setCfgStatus(text: string, cls: string) {
  cfgStatus.className = cls;
  cfgStatus.textContent = text;
}
async function exportConfig() {
  const s = await getSettings();
  const withKeys = (inclKeys as HTMLInputElement).checked;
  if (!withKeys) {
    for (const k of Object.keys(s.sources)) {
      const cur = s.sources[k];
      if (cur) s.sources[k] = { ...cur, apiKey: '' };
    }
  }
  const data = { type: 'threat-intel-helper-config', version: 1, exportedAt: new Date().toISOString(), settings: s };
  let blob: Blob;
  let ext = 'json';
  if (withKeys) {
    // 含 Key 时支持密码加密
    const pwd = prompt('设置导出密码（留空则不加密）：');
    if (pwd) {
      const encoded = await encryptConfig(JSON.stringify(data), pwd);
      blob = new Blob([encoded], { type: 'application/octet-stream' });
      ext = 'encrypted.json';
      setCfgStatus('已导出（含 Key，AES 加密）', 'toast');
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      setCfgStatus('已导出（含 Key，未加密，注意保密）', 'toast');
    }
  } else {
    blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    setCfgStatus('已导出（不含 Key）', 'toast');
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xingchuan-ti-config-${new Date().toISOString().slice(0, 10)}.${ext}`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// AES-GCM 加密（Web Crypto API）
async function encryptConfig(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  // 格式：salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  // 分块转 base64，避免大数组 spread 栈溢出
  let binary = '';
  for (let i = 0; i < result.length; i += 8192) {
    binary += String.fromCharCode(...result.subarray(i, i + 8192));
  }
  return btoa(binary);
}
fileInput.addEventListener('change', async () => {
  const f = (fileInput as HTMLInputElement).files?.[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data?.type !== 'threat-intel-helper-config' || !data.settings || typeof data.settings !== 'object') {
      throw new Error('文件格式不正确');
    }
    // 验证字段类型/范围
    const s = data.settings;
    if (typeof s.cacheTtlMin !== 'number' || s.cacheTtlMin < 0) s.cacheTtlMin = 10;
    if (!['light', 'dark', 'auto'].includes(s.theme)) s.theme = 'auto';
    if (typeof s.notifyOnMalicious !== 'boolean') s.notifyOnMalicious = true;
    if (s.sources && typeof s.sources === 'object') {
      for (const [k, v] of Object.entries(s.sources) as [string, any][]) {
        if (v && typeof v === 'object') {
          v.enabled = !!v.enabled;
          v.apiKey = typeof v.apiKey === 'string' ? v.apiKey : '';
          v.weight = typeof v.weight === 'number' && v.weight > 0 ? v.weight : 1;
        }
      }
    }
    // 先禁止自动保存，清除已排队的 debounce，再写入
    skipAutoSave = true;
    clearTimeout(saveTimer);
    await saveSettings(s);
    setCfgStatus('已导入，正在刷新…', 'toast');
    setTimeout(() => location.reload(), 400);
  } catch (e: any) {
    setCfgStatus('导入失败：' + (e?.message || '解析错误'), 'muted');
    (fileInput as HTMLInputElement).value = '';
    skipAutoSave = false; // 失败时恢复
  }
});

const wrap = h('div', { class: 'wrap' });
wrap.append(
  h('div', { class: 'hd' }, [h('div', { class: 'hd-logo', html: LOGO }), h('div', {}, [h('h1', { text: '威胁情报助手 · 设置' })])]),
  h('div', { class: 'hd-sub', text: '所有 API Key 仅保存在本地，不会上传。各源免费额度有限，请按需开启。' }),

  // 主题
  h('h2', {}, [h('span', { class: 'n', text: '1' }), '外观主题']),
  h('div', { class: 'card' }, [h('div', { class: 'row' }, [h('label', { class: 'k', text: '主题' }), themeSeg()])]),

  // 情报源 + 申请指引
  h('h2', {}, [h('span', { class: 'n', text: '2' }), '情报源（自动研判）']),
  h('div', { class: 'tip' }, [
    h('span', { text: '勾选并填入 Key 后即参与多源加权研判；权重越大对综合评分影响越大。' }),
    h('button', { id: 'check-health-btn', class: 'btn2', text: '检测所有 Key', onClick: checkKeyHealth, style: { marginLeft: '10px' } }),
  ]),
);

for (const a of ADAPTERS) {
  const s = settings.sources[a.id] ?? { enabled: true, apiKey: '', weight: 1 };
  const g = SOURCE_GUIDES.find(x => x.id === a.id);
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'row' }, [
      h('input', { type: 'checkbox', id: `en-${a.id}`, ...(s.enabled ? { checked: true } : {}) }),
      h('div', { class: 'src-head' }, [
        h('span', { class: 'src-name', text: a.name }),
        h('span', { class: 'tag', text: a.supports.join(' / ').toUpperCase() }),
        h('span', { class: 'req', text: a.requiresKey ? '需 API Key' : 'Key 可选（匿名可查）' }),
      ]),
    ]),
    h('div', { class: 'row' }, [
      h('label', { class: 'k', text: 'API Key' }),
      h('input', { type: 'password', id: `key-${a.id}`, value: s.apiKey, placeholder: a.requiresKey ? '必填，未填将跳过该源' : '可选' }),
    ]),
    h('div', { class: 'row' }, [
      h('label', { class: 'k', text: '权重' }),
      h('input', { type: 'number', id: `w-${a.id}`, value: String(s.weight), step: '0.1', min: '0' }),
      h('span', { class: 'muted', text: '越大对综合评分影响越大' }),
    ]),
    g
      ? h('div', { class: 'guide' }, [
          h('div', { class: 'guide-t', text: '如何获取 API Key' }),
          h('div', { class: 'lim', text: '免费额度：' + g.limits }),
          h('div', {}, [h('a', { text: '前往 ' + g.applyUrl, href: g.applyUrl, target: '_blank', rel: 'noopener' })]),
          h('ol', {}, g.steps.map(st => h('li', { text: st }))),
          g.note ? h('div', { class: 'note', text: '注意：' + g.note }) : null,
        ])
      : null,
  ]);
  wrap.append(card);
}

// 触发
wrap.append(
  h('h2', {}, [h('span', { class: 'n', text: '3' }), '触发方式']),
  h('div', { class: 'card' }, [
    trigRow('selection', '划词浮窗（选中 IP/域名后出现查询按钮）', settings.triggers.selection),
    trigRow('contextMenu', '右键菜单“威胁情报查询”', settings.triggers.contextMenu),
    trigRow('popup', '工具栏图标弹窗', settings.triggers.popup),
  ]),

  // 通知
  h('h2', {}, [h('span', { class: 'n', text: '4' }), '通知']),
  h('div', { class: 'card' }, [
    h('div', { class: 'row' }, [
      h('input', { type: 'checkbox', id: 'notify-malicious', ...(settings.notifyOnMalicious ? { checked: true } : {}) }),
      h('label', { for: 'notify-malicious', text: '恶性 verdict 桌面通知' }),
      h('span', { class: 'muted', text: '查询结果为恶意时，浏览器通知提醒' }),
    ]),
  ]),

  // 缓存
  h('h2', {}, [h('span', { class: 'n', text: '5' }), '缓存']),
  h('div', { class: 'card' }, [
    h('div', { class: 'row' }, [
      h('label', { class: 'k', text: '结果缓存(分钟)' }),
      h('input', { type: 'number', id: 'ttl', value: String(settings.cacheTtlMin), min: '0' }),
      h('span', { class: 'muted', text: '同一指标在 TTL 内复用结果，节省各源配额；0 表示不缓存' }),
    ]),
  ]),

  // 跳转说明
  h('h2', {}, [h('span', { class: 'n', text: '6' }), '一键跳转平台']),
  h('div', { class: 'card' }, [h('div', { class: 'muted', text: JUMP_ONLY_NOTE })]),

  // 配置导入 / 导出
  h('h2', {}, [h('span', { class: 'n', text: '7' }), '配置导入 / 导出']),
  h('div', { class: 'card' }, [
    h('div', { class: 'row' }, [
      h('label', { class: 'k', text: '导出含 Key' }),
      inclKeys,
      h('span', { class: 'muted', text: '含 Key 的文件敏感，勿公开分享；导入到新浏览器即可恢复全部配置' }),
    ]),
    h('div', { class: 'row' }, [
      h('button', { class: 'save', id: 'cfg-export', text: '⬇  导出配置', onClick: exportConfig }),
      h('button', { class: 'btn2', id: 'cfg-import', text: '⬆  导入配置', onClick: () => (fileInput as HTMLInputElement).click() }),
      cfgStatus,
    ]),
    fileInput,
  ]),
);

const status = h('span', { class: 'muted', text: '修改后自动保存' });
wrap.append(h('div', { class: 'row' }, [status]));

document.body.append(wrap);

// 自动保存：任意输入变化后防抖保存（无需点保存按钮）
let skipAutoSave = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  if (skipAutoSave) return;
  status.className = 'muted';
  status.textContent = '保存中…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await saveAll();
    status.className = 'toast';
    status.textContent = '已自动保存 ✓';
  }, 400);
}
wrap.querySelectorAll('input').forEach(el => {
  el.addEventListener('input', scheduleSave);
  el.addEventListener('change', scheduleSave);
});

async function saveAll() {
  const s: Settings = await getSettings();
  for (const a of ADAPTERS) {
    s.sources[a.id] = {
      enabled: (document.getElementById(`en-${a.id}`) as HTMLInputElement).checked,
      apiKey: (document.getElementById(`key-${a.id}`) as HTMLInputElement).value.trim(),
      weight: parseFloat((document.getElementById(`w-${a.id}`) as HTMLInputElement).value) || 1,
    };
  }
  for (const t of ['selection', 'contextMenu', 'popup'] as const) {
    s.triggers[t] = (document.getElementById(`trig-${t}`) as HTMLInputElement).checked;
  }
  s.cacheTtlMin = parseInt((document.getElementById('ttl') as HTMLInputElement).value) || 0;
  s.notifyOnMalicious = (document.getElementById('notify-malicious') as HTMLInputElement).checked;
  const checked = document.querySelector('input[name="theme"]:checked') as HTMLInputElement;
  if (checked) s.theme = checked.value as Settings['theme'];
  await saveSettings(s);
}
