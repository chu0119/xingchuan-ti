# 威胁情报助手 浏览器扩展 — 设计文档

> 开源浏览器扩展：划词识别 IP / 域名 → 多源威胁情报聚合研判 + 一键跳转国内主流情报平台详情页。
> 面向网安从业者，用户自行配置 API Key，零硬编码、零遥测。

---

## 1. 目标与两大核心能力

| 能力 | 说明 | 是否需要 Key |
|---|---|---|
| **A. 自动研判** | 划词识别 IP/域名 → service worker 并发查询已配置的情报源 → 加权综合评分 + 各源明细 | 各源需用户自配 Key |
| **B. 一键跳转** | 面板里一排平台图标，点击在新标签打开对应详情页 | **无需 Key**，人人可用 |

两者解耦：B 永远可用；A 取决于用户配置了哪些源的 Key。

---

## 2. 关键事实与约束（2026 调研结论）

**国内平台几乎都没有"个人免费 API"：**
- ✅ 微步在线：唯一有明确个人免费额度（~10次/天 + 100次/月），`apikey` 鉴权最简单 → 自动研判主力国内源
- ⚠️ 长亭百川云 / 奇安信 ALPHA：有公开 token/API，额度未公开，用户自行注册确认
- ❌ 腾讯 / 360 / 绿盟 / 安恒：只有网页查询，无个人免费 API → 仅做"一键跳转"

**真正免费好聚合的 API 在国外：**
VirusTotal（500次/天）、AbuseIPDB（1000次/天，仅 IP）、AlienVault OTX（宽松）、Shodan、GreyNoise、urlscan.io、SecurityTrails、Censys。

**架构硬约束：**
1. **MV3**：所有情报 API 调用必须从 background service worker 发起（`host_permissions` 绕过 CORS），content script / 普通页面直连必被拦。
2. **Key 安全**：API Key 由用户在设置页自填，存 `chrome.storage.local`，**严禁硬编码进开源仓库**。
3. **不可编程打开 popup**（MV3 限制）：结果展示走「content script 内嵌面板」+「popup 内复用同一渲染逻辑」两条入口，右键菜单触发也落到内嵌面板。

---

## 3. 用户决策（已确认）

- 触发方式：**划词浮窗 + 右键菜单 + 工具栏弹窗**
- 研判展示：**加权综合评分**（透明展示各源贡献）
- 研判来源：**国外免费源（VT/AbuseIPDB/OTX/Shodan/GreyNoise）+ 微步**

---

## 4. 技术选型

| 维度 | 选型 | 理由 |
|---|---|---|
| 扩展框架 | **WXT** | 处理 MV3 manifest/entrypoints/HMR，省去手写打包样板 |
| 语言 | **TypeScript** | 适配器/类型安全 |
| UI | **原生 TS + 原生 CSS（无框架、无 Tailwind）** | 安全工具需可审计、依赖少、易读；避免 Vue/React 黑盒 |
| 浏览器 | Chromium MV3（Chrome/Edge/Brave） | MV2 已淘汰；Firefox 后续兼容 |

> 选原生而非框架：本扩展处理 API Key，**可审计性与最小依赖**比 UI 开发效率更重要。

---

## 5. 架构分层

```
┌──────────────────────────────────────────────────────────────┐
│ 入口层（entrypoints）                                          │
│  content.ts ── 划词检测 + 浮动按钮 + 内嵌结果面板               │
│  background.ts ── 编排器：并发查源、限流、加权评分、右键菜单、消息中枢 │
│  popup/ ── 工具栏弹窗（取当前选中文本/手输，复用渲染）            │
│  options/ ── 设置页（各源 Key + 开关 + 权重）                    │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ 核心库（src/lib）                                              │
│  detect.ts ── IP/域名识别   storage.ts ── 设置读写             │
│  platforms.ts ── 跳转注册表   score.ts ── 加权聚合            │
│  rateLimit.ts ── 每源配额/节流   cache.ts ── 短时缓存          │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ 适配器（src/adapters）—— 统一接口，每源一个文件                  │
│  virustotal / abuseipdb / otx / shodan / greynoise / threatbook │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. IP / 域名识别（detect.ts）

- **IPv4**：标准正则（含边界，避免匹配版本号如 1.2.3.4 误判；用合法段校验 0-255）
- **域名 / FQDN**：含至少一个点、TLD 段为字母；过滤纯数字段
- **优先级**：选中文本 → 去首尾空白/协议头 → 先试 IP，再试域名
- 后续扩展：IPv6、URL、文件 Hash、CVE

选中多值时（如日志里一段含多个 IP），v1 取第一个可识别项，面板里提供"下一个"切换。

---

## 7. 适配器规范（src/adapters/types.ts）

```ts
type IndicatorType = 'ip' | 'domain';
type Verdict = 'malicious' | 'suspicious' | 'clean' | 'unknown';

interface QueryResult {
  source: string;            // 源 id
  verdict: Verdict;
  score: number | null;      // 0-100 原始分（若有）
  summary: string;           // 一句话结论
  tags: string[];            // 标签：如 botnet, scanner, phishing
  detailsUrl: string;        // 该源详情页（跳转）
  raw?: unknown;             // 原始返回（调试/展开）
  error?: string;            // 出错信息
}

