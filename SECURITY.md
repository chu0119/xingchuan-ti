# 安全政策

## 报告漏洞

如果你发现安全漏洞，请**不要**在公开 Issue 中报告。请通过以下方式联系我们：

- 邮箱：[待补充]
- GitHub Security Advisories：[创建私有报告](https://github.com/xingchuan/xingchuan-ti/security/advisories/new)

## 安全设计原则

### API Key 安全

- **仅本地存储**：所有 API Key 保存在 `chrome.storage.local`，不上传、不遥测、不外发
- **不硬编码**：开源代码中不包含任何有效 Key
- **导出保护**：配置导出支持"不含 Key"选项，避免敏感信息泄露

### 数据隐私

- **不收集用户数据**：不收集查询记录、使用统计、个人信息
- **本地缓存**：查询结果缓存在 `chrome.storage.session`，关闭浏览器即清
- **无远程服务器**：所有查询直接从浏览器发往各情报平台 API

### 代码安全

- **无框架依赖**：原生 TypeScript + CSS，减少供应链攻击面
- **可审计**：全部源码开源，可自行审查
- **最小权限**：仅请求必要的 `host_permissions`（各情报 API 域名）

## 支持的版本

| 版本 | 支持状态 |
|---|---|
| 0.1.x | ✅ 支持 |

## 安全更新

安全漏洞修复将在新版本中发布，并在 [CHANGELOG.md](CHANGELOG.md) 中记录。
