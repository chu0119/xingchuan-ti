import { defineConfig } from 'wxt';

// WXT 会根据 entrypoints/ 自动生成 manifest（popup/options/background/content_scripts）。
// 这里补充权限、host 权限、图标和元信息。
export default defineConfig({
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDesc__',
    default_locale: 'zh_CN',
    permissions: ['contextMenus', 'storage', 'activeTab', 'notifications'],
    host_permissions: [
      'https://api.threatbook.cn/v3/*',
      'https://www.virustotal.com/api/v3/*',
      'https://api.abuseipdb.com/api/v2/*',
      'https://otx.alienvault.com/api/v1/*',
      'https://api.shodan.io/shodan/*',
      'https://api.greynoise.io/v3/*',
      'https://urlscan.io/api/v1/*',
      'https://threatfox-api.abuse.ch/api/v1/*',
      'https://mb-api.abuse.ch/api/v1/*',
      'https://search.censys.io/api/v2/*',
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';",
    },
    icons: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
    action: {
      default_title: '__MSG_extName__',
      default_icon: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    },
    // 内容脚本会把图标 <img> 注入网页，必须声明为 web_accessible_resources 才能加载
    commands: {
      'query-selection': {
        suggested_key: { default: 'Ctrl+Shift+Y', mac: 'Command+Shift+Y' },
        description: '查询当前选中文本的威胁情报',
      },
    },
    web_accessible_resources: [
      {
        resources: ['icons/*', 'icons/platforms/*'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
