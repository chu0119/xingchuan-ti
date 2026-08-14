<p align="center">
  <img src="public/icons/128.png" alt="星川威胁情报助手" width="100" height="100">
</p>

<h1 align="center">星川威胁情报助手</h1>

<p align="center">
  <strong>XingChuan Threat Intelligence</strong><br>
  <em>划词识别 IP/域名/URL/哈希，多源威胁情报加权研判 + 一键跳转国内主流情报平台</em>
</p>

<p align="center">
  <a href="https://github.com/chu0119/xingchuan-ti/releases"><img src="https://img.shields.io/badge/version-0.6.0-blue?style=flat-square" alt="version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
  <a href="https://github.com/chu0119/xingchuan-ti/actions"><img src="https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square" alt="tests"></a>
  <a href="https://github.com/chu0119/xingchuan-ti"><img src="https://img.shields.io/badge/Chrome-Manifest%20V3-yellow?style=flat-square" alt="chrome"></a>
  <a href="https://github.com/chu0119/xingchuan-ti"><img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square" alt="typescript"></a>
  <a href="https://github.com/chu0119/xingchuan-ti/releases"><img src="https://img.shields.io/github/downloads/chu0119/xingchuan-ti/total?style=flat-square" alt="downloads"></a>
</p>

---

## 📖 简介

**星川威胁情报助手**是一款面向安全分析师、SOC 团队和网安从业者的开源浏览器扩展。它能**划词识别** IP、域名、URL、文件哈希（MD5/SHA1/SHA256），自动查询多个威胁情报源，给出**加权综合评分**，并支持**一键跳转**到 19 个国内外主流情报平台的详情页。

> 🔍 **一句话**：选中 IOC → 点击查询 → 多源研判 → 一键跳转深入分析

### 为什么做这个工具？

作为安全从业者，日常工作中经常需要在 SIEM 告警、邮件正文、日志终端中看到可疑 IP/域名，然后手动打开 VirusTotal、微步、奇安信等平台逐一查询。这个过程**重复、低效、容易遗漏**。

星川威胁情报助手的目标是：**一个动作完成多源研判，一个面板看到所有结果，一个点击跳到任何平台深入分析**。

---

## ✨ 核心特性

### 🔍 划词即查
选中 IP/域名/URL/哈希，旁边自动出现「🔍 情报查询」浮窗按钮，点击即可聚合多个情报源结果。

<p align="center">
  <img src="docs/images/popup-malicious-light.png" alt="亮色弹窗 - 恶意 IP 研判" width="400">
</p>

### 📊 多源加权研判
10 个情报源并行查询，加权综合评分（恶意/可疑/干净），透明展示每个源的贡献和置信度。

<p align="center">
  <img src="docs/images/popup-malicious-dark.png" alt="暗色弹窗 - 恶意 IP 研判" width="400">
</p>

**评分模型特点**：
- **clean 不稀释恶意**：查无记录不等于安全，不会把恶意源的分数平均拉低
- **确认源数量**：展示"X 源确认恶意"，提高研判置信度可读性
- **权重可调**：设置页可自定义各源权重，适应不同团队的信任偏好
- **verdict 升级告警**：同一 IOC 重新查询时 verdict 恶化，面板顶部高亮提示

### 📦 批量查询
在弹窗输入框粘贴多行 IOC（每行一个），自动进入批量模式，逐个查询并汇总表格，支持导出 CSV。

### 🔗 一键跳转
19 个国内外情报平台，点击图标直达详情页（**无需任何 Key**，人人可用）。

**国内**：微步、奇安信、长亭、腾讯 TIX、360、绿盟、安恒、站长之家、IP138

**国外**：VirusTotal、AbuseIPDB、AlienVault OTX、Shodan、Censys、GreyNoise、urlscan.io、SecurityTrails、ThreatFox、MalwareBazaar

### 🎨 亮/暗主题
一键切换，设置页可选"跟随系统"，适应不同工作环境。

<p align="center">
  <img src="docs/images/options-light.png" alt="设置页 - 亮色" width="780">
</p>

### 📋 配置导入导出
备份/恢复配置，支持导出含/不含 Key（含 Key 文件支持 AES-GCM 密码保护）。

### 🔒 安全优先
- API Key 仅存本地 `chrome.storage.local`，不上传、不遥测、不外发
- 配置导出支持 AES-GCM 加密（含 Key 时）
- API Key 健康检查（页面加载时静默测试，失效时标红提醒）
- Content Security Policy 声明，防止 XSS 攻击
- host_permissions 最小权限原则

---

## 🧩 情报源

