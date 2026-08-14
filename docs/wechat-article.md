# 星川威胁情报助手：我做了一个开源浏览器插件，让安全分析师划词就能查威胁情报

> 做安全的兄弟们，你们有没有遇到过这种场景：SIEM 告警弹出来一个可疑 IP，你得手动打开 VirusTotal、微步、奇安信、360……一个一个粘贴查询，然后再综合判断。一天查几十个 IOC，光复制粘贴就累得够呛。
>
> 我做了一个浏览器插件，把这件事变成了**划词、点击、搞定**。

---

## 🎯 一句话介绍

**星川威胁情报助手**是一款开源浏览器扩展，选中任意网页上的 IP / 域名 / URL / 文件哈希，自动聚合 10 个威胁情报源给出加权评分，一键跳转 19 个情报平台查看详情。

---

## 🔍 三种触发方式，怎么顺手怎么来

**① 划词浮窗**：选中 IP 或域名，旁边自动出现「🔍 情报查询」按钮，点击即查。

**② 右键菜单**：选中文本 → 右键 →「威胁情报查询」。

**③ 工具栏弹窗**：点扩展图标，输入框支持多行粘贴，批量查询后一键导出 CSV。

**④ 键盘快捷键**：Ctrl+Shift+Y，选中文本直接查。

---

## 📊 10 个情报源并行查询，加权综合评分

| 情报源 | 免费额度 | 特色 |
|--------|----------|------|
| VirusTotal | 500 次/天 | 全球最大恶意软件分析平台 |
| AbuseIPDB | 1000 次/天 | IP 滥用举报数据库 |
| AlienVault OTX | 免费 | 开源威胁情报社区 |
| Shodan | 免费 | 互联网设备搜索引擎，端口/漏洞富化 |
| GreyNoise | 50 次/周 | 区分扫描器性质（恶意/良性） |
| 微步在线 | 10 次/天 | 国内唯一明确免费的情报 API |
| urlscan.io | 100 次/天 | 网站扫描分析 |
| ThreatFox | 免费 | C2 IOC 质量极高 |
| MalwareBazaar | 免费 | 恶意样本关联 |
| Censys | 免费层 | 与 Shodan 互补 |

**评分逻辑**：每个源的判定结果归一化后按权重加权平均。重点是——**查无记录（clean）不会把恶意源的分数拉低**。你想想，一个 IP 只被 OTX 判定为恶意，被 Shodan 判定为"无定性"（不是恶意也不是安全），综合评分应该是恶意，而不是被平均成可疑。

而且每个源的贡献都透明展示，不黑箱。

---

## 🔗 一键跳转 19 个平台

研判完了，想深入分析？点一下图标就跳转到对应平台的详情页：

**国内**：微步、奇安信、长亭、腾讯 TIX、360、绿盟、安恒、站长之家、IP138

**国外**：VirusTotal、AbuseIPDB、AlienVault OTX、Shodan、Censys、GreyNoise、urlscan.io、SecurityTrails、ThreatFox、MalwareBazaar

每个平台用真实品牌图标，鼠标悬停显示平台名。跳转功能**不需要任何 API Key**，人人都能用。

---

## 📦 批量查询 + CSV 导出

接到一个安全事件，日志里有 15 个 IP、8 个域名要查？

直接粘贴到弹窗输入框（每行一个），自动进入批量模式，逐个查询后汇总成表格，点击行查看详情，点「导出 CSV」直接拿走写报告。

---

## 🎨 亮/暗主题，一键切换

支持亮色、暗色、跟随系统三种模式。夜班值守用暗色护眼，白天用亮色清晰。

---

## 🔒 安全设计，零遥测

做安全工具的，自己不安全说不过去：

- **API Key 仅存本地**，不上传、不遥测、不外发
- **查询记录不持久化**，关闭浏览器即清
- **配置导出支持 AES-GCM 加密**，设密码保护你的 Key
- **host_permissions 最小权限**，精确到 API 路径
- **Content Security Policy 声明**，防 XSS
- **全部源码开源**，GPLv3 许可证，任何人可以审计

