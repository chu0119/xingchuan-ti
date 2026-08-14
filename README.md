<p align="center">
  <img src="public/icons/128.png" alt="星川威胁情报助手" width="96" height="96">
</p>

<h1 align="center">星川威胁情报助手</h1>
<p align="center">
  <strong>XingChuan Threat Intelligence</strong><br>
  <em>面向安全分析师的开源浏览器扩展 · 多源威胁情报加权研判 · 一键跳转 19 个平台</em>
</p>

<p align="center">
  <a href="https://github.com/chu0119/xingchuan-ti/releases"><img src="https://img.shields.io/badge/version-0.6.3-blue?style=flat-square" alt="version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
  <a href="#"><img src="https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square" alt="tests"></a>
  <a href="#"><img src="https://img.shields.io/badge/Chrome-Manifest%20V3-yellow?style=flat-square" alt="chrome"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square" alt="typescript"></a>
  <a href="https://github.com/chu0119/xingchuan-ti/releases"><img src="https://img.shields.io/github/downloads/chu0119/xingchuan-ti/total?style=flat-square" alt="downloads"></a>
</p>

---

## 这是什么？

**星川威胁情报助手**让安全分析师在任意网页上**选中 IP / 域名 / URL / 文件哈希**，即可一键聚合 VirusTotal、微步、AbuseIPDB、Shodan 等 **10 个情报源**的研判结果，给出加权综合评分（恶意 / 可疑 / 干净），并支持一键跳转到 **19 个国内外情报平台**的详情页做深入分析。

> **一句话**：选中 IOC → 点击查询 → 多源研判 → 一键跳转深入分析

<p align="center">
  <img src="docs/images/popup-malicious-light.png" alt="亮色弹窗" width="390">&nbsp;&nbsp;
  <img src="docs/images/popup-malicious-dark.png" alt="暗色弹窗" width="390">
</p>

<p align="center">
  <img src="docs/images/options-light.png" alt="设置页" width="780">
</p>

---

## 为什么做这个？

作为安全从业者，日常经常在 SIEM 告警、邮件正文、日志终端里看到可疑 IP/域名，然后手动打开 VirusTotal、微步、奇安信等平台逐一查询。这个过程**重复、低效、容易遗漏**。

市面上没有一款工具能同时满足：**多源聚合研判 + 国内外平台覆盖 + 开源可审计 + 零遥测隐私保护**。于是做了这个。

---

## ✨ 核心功能

### 🔍 划词即查（三种触发方式）

| 方式 | 说明 |
|------|------|
| **划词浮窗** | 选中 IP/域名/URL/哈希，旁边出现「🔍 情报查询」按钮 |
| **右键菜单** | 选中文本 → 右键 →「威胁情报查询」 |
| **工具栏弹窗** | 点击扩展图标 → 输入框查询（支持多行批量） |
| **键盘快捷键** | Ctrl+Shift+Y（Mac: Cmd+Shift+Y） |

### 📊 多源加权研判

10 个情报源并行查询，加权综合评分，**透明展示每个源的贡献**：

- **判定横幅**：全宽彩色渐变（红=恶意 / 橙=可疑 / 绿=干净），一眼识别风险等级
- **源行详情**：点击任意源行展开该源的判定摘要、标签、评分条
- **clean 不稀释恶意**：查无记录不等于安全，不会把恶意源的分数平均拉低
- **确认源数量**：展示"X 源确认恶意"，提高研判置信度
- **权重可调**：设置页可自定义各源权重
- **verdict 升级告警**：同一 IOC 重新查询时 verdict 恶化，面板顶部高亮提示

### 📦 批量查询 + CSV 导出

在弹窗输入框粘贴多行 IOC（每行一个），自动进入批量模式，逐个查询并汇总表格，支持一键导出 CSV（Excel 兼容）。

### 🔗 一键跳转（19 个平台，无需 Key）

<p align="center">
  <img src="docs/images/popup-empty-light.png" alt="跳转图标" width="400">
</p>

**国内**：微步、奇安信、长亭、腾讯 TIX、360、绿盟、安恒、站长之家、IP138

**国外**：VirusTotal、AbuseIPDB、AlienVault OTX、Shodan、Censys、GreyNoise、urlscan.io、SecurityTrails、ThreatFox、MalwareBazaar

> 每个平台都用真实品牌图标（favicon），鼠标悬停显示平台名。SPA 平台带参数直链查询页。

### 🎨 亮/暗主题

一键切换，设置页可选"跟随系统"。弹窗头部 ☀/🌙 按钮实时切换，设置页三选一（亮色 / 暗色 / 跟随系统）。

