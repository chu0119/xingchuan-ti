// 编排结果短时缓存：同一 (type,value) 在 TTL 内复用，节省各源配额。
// 存 chrome.storage.session（浏览器关闭即清，不长期留存）。

export async function getCached(type: string, value: string): Promise<any | null> {
  const k = `cq:${type}:${value}`;
  const v = (await chrome.storage.session.get(k))[k] as
    | { t: number; ttl: number; data: any }
    | undefined;
  if (v && Date.now() - v.t < v.ttl) return v.data;
  // 过期则清理
  if (v) chrome.storage.session.remove(k).catch(() => {});
  return null;
}

export async function setCached(type: string, value: string, data: any, ttlMin: number): Promise<void> {
  const k = `cq:${type}:${value}`;
  await chrome.storage.session.set({ [k]: { t: Date.now(), ttl: ttlMin * 60_000, data } });
}
