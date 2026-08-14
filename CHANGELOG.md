# 更新日志

本文件记录星川威胁情报助手的所有重要变更。

## [0.6.5] - 2026-08-14

### 变更
- **许可证从 MIT 改为 GPLv3**：衍生作品必须以相同协议开源，不得闭源商用（除非获得原作者单独授权）
- README 许可证章节更新：加双重许可说明
- 隐私政策更新许可证声明

## [0.7.0] - 2026-08-14

### 🐛 Bug 修复（H 级 · 严重）
- **H1 消息层零容错**：background `.then` 补 `.catch`，popup/content 每次 `queryBackground` 都判空/判异常，异常不再卡在加载态
- **H2 批量查询不可取消**：引入 `batchSeq` 互斥令牌，新批次启动自动中止旧循环；每轮迭代 + 响应后双重检查令牌
- **H3 rateLimit 读写竞态**：`tryConsume` 改用 `withLock` 写入锁防并发覆盖；查询失败时 `refund` 退配额（Key 无效/断网不浪费每日 500 次）

### 🐛 Bug 修复（M 级 · 中）
- **M1 IPv6 URL 不识别**：`URL_RE` 排除 `[]` 字符 → IPv6 URL（`http://[2001:db8::1]/path`）正确识别；`findIPv6` 分隔符补 `.`/引号避免截断
- **M1 Defanged IOC 还原**：新增 `defang()` 预归一，`evil[.]com` → `evil.com`、`hxxp://` → `http://`；`detectIndicator` 和 `detectAll` 都先走 defang
- **M3 缓存命中丢失升级告警字段**：cache-hit 路径现在也计算并返回 `verdictEscalated`/`lastLabel`
- **M4 VT/GreyNoise 404 优雅处理**：未收录指标（404）返回 `clean`/`unknown`（“未收录该指标”），不再显示红色错误行

### ✨ 新增功能
- **F2 JSON/Markdown 导出 + CSV 补列**：批量查询结果支持三种格式导出（CSV 加 BOM + 时间戳、JSON 结构化、Markdown 报告）；下拉菜单选择格式
- **F3 允许清单（误报抑制）**：设置页新增“允许清单”textarea，每行一个 IP/域名；命中时跳过查询，直接标记为“已标记良性”

### 📝 文档修正
- README 隐私声明修正：缓存存 `session`（关浏览器即清），历史存 `local`（仅本地，用户可随时清空）
- README 对比表许可证修正：MIT → GPLv3

## [0.6.3] - 2026-08-14

### 🐛 Bug 修复（第二轮全面审计，P1×3 + P2×5 + P3×12）

**P1（严重）**：
- **abuse.ch 鉴权失败被静默判"干净"**：ThreatFox/MalwareBazaar 改为白名单式校验（仅 `query_status:'ok'` 或 `no_result` 进入判定），`invalid_auth_key`/`no_auth_key`/`rate_limit` 等一律报错，消除虚假 clean 判定
- **verdict 升级告警是死代码**：background 已计算但 popup/content 均未透传——现已接线到两条前端路径，`.ti-escalation` 告警条可正常出现
- **加密配置导出后无法导入**：补齐 `decryptConfig`（AES-GCM，与导出对称），导入时自动识别加密文件并提示输入密码

**P2（重要）**：
- popup 加载态未传主题参数——暗色主题下查询中闪白，已修复
- content 的 prefers-color-scheme 监听用 `host.querySelector` 穿不进 Shadow DOM（no-op）——改用 `shadow?.querySelector`，auto 主题实时切换生效
- 历史搜索每敲一个字符重建整个筛选栏——焦点丢失、中文输入法被打断；改为筛选栏只建一次、仅重渲染列表
- 设置页"检测所有 Key"用页面加载时的陈旧快照（测的是旧 Key）——改为从输入框实时读取
- `detectAll` 仍对整个 URL 全小写（与 `detectIndicator` 不一致，主路径走 detectAll）——改为仅 hostname 小写，保留路径/查询大小写

