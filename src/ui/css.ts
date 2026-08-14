// 设计系统（主题变量单源）：LIGHT/DARK 常量同时供 .ti-shell（面板/Shadow DOM）
// 与 [data-theme]（popup/options 整页）使用，保证亮暗一致。

const LIGHT = `--page:#eef1f6; --bg:#fff; --softbg:#fafbff; --fg:#1f2329; --muted:#8a909c; --sub:#42526e;
  --border:#eef0f4; --border2:#f0f1f4; --chipbg:#f2f3f5; --chips:#646a73; --hover:#e4e6eb;
  --tagbg:#f2f4f7; --tags:#5e6472; --bar:#eef0f4; --accent:#4f46e5; --accentbg:#eef2ff; --btn:#4f46e5;
  --shadow:0 12px 44px rgba(15,23,42,.20);`;

const DARK = `--page:#0a0e14; --bg:#0d1117; --softbg:#11161c; --fg:#e6edf3; --muted:#9aa4b2; --sub:#c2cbd6;
  --border:#22272e; --border2:#1c2128; --chipbg:#21262d; --chips:#c2cbd6; --hover:#2d333b;
  --tagbg:#1c2128; --tags:#adbac7; --bar:#21262d; --accent:#8ab4f8; --accentbg:rgba(138,180,248,.14); --btn:#4f46e5;
  --shadow:0 16px 50px rgba(0,0,0,.55);`;

/** 整页主题变量（popup/options 注入，给 <html data-theme> 用） */
export const THEME_VARS = `
[data-theme="light"],:root{${LIGHT}}
[data-theme="dark"]{${DARK}}
`;

