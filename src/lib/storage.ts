// 设置读写：API Key、各源开关与权重、触发方式、缓存 TTL、主题。
// 全部存 chrome.storage.local，永不上传。

import type { Settings } from '../adapters/types';

const KEY = 'settings';

export const DEFAULT_SETTINGS: Settings = {
  sources: {
    virustotal: { enabled: true, apiKey: '', weight: 1.5 },
    abuseipdb: { enabled: true, apiKey: '', weight: 1.2 },
    otx: { enabled: true, apiKey: '', weight: 1.0 },
    shodan: { enabled: true, apiKey: '', weight: 0.8 },
    greynoise: { enabled: true, apiKey: '', weight: 1.0 },
    threatbook: { enabled: true, apiKey: '', weight: 1.5 },
    urlscan: { enabled: true, apiKey: '', weight: 1.0 },
    threatfox: { enabled: false, apiKey: '', weight: 1.3 },
    malwarebazaar: { enabled: false, apiKey: '', weight: 1.2 },
    censys: { enabled: false, apiKey: '', weight: 0.8 },
  },
  triggers: { selection: true, contextMenu: true, popup: true },
  cacheTtlMin: 10,
  theme: 'auto',
  notifyOnMalicious: true,
};

export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
  return mergeDefaults(stored);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

function mergeDefaults(stored?: Partial<Settings>): Settings {
  if (!stored) return structuredClone(DEFAULT_SETTINGS);
  return {
    sources: { ...DEFAULT_SETTINGS.sources, ...(stored.sources as any) },
    triggers: { ...DEFAULT_SETTINGS.triggers, ...(stored.triggers as any) },
    cacheTtlMin: stored.cacheTtlMin ?? DEFAULT_SETTINGS.cacheTtlMin,
    theme: (stored.theme as Settings['theme']) ?? DEFAULT_SETTINGS.theme,
    notifyOnMalicious: stored.notifyOnMalicious ?? DEFAULT_SETTINGS.notifyOnMalicious,
  };
}
