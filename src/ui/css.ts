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

/* 评分带 */
.ti-scoreband{ display:flex; align-items:center; gap:14px; padding:14px 14px 12px; }
.ti-ring{ flex:none; }
.ti-ringtrack{ stroke:var(--bar); }
.ti-sinfo{ min-width:0; }
.ti-sinfo .lab{ font-size:16px; font-weight:700; }
.ti-sinfo .meta{ color:var(--muted); font-size:12px; margin-top:2px; }
.ti-legend{ display:flex; flex-wrap:wrap; gap:9px; margin-top:7px; font-size:11px; color:var(--sub); }
.ti-legend i{ display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:3px; vertical-align:middle; }

/* 分区 */
.ti-section{ padding:2px 12px 8px; }
.ti-stitle{ display:flex; align-items:center; gap:8px; font-size:11px; color:var(--muted);
  text-transform:uppercase; letter-spacing:.05em; margin:10px 2px 7px; }
.ti-count{ background:var(--chipbg); color:var(--chips); border-radius:10px; padding:1px 7px; font-size:10px; }

/* 多源研判：方块网格 + 悬停“查看详情” + 点击展开持久详情 */
.ti-srcgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
.ti-smini{ position:relative; display:flex; align-items:center; gap:6px; padding:7px 8px; border-radius:8px; border:1px solid var(--border); background:var(--bg); cursor:pointer; transition:.12s; overflow:hidden; }
.ti-smini .ti-ic{ width:18px; height:18px; border-radius:5px; background:#fff; display:flex; align-items:center; justify-content:center; flex:none; box-shadow:0 0 0 1px var(--border); overflow:hidden; }
.ti-smini .ti-ic img{ width:13px; height:13px; object-fit:contain; }
.ti-smini .nm{ font-size:11px; font-weight:600; color:var(--fg); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ti-smini .sc{ display:flex; align-items:center; gap:4px; font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; flex:none; }
.ti-smini .dot{ width:7px; height:7px; border-radius:50%; flex:none; }
.ti-smini[data-v="malicious"]{ border-color:rgba(229,57,53,.5); }
.ti-smini[data-v="suspicious"]{ border-color:rgba(251,140,0,.5); }
.ti-smini[data-v="clean"]{ border-color:rgba(67,160,71,.45); }
.ti-smini:hover{ border-color:var(--accent); }
.ti-smini.sel{ border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
.ti-sgo{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; gap:4px; background:var(--softbg); color:var(--accent); font-size:11px; font-weight:600; opacity:0; transition:opacity .12s; }
.ti-smini:hover .ti-sgo{ opacity:1; }
.ti-srcdetail{ margin-top:9px; border-radius:10px; border:1px solid var(--border); background:var(--bg); padding:9px 11px; min-height:18px; }
.ti-srcdetail.idle{ background:var(--softbg); }
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

/* 跳转：厂家图标 */
.ti-jsep{ display:flex; align-items:center; gap:8px; margin:9px 2px 6px; }
.ti-jsep span{ font-size:11px; color:var(--muted); }
.ti-jsep hr{ flex:1; border:none; border-top:1px solid var(--border2); }
/* 一键跳转：国内/国外各一行，悬停弹厂家名 */
.ti-jlab{ font-size:11px; color:var(--muted); margin:9px 2px 5px; }
.ti-jumpline{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.ti-jico{ position:relative; width:28px; height:28px; border-radius:7px; background:#fff; display:flex; align-items:center; justify-content:center;
  flex:none; box-shadow:0 1px 2px rgba(0,0,0,.12); transition:.12s; }
.ti-jico:hover{ box-shadow:0 0 0 2px var(--accent); transform:translateY(-1px); z-index:2; }
.ti-jico img{ width:18px; height:18px; object-fit:contain; }
.ti-jico::after{ content:attr(data-name); position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%);
  background:#1f2329; color:#fff; font-size:11px; padding:3px 8px; border-radius:6px; white-space:nowrap; opacity:0;
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
`;