/** 面板/弹窗组件样式（前缀 .ti-，content 注入 Shadow DOM，popup/options 注入 <style>） */
export const PANEL_CSS = `
.ti-shell{ ${LIGHT} width:400px; max-width:92vw; background:var(--bg); color:var(--fg);
  font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",Roboto,sans-serif;
  border-radius:14px; overflow:hidden; box-shadow:var(--shadow); }
.ti-shell[data-theme="dark"]{ ${DARK} }
.ti-shell *{ box-sizing:border-box; }
.ti-shell svg{ display:block; }

/* 顶部 */
.ti-head{ display:flex; align-items:center; gap:8px; padding:10px 12px;
  border-bottom:1px solid var(--border2); background:linear-gradient(180deg,var(--softbg),var(--bg)); cursor:move; }
.ti-typechip{ font-size:10px; font-weight:700; letter-spacing:.05em; padding:3px 7px; border-radius:6px;
  background:var(--accentbg); color:var(--accent); text-transform:uppercase; flex:none; }
.ti-value{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; font-weight:600;
  word-break:break-all; min-width:0; flex:1 1 auto; }
.ti-acts{ display:flex; align-items:center; gap:4px; flex:none; }
.ti-ibtn{ width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center;
  border:none; border-radius:7px; background:var(--chipbg); color:var(--muted); cursor:pointer; transition:.12s; }
.ti-ibtn:hover{ background:var(--hover); color:var(--fg); }
.ti-nav{ font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; padding:0 2px; }

/* 判定横幅：全宽彩色渐变，视觉锚点 */
.ti-verdict{ padding:13px 14px 11px; color:#fff; }
.ti-verdict .v-main{ display:flex; align-items:baseline; gap:10px; }
.ti-verdict .v-label{ font-size:20px; font-weight:800; letter-spacing:.03em; line-height:1.2; }
.ti-verdict .v-score{ font-size:13px; font-weight:600; opacity:.92; font-variant-numeric:tabular-nums; }
.ti-verdict .v-sub{ font-size:11px; opacity:.82; margin-top:3px; }
.ti-verdict[data-v="malicious"]{ background:linear-gradient(135deg,#c62828 0%,#ef5350 100%); }
.ti-verdict[data-v="suspicious"]{ background:linear-gradient(135deg,#e65100 0%,#ffa726 100%); }
.ti-verdict[data-v="clean"]{ background:linear-gradient(135deg,#2e7d32 0%,#66bb6a 100%); }
.ti-verdict[data-v="unknown"]{ background:linear-gradient(135deg,#546e7a 0%,#90a4ae 100%); }

/* 分区 */
.ti-section{ padding:2px 12px 8px; }
.ti-stitle{ display:flex; align-items:center; gap:8px; font-size:11px; color:var(--muted);
  text-transform:uppercase; letter-spacing:.05em; margin:10px 2px 7px; }
.ti-count{ background:var(--chipbg); color:var(--chips); border-radius:10px; padding:1px 7px; font-size:10px; }

/* 多源研判：紧凑单行 + 点击手风琴展开详情 */
.ti-srow{ display:flex; align-items:center; gap:8px; padding:7px 12px; border-bottom:1px solid var(--border2); cursor:pointer; transition:background .1s; }
.ti-srow:hover,.ti-srow.open{ background:var(--softbg); }
.ti-srow .ti-ic{ width:18px; height:18px; border-radius:5px; background:#fff; display:flex; align-items:center; justify-content:center; flex:none; box-shadow:0 0 0 1px var(--border); overflow:hidden; }
.ti-srow .ti-ic img{ width:13px; height:13px; object-fit:contain; }
.ti-srow .nm{ flex:1; min-width:0; font-weight:600; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ti-srow .sc{ font-size:11.5px; color:var(--muted); font-variant-numeric:tabular-nums; min-width:22px; text-align:right; }
.ti-srow .ti-arrow{ font-size:10px; color:var(--muted); transition:transform .15s; flex:none; }
.ti-srow.open .ti-arrow{ transform:rotate(180deg); }
.ti-srow-detail{ padding:7px 12px 9px 38px; background:var(--softbg); border-bottom:1px solid var(--border2); }
.ti-srcgrid{ display:none; }
.ti-dhint{ color:var(--muted); font-size:12px; }
.ti-dtop{ display:flex; align-items:center; gap:8px; margin-bottom:5px; }
.ti-name{ font-weight:600; font-size:13px; }
.ti-vchip{ font-size:10px; font-weight:700; padding:2px 8px; border-radius:11px; color:#fff; }
.ti-srcscore{ margin-left:auto; font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; }
.ti-src-link{ color:var(--accent); text-decoration:none; font-size:12px; white-space:nowrap; }
.ti-src-link:hover{ text-decoration:underline; }
.ti-summary{ color:var(--sub); font-size:12px; }
.ti-bar{ height:4px; border-radius:2px; background:var(--bar); overflow:hidden; margin:6px 0 2px; }
.ti-bar > i{ display:block; height:100%; border-radius:2px; }
.ti-tags{ display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
.ti-tag{ font-size:10px; padding:2px 7px; border-radius:8px; background:var(--tagbg); color:var(--tags); }
.ti-err{ color:#e53935; }
.ti-err-row{ display:flex; align-items:flex-start; gap:6px; padding:6px 8px; border-radius:6px; background:rgba(229,57,53,.06); border:1px solid rgba(229,57,53,.15); }
.ti-err-icon{ font-size:14px; flex:none; line-height:1; }
.ti-err-row .ti-err{ font-size:12px; word-break:break-all; }

/* 跳转：厂家图标 */
.ti-jsep{ display:flex; align-items:center; gap:8px; margin:9px 2px 6px; }
.ti-jsep span{ font-size:11px; color:var(--muted); }
.ti-jsep hr{ flex:1; border:none; border-top:1px solid var(--border2); }
/* 一键跳转：标签与图标同行，更紧凑 */
.ti-jrow{ display:flex; align-items:center; gap:8px; margin:7px 0 2px; }
.ti-jrow > .ti-jtag{ font-size:10.5px; color:var(--muted); flex:none; width:26px; user-select:none; }
.ti-jumpline{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.ti-jico{ position:relative; width:28px; height:28px; border-radius:7px; background:#fff; display:flex; align-items:center; justify-content:center;
  flex:none; box-shadow:0 1px 2px rgba(0,0,0,.12); transition:.12s; }
.ti-jico:hover{ box-shadow:0 0 0 2px var(--accent); transform:translateY(-1px); z-index:2; }
.ti-jico img{ width:18px; height:18px; object-fit:contain; }
.ti-jico::after{ content:attr(data-name); position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%);
  background:var(--fg); color:var(--bg); font-size:11px; padding:3px 8px; border-radius:6px; white-space:nowrap; opacity:0;
  pointer-events:none; transition:opacity .12s; z-index:6; }
.ti-jico:hover::after{ opacity:1; }

/* 状态 */
.ti-loading{ padding:30px 16px; text-align:center; color:var(--muted); }
.ti-spinner{ width:26px; height:26px; border:3px solid var(--bar); border-top-color:var(--accent); border-radius:50%;
  margin:0 auto 10px; animation:tispin .8s linear infinite; }
@keyframes tispin{ to{ transform:rotate(360deg);} }
.ti-empty{ padding:20px 16px; text-align:center; color:var(--muted); font-size:12px; line-height:1.7; }
.ti-empty b{ color:var(--accent); }

/* 底栏 */
.ti-foot{ padding:8px 12px; border-top:1px solid var(--border2); font-size:11px; color:var(--muted);
  display:flex; gap:12px; align-items:center; background:var(--softbg); }
.ti-foot a{ color:var(--accent); text-decoration:none; cursor:pointer; }
.ti-foot a:hover{ text-decoration:underline; }
.ti-escalation{ padding:8px 12px; background:rgba(251,140,0,.12); color:#e65100; font-size:12px; font-weight:600; border-bottom:1px solid rgba(251,140,0,.2); }
.ti-close-btn{ position:absolute; top:8px; right:8px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;
  border:none; border-radius:7px; background:var(--chipbg); color:var(--muted); cursor:pointer; z-index:2; transition:.12s; }
.ti-close-btn:hover{ background:var(--hover); color:var(--fg); }
`;