---

## 📸 界面预览

弹窗查询结果（亮色）：

![亮色弹窗](https://raw.githubusercontent.com/chu0119/xingchuan-ti/main/docs/images/popup-malicious-light.png)

弹窗查询结果（暗色）：

![暗色弹窗](https://raw.githubusercontent.com/chu0119/xingchuan-ti/main/docs/images/popup-malicious-dark.png)

---

## 🚀 安装方式

### Edge 浏览器（推荐，一键安装）

👉 [点击安装 Edge 扩展](https://microsoftedge.microsoft.com/addons/detail/%E6%98%9F%E5%B7%9D%E5%A8%81%E8%83%81%E6%83%85%E6%8A%A5%E5%8A%A9%E6%89%8B/bkbnepnebjjecbmdbliehglcknmenoal)

### Chrome / 360 / 其他 Chromium 浏览器（手动加载）

1. 从 [GitHub Releases](https://github.com/chu0119/xingchuan-ti/releases) 下载最新 zip
2. 解压到任意目录
3. 打开 `chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择解压目录

### 配置 API Key

点扩展图标 → ⚙ 设置 → 每个源下面都有**详细的申请指引**（含注册链接、步骤、免费额度说明）。

OTX 免费且不需要 Key，装上就能用。

---

## 🛠️ 技术架构（给开发者看的）

- **框架**：WXT（现代浏览器扩展框架，MV3）
- **语言**：TypeScript，无 Vue/React 依赖（安全工具可审计）
- **测试**：88 个逻辑单测 + 17 个适配器测试 + 27 项真实浏览器全功能 E2E
- **许可证**：GPLv3（衍生作品必须开源，不得闭源商用）
- **开源地址**：https://github.com/chu0119/xingchuan-ti

项目结构清晰，每个情报源一个适配器文件，新增源只需写一个文件 + 注册。欢迎 PR。

---

## 🆚 与同类工具对比

| 特性 | 星川威胁情报助手 | 微步浏览器扩展 | VirusTotal 扩展 |
|------|:---:|:---:|:---:|
| 多源聚合 | ✅ 10 个源 | ❌ 仅微步 | ❌ 仅 VT |
| 国内平台覆盖 | ✅ 9 个 | ✅ 仅微步 | ❌ |
| 一键跳转 | ✅ 19 个平台 | ❌ | ❌ |
| 批量查询 + CSV | ✅ | ❌ | ❌ |
| URL / 哈希识别 | ✅ | ❌ | ✅ 仅哈希 |
| 开源可审计 | ✅ GPLv3 | ❌ | ❌ |
| 零遥测 | ✅ | ❌ | ❌ |
| 配置导入导出 | ✅ AES 加密 | ❌ | ❌ |

**说白了，市面上没有一款工具能同时满足：多源聚合 + 国内外平台覆盖 + 开源可审计 + 零遥测。所以我做了这个。**

---

## 💬 最后

这个工具是我在日常工作中的"痒点"驱动做出来的。做安全的人每天都在查 IOC，但现有工具要么只覆盖单一平台，要么不开源，要么收集你的查询数据。

我希望能有一个工具：**多源聚合、开源透明、隐私优先**。

现在它来了。

如果你觉得有用，给个 ⭐ GitHub Star 吧：https://github.com/chu0119/xingchuan-ti

有问题、建议、想加新情报源，欢迎提 Issue 或 PR。

---

**相关链接**

- 🏠 GitHub：https://github.com/chu0119/xingchuan-ti
- 📦 Edge 商店：https://microsoftedge.microsoft.com/addons/detail/星川威胁情报助手/bkbnepnebjjecbmdbliehglcknmenoal
- 📥 下载：https://github.com/chu0119/xingchuan-ti/releases
- 📋 许可证：GPLv3
