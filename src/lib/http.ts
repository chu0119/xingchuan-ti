// service worker 内通用的 fetch 封装：超时、错误码、JSON 解析。
// 只在 background service worker 中调用（利用 host_permissions 绕过 CORS）。

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

/** 带 AbortController 超时的 fetch + JSON 解析；非 2xx 抛 HttpError。 */
export async function fetchJson(url: string, opts: RequestInit = {}, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.message || j.verbose_msg || j.error?.message || msg;
      } catch {
        /* 非 JSON，保留默认 msg */
      }
      throw new HttpError(res.status, msg);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timer);
  }
}

export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  return sp.toString();
}
