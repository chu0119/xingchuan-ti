# 隐私政策

**最后更新日期**：2026 年 8 月 14 日

## 概述

星川威胁情报助手（以下简称"本扩展"）是一款开源浏览器扩展，旨在帮助安全分析师查询威胁情报。我们非常重视您的隐私，本隐私政策说明了我们如何处理您的数据。

## 数据收集

**本扩展不收集任何用户数据。**

- ❌ 不收集个人信息
- ❌ 不收集浏览历史
- ❌ 不收集查询记录（本地缓存仅存在浏览器内存中，关闭浏览器即清）
- ❌ 不进行任何形式的遥测或数据上报
- ❌ 不包含任何第三方分析或跟踪代码

## API Key 存储

本扩展允许用户配置各威胁情报平台的 API Key：

- **存储位置**：所有 API Key 仅保存在用户浏览器的本地存储（`chrome.storage.local`）中
- **传输方式**：API Key 仅在用户主动查询时，通过 HTTPS 发送到对应的情报平台 API
- **安全措施**：Key 不会上传到任何服务器，不会被包含在导出文件中（除非用户明确选择"导出含 Key"并设置密码）
- **用户控制**：用户可随时在设置页删除所有 API Key

## 网络请求

本扩展在用户主动查询时，会向以下第三方威胁情报平台发送请求：

- VirusTotal（virustotal.com）
- AbuseIPDB（abuseipdb.com）
- AlienVault OTX（otx.alienvault.com）
- Shodan（shodan.io）
- GreyNoise（greynoise.io）
- 微步在线（threatbook.cn）
- urlscan.io（urlscan.io）
- ThreatFox（abuse.ch）
- MalwareBazaar（abuse.ch）
- Censys（censys.io）

这些请求仅包含用户主动选中的 IP、域名、URL 或文件哈希，不包含任何个人信息。

## 权限说明

本扩展请求的权限及其用途：

| 权限 | 用途 |
|------|------|
| `contextMenus` | 添加右键菜单"威胁情报查询" |
| `storage` | 存储用户配置（API Key、设置） |
| `activeTab` | 获取当前标签页选中的文本 |
| `notifications` | 查询结果为恶意时发送桌面通知（可关闭） |
| `host_permissions` | 允许向各情报平台 API 发送请求（已限制为精确 API 路径） |

## 数据导出

本扩展支持配置导入导出功能：

- **导出不含 Key**：默认行为，导出文件不包含任何 API Key
- **导出含 Key**：用户可选择导出含 Key 的配置文件，支持 AES-GCM 密码保护
- 导出文件由用户自行保管，本扩展不存储导出历史

## 开源

本扩展是开源软件，源代码可在 GitHub 上公开审查：

https://github.com/chu0119/xingchuan-ti

任何人都可以审查代码以验证本隐私政策的准确性。

## 联系方式

如果您对本隐私政策有任何疑问，请通过 GitHub Issues 联系我们：

https://github.com/chu0119/xingchuan-ti/issues

## 变更

本隐私政策可能会不时更新。任何重大变更将在 GitHub 仓库中公布。
