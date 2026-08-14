// 各情报源「如何申请 API Key」的详细指引（中文分步），用于设置页内置帮助。
// 数据与适配器一一对应；仅跳转的平台单独说明。

export interface SourceGuide {
  id: string;
  name: string;
  region: 'cn' | 'intl';
  /** 申请/管理入口 */
  applyUrl: string;
  /** 免费额度 */
  limits: string;
  /** 分步说明 */
  steps: string[];
  note?: string;
}

export const SOURCE_GUIDES: SourceGuide[] = [
  {
    id: 'virustotal',
    name: 'VirusTotal',
    region: 'intl',
    applyUrl: 'https://www.virustotal.com/gui/my-apikey',
    limits: '免费 4 次/分钟、500 次/天',
    steps: [
      '打开 virustotal.com，点击右上角 Join 注册账号（需邮箱验证）。',
      '登录后点右上角头像 → “API key” 进入密钥页。',
      '复制 Personal API Key（Public API），填入本插件设置。',
    ],
    note: 'Public API 服务条款明确不得用于商业产品/服务，个人分析无碍。',
  },
  {
    id: 'abuseipdb',
    name: 'AbuseIPDB',
    region: 'intl',
    applyUrl: 'https://www.abuseipdb.com/account',
    limits: '免费 1000 次/天（check+report 合计），仅支持 IP',
    steps: [
      '打开 abuseipdb.com，免费注册账号并登录。',
      '进入右上角头像 → Account（账户页）。',
      '切换到 “API” 标签，点 “Create Key” 生成密钥。',
      '复制 API Key，填入本插件设置。',
    ],
  },
  {
    id: 'otx',
    name: 'AlienVault OTX',
    region: 'intl',
    applyUrl: 'https://otx.alienvault.com/',
    limits: '免费，软限流；带 Key 限额更高',
    steps: [
      '打开 otx.alienvault.com 注册（免费）账号。',
      '登录后点右上角用户名 → Settings。',
      '在页面找到 “OTX Key” 并复制（可不填，匿名也能查）。',
    ],
    note: 'Key 可选；不填则以匿名身份查询。',
  },
  {
    id: 'shodan',
    name: 'Shodan',
    region: 'intl',
    applyUrl: 'https://account.shodan.io/',
    limits: '免费 1 次/秒，可无限查 host；仅 IP（富化）',
    steps: [
      '打开 account.shodan.io 注册账号。',
      '登录后在 Account Overview 页面可见 “API Key”。',
      '复制 API Key 填入本插件设置。',
    ],
    note: '作为端口/漏洞富化源，权重默认较低。',
  },
  {
    id: 'greynoise',
    name: 'GreyNoise',
    region: 'intl',
    applyUrl: 'https://www.greynoise.io/',
    limits: 'Community 免费 ~50 次/周，仅 IP',
    steps: [
      '打开 greynoise.io 注册账号（Community 免费）。',
      '登录后进入 Account → API Keys 创建/查看 key。',
      '复制 key 填入本插件设置。',
    ],
    note: '用于区分 IP 是否为互联网扫描器（恶意/良性/未知）。',
  },
  {
    id: 'threatbook',
    name: '微步在线 ThreatBook',
    region: 'cn',
    applyUrl: 'https://x.threatbook.com/',
    limits: '个人免费版约 10 次/天 + 100 次/月（批量）；v1 仅 IP',
    steps: [
      '打开 x.threatbook.com 注册微步在线账号。',
      '登录后进入头像 → “我的 API”（API 管理）页面。',
      '复制 apikey 填入本插件设置。',
    ],
    note: '是国内唯一具备明确个人免费额度的情报 API；Key 切勿公开泄露。',
  },
];

/** 仅支持「跳转查询」、没有个人免费 API 的平台说明。 */
export const JUMP_ONLY_NOTE =
  '腾讯 TIX、360、奇安信 ALPHA、绿盟、安恒 等平台暂无面向个人的免费 API，本插件对其仅提供「一键跳转」到对应详情页（登录各自账号即可查询），不参与自动研判。';
