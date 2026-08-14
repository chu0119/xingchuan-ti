// 适配器注册表：把所有情报源适配器汇集，供编排器遍历。
// 新增一个源 = 写一个适配器文件 + 在这里登记 + 在 storage 默认配置加权重。

import type { Adapter } from './types';
import { virustotal } from './virustotal';
import { abuseipdb } from './abuseipdb';
import { otx } from './otx';
import { shodan } from './shodan';
import { greynoise } from './greynoise';
import { threatbook } from './threatbook';
import { urlscan } from './urlscan';
import { threatfox } from './threatfox';
import { malwarebazaar } from './malwarebazaar';
import { censys } from './censys';

export const ADAPTERS: Adapter[] = [virustotal, abuseipdb, otx, shodan, greynoise, threatbook, urlscan, threatfox, malwarebazaar, censys];

export const ADAPTER_MAP: Record<string, Adapter> = Object.fromEntries(ADAPTERS.map(a => [a.id, a]));

export type { Adapter, QueryResult, Verdict, IndicatorType } from './types';
export { extractHost } from '../lib/http';
