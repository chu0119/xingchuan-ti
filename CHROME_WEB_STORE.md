# Chrome Web Store 上架指南

## 一、上架前准备

### 1. 注册开发者账号
- 访问 https://chrome.google.com/webstore/devconsole
- 用 Google 账号登录
- 支付一次性注册费 **$5 USD**（信用卡）
- 完成开发者身份验证

### 2. 准备材料清单

| 材料 | 状态 | 说明 |
|------|------|------|
| 扩展 zip 包 | ✅ 已有 | `xingchuan-ti-0.6.2-chrome.zip` |
| 商店图标 128x128 | ✅ 已有 | `public/icons/128.png` |
| 宣传截图 | ⚠️ 需拍摄 | 至少 1 张 1280x800 或 640x400 |
| 详细描述 | ✅ 已有 | 见下方 |
| 隐私政策 URL | ✅ 已有 | GitHub Pages 托管 |
| 分类 | - | Developer Tools |

### 3. 启用 GitHub Pages
1. 进入仓库 Settings → Pages
2. Source 选 "Deploy from a branch"
3. Branch 选 `main`，文件夹选 `/docs`
4. 保存后隐私政策 URL 为：`https://chu0119.github.io/xingchuan-ti/privacy`

---

## 二、商店描述（中文）

**名称**：星川威胁情报助手

**简短描述**（132 字符以内）：
> 划词识别 IP/域名/URL/哈希，多源威胁情报加权研判 + 一键跳转国内主流情报平台

**详细描述**：
```
星川威胁情报助手是一款面向安全分析师、SOC 团队和网安从业者的开源浏览器扩展。

🔍 核心功能：
• 划词即查：选中 IP/域名/URL/哈希，自动查询多个威胁情报源
• 多源研判：10 个情报源并行查询，加权综合评分（恶意/可疑/干净）
• 批量查询：粘贴多行 IOC，自动批量查询并导出 CSV
• 一键跳转：19 个国内外情报平台，点击图标直达详情页
• 亮/暗主题：一键切换，支持跟随系统
• 配置导入导出：支持 AES 加密备份

📊 支持的情报源：
VirusTotal、AbuseIPDB、AlienVault OTX、Shodan、GreyNoise、微步在线、urlscan.io、ThreatFox、MalwareBazaar、Censys

🔗 一键跳转平台（19 个）：
国内：微步、奇安信、长亭、腾讯 TIX、360、绿盟、安恒、站长之家、IP138
国外：VirusTotal、AbuseIPDB、OTX、Shodan、Censys、GreyNoise、urlscan.io、SecurityTrails、ThreatFox、MalwareBazaar

🔒 安全与隐私：
• API Key 仅存本地，不上传、不遥测
• 配置导出支持 AES-GCM 加密
• 全部源码开源可审计
• MIT 许可证

📖 开源地址：https://github.com/chu0119/xingchuan-ti
```

---

## 三、商店描述（英文）

**Name**: XingChuan Threat Intelligence

**Short description** (132 chars max):
> Select IP/domain/URL/hash to query multiple threat intelligence sources with weighted scoring + one-click jump to 19 platforms

**Detailed description**:
```
XingChuan Threat Intelligence is an open-source browser extension for security analysts, SOC teams, and cybersecurity professionals.

🔍 Core Features:
• Select & Query: Select IP/domain/URL/hash to automatically query multiple threat intelligence sources
• Multi-source Analysis: 10 intelligence sources queried in parallel with weighted scoring (malicious/suspicious/clean)
• Batch Query: Paste multiple IOCs for batch querying with CSV export
• One-click Jump: 19 domestic and international intelligence platforms, click to view details
• Light/Dark Theme: One-click toggle, supports system preference
• Config Import/Export: AES-encrypted backup support

📊 Supported Intelligence Sources:
VirusTotal, AbuseIPDB, AlienVault OTX, Shodan, GreyNoise, ThreatBook, urlscan.io, ThreatFox, MalwareBazaar, Censys

🔗 One-click Jump Platforms (19):
China: ThreatBook, Qianxin, Chaitin, Tencent TIX, 360, NSFOCUS, DBAPPSecurity, Chinaz, IP138
International: VirusTotal, AbuseIPDB, OTX, Shodan, Censys, GreyNoise, urlscan.io, SecurityTrails, ThreatFox, MalwareBazaar

🔒 Security & Privacy:
• API Keys stored locally only, no upload, no telemetry
• Config export supports AES-GCM encryption
• Fully open source and auditable
• MIT License

📖 Open Source: https://github.com/chu0119/xingchuan-ti
```

---

## 四、上架步骤

### Chrome Web Store
1. 登录 https://chrome.google.com/webstore/devconsole
2. 点击 "New Item"
3. 上传 `xingchuan-ti-0.6.2-chrome.zip`
4. 填写：
   - 商品名称：星川威胁情报助手
   - 简短描述：划词识别 IP/域名/URL/哈希，多源威胁情报加权研判 + 一键跳转
   - 详细描述：粘贴上方中文描述
   - 分类：Developer Tools
   - 语言：中文（简体）
   - 隐私政策 URL：`https://chu0119.github.io/xingchuan-ti/privacy`
5. 上传截图（至少 1 张 1280x800）
6. 上传商店图标（128x128 PNG）
7. 提交审核

### Microsoft Edge Add-ons
1. 登录 https://partner.microsoft.com/dashboard/microsoftedge
2. 点击 "New extension"
3. 上传同一个 zip（Chrome 扩展兼容 Edge）
4. 填写类似信息
5. 提交审核（通常几小时到 1 天）

### Firefox Add-ons
1. 登录 https://addons.mozilla.org/developers/
2. 点击 "Submit a New Add-on"
3. 需要先用 WXT 构建 Firefox 版本：`npm run build -- --browser firefox`
4. 上传 Firefox 版本的 zip
5. 提交审核

---

## 五、审核要点

Chrome Web Store 审核通常关注：

1. **权限合理性**：host_permissions 是否最小化（已收紧到精确 API 路径 ✅）
2. **隐私政策**：必须有，且与实际行为一致（已创建 ✅）
3. **无硬编码 Key**：不能在代码中包含 API Key（已确认 ✅）
4. **无恶意行为**：不能收集用户数据、不能注入广告（已确认 ✅）
5. **描述准确性**：功能描述与实际一致（已确认 ✅）

---

## 六、上架后维护

- **版本更新**：修改 `package.json` 版本号 → `npm run build` → `npm run zip` → 上传新 zip
- **用户反馈**：通过 GitHub Issues 收集
- **统计**：Chrome Web Store 提供安装量、评分等统计