interface Adapter {
  id: string;
  name: string;
  supports: IndicatorType[];
  requiresKey: boolean;
  rateLimit: { perDay?: number; perMin?: number };
  query(type: IndicatorType, value: string, key: string): Promise<QueryResult>;
}
```

**首版适配器（来自调研的端点/鉴权/限流）：**

| 源 | 类型 | 端点 | 鉴权 | 免费限流 |
|---|---|---|---|---|
| VirusTotal | ip+domain | `/api/v3/ip_addresses/{ip}`、`/domains/{d}` | `x-apikey` 头 | 4/min, 500/天 |
| AbuseIPDB | ip | `/api/v2/check?ipAddress={ip}` | `Key` 头 | 1000/天 |
| AlienVault OTX | ip+domain | `/api/v1/indicators/{type}/{v}/general` | `X-OTX-API-KEY` 头 | 宽松 |
| Shodan | ip | `/shodan/host/{ip}` | `key` 参数 | 1/s（富化为主） |
| GreyNoise | ip | `/v3/community/ip?q={ip}` | `key` 头 | 50/周 |
| 微步 ThreatBook | ip(+domain) | `/v3/scene/ip_reputation?apikey=&resource=` | `apikey` 参数 | ~10/天 |

**判定映射**：每源把自有字段归一到 `{verdict, score, tags}`。
- VT：`last_analysis_stats.malicious` 数 → 阈值判定
- AbuseIPDB：`abuseConfidenceScore`（0-100）+ `totalReports`
- OTX：相关 pulse 数 / 标签
- Shodan：开放端口/已知漏洞（富化，权重低）
- GreyNoise：`classification`（malicious/benign/unknown）
- 微步：`judgments` / `confidence` / `tags_classes`

---

## 8. 跳转注册表（src/lib/platforms.ts · B 功能）

```ts
interface Platform {
  id: string; name: string; region: 'cn' | 'intl';
  supports: ('ip'|'domain')[];
  buildUrl(type, value): string;   // 不支持的类型返回 null/隐藏
  color: string; icon?: string;     // 文字图标兜底
}
```

**国内**：微步（直链）、奇安信（直链）、长亭（直链）、腾讯 TIX（SPA 首页）、360（SPA 首页）、绿盟（SPA 首页）、安恒（SPA 首页）、chinaz（IP/同 IP/WHOIS）、IP138
**国外**：VirusTotal、AbuseIPDB、AlienVault OTX、Shodan、Censys、GreyNoise、urlscan.io、SecurityTrails

URL 模板已核实（见调研）。SPA 平台打开其搜索首页。

---

## 9. 加权评分模型（src/lib/score.ts）

- 各源归一后映射基准分：malicious=100、suspicious=50、clean=0、unknown=不参与
- 默认权重（设置页可调）：微步 1.5、VT 1.5、AbuseIPDB 1.2、OTX 1.0、GreyNoise 1.0、Shodan 0.8（富化）
- 综合 = Σ(基准分×权重) / Σ(参与源权重)
- 标签：≥66 恶意(红) / 33–66 可疑(黄) / <33 低风险(绿) / 无数据 灰
- 面板**透明展示**每个参与源及其贡献，不黑箱

---

## 10. 安全与隐私

- API Key 仅存本地 `chrome.storage.local`，不上传、不遥测、不外发
- 不收集任何查询记录（缓存仅存内存/`storage.session`，关闭即清）
- 开源、可审计；README 明确各源 ToS（如 VT Public API 不得商用）
- 仅请求必要 `host_permissions`（各 API 域名 + 详情页域名用于跳转可省略）

---

## 11. 目录结构

```
zaichajian/
├── package.json  wxt.config.ts  tsconfig.json
├── design.md  plan.md  README.md  LICENSE
├── entrypoints/
│   ├── background.ts        # 编排器 + 右键菜单 + 消息中枢
│   ├── content.ts           # 划词检测 + 浮动按钮 + 内嵌面板
│   ├── popup/{index.html,main.ts,style.css}
│   └── options/{index.html,main.ts,style.css}
├── src/
│   ├── lib/{detect,storage,platforms,score,rateLimit,cache,messaging}.ts
│   ├── adapters/{types,virustotal,abuseipdb,otx,shodan,greynoise,threatbook}.ts
│   └── ui/{panel.ts,dom.ts}     # 渲染逻辑（面板/popup 复用）
└── assets/icons/                # 扩展图标 + 平台文字图标
```

---

## 12. 里程碑

| 阶段 | 产出 | 验收 |
|---|---|---|
| M0 脚手架 | WXT+TS 工程，能 `dev`/`build` 出可加载扩展 | Chrome 加载成功，图标可见 |
| M1 识别+设置 | detect + storage + options 页 | 能识别选中文本、保存 Key |
| M2 适配器+编排 | 6 个适配器 + 并发编排 + 限流 | 单元测试归一化逻辑 |
| M3 评分+渲染 | score + 面板 UI | 多源聚合显示评分与明细 |
| M4 三入口 | 划词浮窗 + 右键菜单 + popup | 三种触发都出结果 |
| M5 跳转 | platforms 注册表 + 图标行 | 点击跳各平台详情页 |
| M6 打磨 | 缓存/限流提示/错误/README | 打包 zip 可分发 |

---

## 13. 未来扩展

IPv6 / URL / Hash / CVE 识别；Firefox 兼容；英文 i18n；结果导出；批量查询；长亭/奇安信 API 作为可选源接入。