### 📋 配置导入导出

- 导出含 Key：可选 AES-GCM 密码保护（导出时设密码，导入时要密码）
- 导出不含 Key：默认行为，适合分享基础配置
- 导入时自动校验字段类型/范围，防止无效数据

### 🔒 安全优先

- API Key 仅存本地 `chrome.storage.local`，不上传、不遥测、不外发
- 查询记录仅存 `chrome.storage.session`，关闭浏览器即清
- host_permissions 最小权限（精确到 API 路径）
- Content Security Policy 声明，防止 XSS
- 配置导出支持 AES-GCM 加密
- API Key 健康检查（手动触发，检测无效 Key 标红提醒）
- 全部源码开源可审计，MIT 许可证

---

## 🧩 情报源

支持的指标类型：**IP**（v4/v6）、**域名**、**URL**、**文件哈希**（MD5 / SHA1 / SHA256）

| 源 | 指标 | 免费额度 | 备注 |
|---|---|---|---|
| [VirusTotal](https://www.virustotal.com/) | IP + 域名 + 哈希 | 4次/分、500次/天 | Public API |
| [AbuseIPDB](https://www.abuseipdb.com/) | IP | 1000次/天 | 滥用举报置信度 |
| [AlienVault OTX](https://otx.alienvault.com/) | IP + 域名 | 宽松（免费） | Key 可选 |
| [Shodan](https://www.shodan.io/) | IP | 1次/秒 | 端口/漏洞富化，CVSS 评分 |
| [GreyNoise](https://www.greynoise.io/) | IP | ~50次/周 | 区分扫描器性质 |
| [微步在线](https://x.threatbook.com/) | IP + 域名 | ~10次/天 + 100次/月 | 国内唯一明确免费 |
| [urlscan.io](https://urlscan.io/) | IP + 域名 + URL | ~100次/天 | 免费，Key 可选 |
| [ThreatFox](https://threatfox.abuse.ch/) | IP + 域名 + URL + 哈希 | 免费 | C2 IOC 质量极高，需 Auth-Key |
| [MalwareBazaar](https://bazaar.abuse.ch/) | 哈希 | 免费 | 恶意样本关联，需 Auth-Key |
| [Censys](https://search.censys.io/) | IP | 免费层有额度 | 与 Shodan 互补，需 API Key |

> 设置页内置每个源的**分步 API Key 申请指引**（含注册链接、获取步骤、免费额度说明）。

---

## 🚀 快速开始

### 安装

1. 从 [Releases](https://github.com/chu0119/xingchuan-ti/releases) 下载最新 `xingchuan-ti-x.x.x-chrome.zip`
2. 解压到任意目录
3. Chrome 打开 `chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择解压后的目录

### 配置

1. 点击扩展图标 → ⚙ 设置
2. 在各情报源下填入 API Key（设置页内置申请指引）
3. 修改自动保存，无需点保存按钮

### 使用

- **划词查询**：选中 IP/域名/URL/哈希 → 点击浮窗按钮
- **右键查询**：选中文本 → 右键 →「威胁情报查询」
- **键盘快捷键**：Ctrl+Shift+Y 查询当前选中文本
- **工具栏**：点击扩展图标 → 输入框查询（支持多行批量）
- **批量导出**：批量查询结果页点击「导出 CSV」

---

## 🏗️ 技术架构

```
xingchuan-ti/
├── entrypoints/          # WXT 入口
│   ├── background.ts     # 编排器：并发查源 + 限流 + 缓存 + 加权评分 + 通知 + 右键菜单
│   ├── content.ts        # 划词检测 + 浮动按钮 + 可拖动 Shadow DOM 面板
│   ├── popup/            # 工具栏弹窗（查询/研判/历史/配额）
│   └── options/          # 设置页（配置/指引/导入导出/健康检查）
├── src/
│   ├── adapters/         # 统一 Adapter 接口 + 10 个情报源适配器
│   ├── lib/              # 核心库（detect/storage/score/platforms/rateLimit/cache/http/messaging/history/clipboard/guides）
│   └── ui/               # 渲染层（panel + css 设计系统 + dom 工具 + theme）
├── public/icons/         # 扩展图标 + 19 个平台真实 favicon
├── scripts/              # 构建脚本（图标抓取、截图、测试台）
├── test/                 # 测试（逻辑/适配器/E2E/配置/批量/关闭按钮/全功能审计）
├── design.md             # 设计文档
└── CHROME_WEB_STORE.md   # 上架指南
```

**技术栈**：WXT 0.21 + TypeScript 5.x + 原生 CSS（无 Vue/React/Tailwind）+ Web Crypto API

**设计原则**：
- **可审计**：全部源码开源，无框架黑盒，安全工具必须可审查
- **最小依赖**：原生 TS + CSS，供应链攻击面最小化
- **隐私优先**：零遥测，Key 仅本地存储
- **模块化**：每个情报源一个适配器文件，新增源只需写一个文件 + 注册

---

## 🧪 测试

| 命令 | 说明 |
|------|------|
| `npm test` | 逻辑单测（识别/评分/跳转/IPv6/URL/哈希）— 88 个 |
| `npm run test:adapters` | 适配器解析单测 + OTX 真实联网 — 17 个 |
| `npm run test:e2e` | 真实扩展端到端（需桌面 GUI）— 5 个场景 |
| `npm run test:popup` | 弹窗输入框数量验证 |
| `npm run test:config` | 配置导入/导出 E2E（含加密/非法文件） |
| `npm run test:batch` | 批量查询 E2E |
| `npm run test:close` | 关闭按钮唯一性验证 |
| `node test/full-audit.mjs` | **27 项真实浏览器全功能审计**（真 Key + 真实 API） |
| `npm run typecheck` | TypeScript 全量类型检查 |

> `full-audit` 覆盖：popup 10 项（查询/批量/历史/主题/配额/URL/哈希）+ 内容面板 6 项（划词/输入框/关闭/Escape/多指标）+ 设置页 8 项 + 右键菜单 + 一致性 2 项。全部在真实浏览器 + 真实 API 下运行。

---

## 🔧 开发

```bash
npm install             # 安装依赖
npm run dev             # 开发模式（热重载）
npm run build           # 生产构建
npm run zip             # 打包 zip
npm run icons           # 重新抓取平台 favicon
npm run screenshots     # 拍摄 README 截图
```

### 添加新情报源

1. `src/adapters/` 下创建新文件，实现 `Adapter` 接口
2. `src/adapters/index.ts` 注册
3. `src/lib/storage.ts` `DEFAULT_SETTINGS` 添加默认配置
4. `src/lib/platforms.ts` 添加跳转配置
5. `wxt.config.ts` `host_permissions` 添加 API 域名
6. `src/lib/guides.ts` 添加 API 申请指引
7. 添加适配器单测
8. 更新 README

---

## 🆚 与同类工具对比

| 特性 | 星川威胁情报助手 | 微步在线扩展 | VirusTotal 扩展 |
|------|:---:|:---:|:---:|
| 多源聚合 | ✅ 10 个源 | ❌ 仅微步 | ❌ 仅 VT |
| 加权综合评分 | ✅ 可调权重 | ❌ | ❌ |
| 国内平台覆盖 | ✅ 9 个 | ✅ 仅微步 | ❌ |
| 一键跳转 | ✅ 19 个平台 | ❌ | ❌ |
| 批量查询 + CSV | ✅ | ❌ | ❌ |
| URL / 哈希识别 | ✅ MD5/SHA1/SHA256 | ❌ | ✅ 仅哈希 |
| 亮/暗主题 | ✅ 跟随系统 | ❌ | ❌ |
| 配置导入导出 | ✅ AES 加密 | ❌ | ❌ |
| 开源可审计 | ✅ MIT | ❌ | ❌ |
| 零遥测 | ✅ | ❌ | ❌ |
| Key 健康检查 | ✅ | ❌ | ❌ |
| verdict 升级告警 | ✅ | ❌ | ❌ |
| 桌面通知 | ✅ 可关闭 | ❌ | ❌ |
| 键盘快捷键 | ✅ Ctrl+Shift+Y | ❌ | ❌ |

---

## ⚖️ 免责声明

仅供安全研究与授权分析使用。各情报平台 API 有各自的服务条款（如 VirusTotal Public API 不得用于商业产品），使用前请阅读并遵守。判定结果仅供参考，最终判断请结合多方情报与上下文。

## 📄 许可证

[MIT](LICENSE)

## 🙏 致谢

- [WXT](https://wxt.dev/) — 现代浏览器扩展开发框架
- [VirusTotal](https://www.virustotal.com/) · [AbuseIPDB](https://www.abuseipdb.com/) · [AlienVault OTX](https://otx.alienvault.com/) · [Shodan](https://www.shodan.io/) · [GreyNoise](https://www.greynoise.io/) · [微步在线](https://x.threatbook.com/) · [urlscan.io](https://urlscan.io/) · [ThreatFox](https://threatfox.abuse.ch/) · [MalwareBazaar](https://bazaar.abuse.ch/) · [Censys](https://search.censys.io/)