**P3（改进）**：
- CSV 导出加 BOM，Excel 打开中文表头不再乱码
- popup 快速连续查询的响应竞态——加请求序号丢弃过期响应
- 批量查询后切换主题会用旧的单查询结果覆盖批量视图——batchQuery 开头清空 `last`
- 恶意桌面通知按指标去重（SW 生命周期内一次），批量查询不再刷屏；promise 补 catch
- 微步适配器检查 `response_code`，Key 无效显式报错（原来显示"无明确判定"）
- MalwareBazaar 移除域名支持（MB 无域名查询能力，tag 查询几乎必空，形成弱假信号），仅保留哈希
- textarea 的 style 字符串被 `h()` 忽略（拖拽手柄/滚动条）——改为对象形式；`spellcheck:'false'` 反转问题修正
- 历史底部提示渲染位置从列表上方移到下方
- popup 触发方式关闭时禁用输入框与查询按钮（原来仍可查询，语义矛盾）
- 查询/回车跳过输入法组合态（`isComposing`）
- 设置页权重输入 clamp（负数/0/NaN 回退默认 1，防止破坏聚合）
- 配额显示删除死变量、查询完成后刷新
- popup 结果区高度 560→430，长结果不再裁切底栏
- 补齐 ThreatFox/MalwareBazaar 平台图标（19/19 全部真实 favicon）

### 🧪 测试
- 27 项真实浏览器全功能实测（full-audit）全部通过
- 逻辑 88 / 适配器 17 / popup / config / batch / close 全绿

## [0.6.2] - 2026-08-14

### 🐛 Bug 修复（P0 级）
- **typechip 显示错误**：URL/Hash 类型现在正确显示 "URL"/"HASH"，不再显示 "DOMAIN"
- **verdictEscalated 竞态**：`addHistory` 改为 `await`，确保写入完成后再返回
- **CSV 导出数据损坏**：实现 `csvEscape` 函数，正确转义逗号/引号/换行
- **btoa 栈溢出**：分块转 base64，避免大数组 spread 超出调用栈限制
- **Shodan Key 暴露**：从 URL 查询参数改为 `X-Shodan-Key` header

### 🐛 Bug 修复（P1 级）
- **暗色主题加载/提示硬编码**：`renderLoading`/`renderHint` 改为接受 theme 参数
- **URL 强制小写化**：只对 hostname 小写化，保留路径/查询参数大小写
- **urlscan detailsUrl 错误**：从 API 端点改为 `/result/` 用户界面

### 🐛 Bug 修复（P2 级）
- **关闭按钮暗色不可见**：改用 CSS 变量 `var(--chipbg)`/`var(--muted)`
- **设置页 checkKeyHealth 浪费配额**：改为手动触发按钮
- **内容脚本注入范围**：从 `<all_urls>` 改为 `http://*/*` 和 `https://*/*`
- **ThreatFox/MalwareBazaar queryStatus 检查不完整**：增加 `illegal_search_term`/`rate_limit` 处理
- **跳转 tooltip 暗色主题背景硬编码**：改为 CSS 变量 `var(--fg)`/`var(--bg)`
- **历史记录上限 100 无 UI 提示**：在历史视图底部显示提示
- **配置导入未验证字段类型/范围**：添加基本验证（weight>0、theme合法等）

### 🐛 Bug 修复（P3 级）
- **过期缓存未清理**：`getCached` 发现过期时删除
- **detectAll 中 HASH_RE 全局正则改为局部**：避免 lastIndex 状态问题
- **IPV4_SUB 无 word boundary**：添加 `\b` 避免匹配版本号
- **popup 触发方式关闭时显示提示**
- **导入配置后 skipAutoSave 恢复逻辑完善**
- **设置页自动保存提示防闪烁**：500ms 防抖 + 2 秒后清除
- **配额显示区域加 title 属性**：悬停显示完整信息
- **内容脚本面板跟随系统主题变化实时切换**（auto 模式下）

## [0.6.1] - 2026-08-14