支持的指标类型：**IP**（v4/v6）、**域名**、**URL**（自动提取域名查询）、**文件哈希**（MD5/SHA1/SHA256）

### 自动研判（需配置 Key）

| 源 | 类型 | 免费额度 | 备注 |
|---|---|---|---|
| [VirusTotal](https://www.virustotal.com/) | IP + 域名 + 哈希 | 4次/分、500次/天 | Public API |
| [AbuseIPDB](https://www.abuseipdb.com/) | IP | 1000次/天 | 滥用举报置信度 |
| [AlienVault OTX](https://otx.alienvault.com/) | IP + 域名 | 宽松（免费） | Key 可选 |
| [Shodan](https://www.shodan.io/) | IP | 1次/秒 | 富化（端口/漏洞），CVSS 评分 |
| [GreyNoise](https://www.greynoise.io/) | IP | ~50次/周 | 区分扫描器性质 |
| [微步在线](https://x.threatbook.com/) | IP + 域名 | ~10次/天 + 100次/月 | 国内唯一明确免费 |
| [urlscan.io](https://urlscan.io/) | IP + 域名 + URL | ~100次/天 | 免费，Key 可选（提高限额） |
| [ThreatFox](https://threatfox.abuse.ch/) | IP + 域名 + URL + 哈希 | 免费 | C2 IOC 质量极高，需 Auth-Key |
| [MalwareBazaar](https://bazaar.abuse.ch/) | 哈希 + 域名 | 免费 | 恶意样本关联，需 Auth-Key |
| [Censys](https://search.censys.io/) | IP | 免费层有额度 | 与 Shodan 互补，需 API Key |

### 一键跳转（无需 Key）

19 个平台，点击图标直达详情页。SPA 平台没有公开直链，退化为打开搜索首页。

---

## 🚀 快速开始

### 安装

1. **下载**：从 [Releases](https://github.com/chu0119/xingchuan-ti/releases) 下载最新 `xingchuan-ti-x.x.x-chrome.zip`
2. **解压**：解压到任意目录
3. **加载**：Chrome 打开 `chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择解压后的目录

### 配置 API Key

1. 点击扩展图标 → ⚙ 设置
2. 在各情报源下填入你的 API Key（设置页内置**分步申请指引**）
3. 修改自动保存，无需点保存按钮

### 使用

- **划词查询**：选中 IP/域名/URL/哈希 → 点击浮窗按钮
- **右键查询**：选中文本 → 右键 →「威胁情报查询」
- **工具栏**：点击扩展图标 → 输入框查询（支持多行批量查询）
- **键盘快捷键**：Ctrl+Shift+Y（Mac: Cmd+Shift+Y）查询当前选中文本
- **批量查询**：在弹窗输入框粘贴多行 IOC（每行一个），自动进入批量模式
- **导出 CSV**：批量查询结果页点击「导出 CSV」按钮

---

## 🏗️ 技术架构

```
xingchuan-ti/
├── entrypoints/          # WXT 入口
│   ├── background.ts     # 编排器：并发查源 + 限流 + 缓存 + 加权评分 + 通知
│   ├── content.ts        # 划词检测 + 浮动按钮 + Shadow DOM 面板
│   ├── popup/            # 工具栏弹窗（查询/研判/历史/配额）
│   └── options/          # 设置页（配置/指引/导入导出/健康检查）
├── src/
│   ├── adapters/         # 统一 Adapter 接口 + 10 个情报源适配器
│   ├── lib/              # 核心库：detect/storage/score/platforms/rateLimit/cache/http/messaging/history/clipboard/guides
│   └── ui/               # 渲染层：panel(结果面板) + css(设计系统) + dom(工具函数) + theme
├── public/icons/         # 扩展图标 + 19 个平台 favicon
├── scripts/              # 构建脚本：图标抓取、截图
└── test/                 # 测试：逻辑单测 + 适配器单测 + 真实 Key 联网 + E2E + 配置 + 批量
```

**技术栈**：WXT + TypeScript + 原生 CSS（无框架依赖）

**设计原则**：
- **可审计**：全部源码开源，无框架黑盒
- **最小依赖**：原生 TS + CSS，供应链攻击面最小化
- **隐私优先**：零遥测，Key 仅本地存储
- **模块化**：每个情报源一个适配器文件，新增源只需写一个文件 + 注册

---

## 🧪 测试

```bash
npm test                # 逻辑单测（识别/评分/跳转/IPv6/URL/哈希）- 88 个
npm run test:adapters   # 适配器解析单测 + OTX 真实联网 - 17 个
npm run test:e2e        # 真实扩展端到端（需桌面 GUI）- 5 个场景
npm run test:popup      # 弹窗输入框数量验证
npm run test:config     # 配置导入/导出 E2E
npm run test:batch      # 批量查询 E2E
npm run test:live       # 真实 Key 联网（VT_KEY=xxx npm run test:live）
npm run typecheck       # TypeScript 类型检查
```

**测试覆盖**：
- 88 个逻辑单测（识别/评分/跳转/IPv6/URL/哈希）
- 17 个适配器单测（6 个源解析 + OTX 真实联网）
- 5 个 E2E 场景（popup + 内容面板 + 输入框选区 + 图标加载 + 恶意IP评分）
- 配置导入导出 E2E（含/不含 Key + 非法文件校验）
- 批量查询 E2E（3 个 IOC，验证汇总表格）
- 真实 Key 联网测试（VT/OTX/Shodan，clean 与恶意两路径）

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

1. 在 `src/adapters/` 下创建新文件，实现 `Adapter` 接口
2. 在 `src/adapters/index.ts` 中注册
3. 在 `src/lib/storage.ts` 的 `DEFAULT_SETTINGS` 中添加默认配置
4. 在 `src/lib/platforms.ts` 中添加跳转配置（如有 web 页面）
5. 在 `wxt.config.ts` 的 `host_permissions` 中添加 API 域名
6. 添加适配器单测
7. 更新 README 的情报源列表

---

## 🔒 安全与隐私

- **API Key 仅保存在本地** `chrome.storage.local`，不上传、不遥测、不外发
- **不收集任何查询记录**（缓存仅存 `chrome.storage.session`，关闭浏览器即清）
- **全部源码可审计**；本扩展不内置任何有效 Key
- **配置导出**：支持导出含/不含 Key（含 Key 文件支持 AES-GCM 密码保护）
- **API Key 健康检查**：页面加载时静默测试各 Key 有效性，失效时设置页标红提醒
- **Content Security Policy**：manifest 中显式声明严格 CSP，防止 XSS 攻击
- **host_permissions 最小权限**：仅请求各情报 API 的精确路径，而非整个域名

---

## 🆚 与同类工具对比

| 特性 | 星川威胁情报助手 | 微步在线浏览器扩展 | VirusTotal 浏览器扩展 |
|---|---|---|---|
| **多源聚合** | ✅ 10 个源并行查询 | ❌ 仅微步 | ❌ 仅 VT |
| **加权综合评分** | ✅ 可调权重 | ❌ | ❌ |
| **国内平台覆盖** | ✅ 9 个平台 | ✅ 仅微步 | ❌ |
| **一键跳转** | ✅ 19 个平台 | ❌ | ❌ |
| **批量查询** | ✅ 多行粘贴 + CSV 导出 | ❌ | ❌ |
| **URL/哈希识别** | ✅ MD5/SHA1/SHA256 | ❌ | ✅ 仅哈希 |
| **亮/暗主题** | ✅ 跟随系统 | ❌ | ❌ |
| **配置导入导出** | ✅ AES 加密 | ❌ | ❌ |
| **开源可审计** | ✅ MIT 许可证 | ❌ | ❌ |
| **隐私保护** | ✅ 零遥测 | ❌ | ❌ |
| **API Key 健康检查** | ✅ | ❌ | ❌ |
| **verdict 升级告警** | ✅ | ❌ | ❌ |
| **桌面通知** | ✅ 恶性 verdict 通知 | ❌ | ❌ |

---

## ⚖️ 免责声明

仅供安全研究与授权分析使用。各情报平台 API 有各自的服务条款（如 VirusTotal Public API 不得用于商业产品），使用前请阅读并遵守。判定结果仅供参考，最终判断请结合多方情报与上下文。

## 📄 许可证

[MIT](LICENSE)

## 🙏 致谢

- [WXT](https://wxt.dev/) - 现代浏览器扩展开发框架
- [VirusTotal](https://www.virustotal.com/) - 恶意软件分析平台
- [AbuseIPDB](https://www.abuseipdb.com/) - IP 滥用举报数据库
- [AlienVault OTX](https://otx.alienvault.com/) - 开源威胁情报社区
- [Shodan](https://www.shodan.io/) - 互联网设备搜索引擎
- [GreyNoise](https://www.greynoise.io/) - 互联网噪声分析
- [微步在线](https://x.threatbook.com/) - 国内威胁情报平台
- [urlscan.io](https://urlscan.io/) - 网站扫描分析平台
- [ThreatFox](https://threatfox.abuse.ch/) - C2 IOC 数据库
- [MalwareBazaar](https://bazaar.abuse.ch/) - 恶意样本数据库
- [Censys](https://search.censys.io/) - 互联网扫描搜索引擎