### 📝 文档
- **README 全面重写**：专业徽章、项目简介、核心特性、情报源表格、技术架构、测试覆盖、同类工具对比
- **截图更新**：弹窗亮/暗、设置页、批量查询等高质量截图
- **差异化对比表**：与微步在线、VirusTotal 浏览器扩展的功能对比

### 🧪 验证
- 全面真实浏览器验证：typecheck + 88 逻辑测试 + 17 适配器测试 + 5 E2E 场景 + 配置导入导出 + 批量查询
- 真实 Key 联网测试（VT/OTX/Shodan）

## [0.6.0] - 2026-08-14

### 🔧 安全加固
- **host_permissions 收紧**：从 `https://www.virustotal.com/*` 收紧为 `https://www.virustotal.com/api/v3/*`，遵循最小权限原则
- **Content Security Policy 声明**：manifest 中显式声明严格 CSP，防止 XSS 攻击
- **配置导出加密**：含 Key 的导出文件支持 AES-GCM 密码保护（Web Crypto API）
- **API Key 健康检查**：页面加载时静默测试各 Key 有效性，失效时输入框标红提醒

### 🧪 测试
- 逻辑单测 88 个全过
- 构建产物 158.47 kB

## [0.5.0] - 2026-08-14

### ✨ 新增
- **urlscan.io API 接入**：免费无需 Key（Key 可选提高限额），支持 IP+域名+URL，返回扫描结果和恶意标记
- **ThreatFox (abuse.ch) 接入**：免费需 Auth-Key（注册获取），C2 IOC 质量极高，支持 IP+域名+URL+哈希
- **MalwareBazaar (abuse.ch) 接入**：免费需 Auth-Key（注册获取），恶意样本关联，支持哈希+域名
- **Censys API 接入**：免费层有额度，与 Shodan 互补，需 API Key

### 🔧 改进
- 情报源从 6 个增至 10 个
- urlscan 默认开启（免费无需 Key），ThreatFox/MalwareBazaar/Censys 默认关闭（需配置 Key）
- 跳转平台新增 ThreatFox、MalwareBazaar
- README 情报源列表更新

### 🧪 测试
- 逻辑单测增至 88 个
- 跳转携带指标回归测试覆盖新平台

## [0.4.0] - 2026-08-14

### ✨ 新增
- **键盘快捷键**：Ctrl+Shift+Y（Mac: Cmd+Shift+Y）查询当前选中文本的威胁情报
- **恶性 verdict 桌面通知**：查询结果为恶意时，浏览器通知提醒（可在设置里关闭）
- **verdict 升级告警**：同一 IOC 重新查询时 verdict 恶化（clean→suspicious/malicious），面板顶部高亮提示
- **查询历史增强**：按 verdict/类型筛选、搜索、批量导出 CSV
- **配额使用可视化**：popup 底部显示各源当日已用/剩余配额

### 🔧 改进
- 查询历史容量从 50 增至 100
- 历史记录保留上次 verdict（用于升级告警）
- 设置页新增通知开关（默认开启）
- manifest 新增 `notifications` 权限

### 🧪 测试
- 逻辑单测 82 个全过
- 批量查询 E2E 通过

## [0.3.0] - 2026-08-14

### 🔧 改进
- **VT 判定阈值调整**：malicious >= 3 降至 >= 2，细化分数梯度（2-5 个引擎=50-90 分，6+个=70-100 分）
- **Shodan 评分引入 CVSS**：高危 CVE >= 7 判 malicious，中危 4-6.9 判 suspicious，低危/无=clean
- **确认源数量维度**：综合分旁边展示"X 源确认恶意/可疑"，提高研判置信度可读性
- **OTX 评分优化**：结合 pulse 质量（subscriber_count），高质量 pulse（订阅者多）加权

### 🧪 测试
- 逻辑单测增至 82 个（flagCount/cleanCount 字段验证）

## [0.2.0] - 2026-08-14

### ✨ 新增
- **微步域名查询**：threatbook.ts 支持域名查询（端点 `/v3/domain/query`），国内最有价值的情报源之一
- **URL 指标识别**：detect.ts 支持完整 URL 识别（含协议/路径），从 URL 提取域名后查询各源
- **文件哈希识别与查询**：detect.ts 支持 MD5/SHA1/SHA256 识别，VT 适配器支持哈希查询（端点 `/v3/files/{hash}`）
- **批量 IOC 查询**：popup 输入框改为 textarea，支持多行粘贴，自动进入批量模式，逐个查询并汇总表格
- **批量结果导出 CSV**：批量查询结果页点击「导出 CSV」按钮，导出类型/值/判定/分数/错误

### 🔧 改进
- **VT 适配器扩展**：支持 `hash` 类型查询，detailsUrl 指向哈希详情页
- **跳转注册表扩展**：VT 支持 `hash` 类型跳转（`/gui/file/{hash}`），URL 类型从 URL 提取域名后跳转
- **评分逻辑**：URL 类型查询从 URL 提取域名后查询各源，评分逻辑与域名相同
- **识别逻辑**：`detectAll` 支持 URL 和哈希提取，URL 内的域名自动去重

### 🧪 测试
- 逻辑单测增加至 79 个（URL 识别、哈希识别、VT 哈希跳转、detectAll URL/哈希提取）
- 新增批量查询 E2E 测试（`npm run test:batch`）
- 更新 popup 输入框验证（textarea 替代 input）

## [0.1.0] - 2026-08-14

### ✨ 新增
- **多源威胁情报研判**：6 个情报源并行查询，加权综合评分
- **一键跳转**：17 个国内外情报平台，点击图标直达详情页
- **划词即查**：选中 IP/域名，浮窗按钮查询
- **右键菜单**：选中文本，右键查询
- **工具栏弹窗**：手动输入查询
- **亮/暗主题**：一键切换，支持跟随系统
- **配置导入导出**：备份/恢复配置，支持导出含/不含 Key
- **IPv6 识别**：支持纯 IPv6、URL 内 `[::]`、文本提取
- **输入框选区**：支持从 `<input>/<textarea>` 内选中 IP 查询
- **可拖动面板**：内容面板支持拖动调整位置
- **多指标切换**：选中多个 IP 时，面板支持 ◀▶ 切换
- **复制/刷新**：一键复制 IOC，刷新绕过缓存
- **最近查询历史**：二级页面查看历史记录
- **平台图标**：17 个平台真实 favicon，打包进插件
- **API 申请指引**：设置页内置各平台分步申请说明

### 🔧 改进
- **评分逻辑重写**：clean（查无记录）不再稀释恶意分数
- **跳转链接全面实测**：360/绿盟/腾讯/安恒等平台补带参直链
- **选区检测优化**：同步处理，避免异步竞态导致不显示
- **图标加载修复**：MV3 `web_accessible_resources` 声明，解决盾牌回退
- **右键菜单同步**：随"触发方式"设置增删
- **键盘选区**：Shift+方向键触发查询

### 🐛 修复
- 弹窗出现两个输入框（遗留 HTML 清理）
- 暗色模式黑底黑字（主题变量全面修复）
- Shodan 403 会员限制优雅处理（非报错）
- OTX 端点修复（IPv4/IPv6 大写类型）
- AbuseIPDB 申请链接修复（`/account` + API 标签步骤）
- 设置页权重标签误导（改为"越大对综合评分影响越大"）
- AbuseIPDB 死参数清理（`verbose: ''`）
- 键盘选区监听过宽（限定为 Shift+方向键）

### 🧪 测试
- 逻辑单测：30 个（识别/评分/跳转/IPv6）
- 适配器单测：17 个（6 个源解析 + OTX 真实联网）
- 真实扩展 E2E：popup + 内容面板 + 输入框选区 + 图标加载
- 配置导入导出 E2E：含/不含 Key + 非法文件校验
- 弹窗输入框数量验证
- 真实 Key 联网测试（VT/OTX/Shodan）
