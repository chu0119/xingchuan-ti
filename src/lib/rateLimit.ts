// 每源配额/节流：用 chrome.storage.session 记录当日/当分钟计数（关闭浏览器即清）。
// 超出免费档上限时拒绝调用，避免无谓请求被平台封禁。

const key = (id: string) => `rl:${id}`;
const today = () => new Date().toISOString().slice(0, 10);

interface Usage {
  day: { date: string; count: number };
  min: { start: number; count: number };
}

export async function tryConsume(
  id: string,
  limits: { perDay?: number; perMin?: number },
): Promise<{ ok: boolean; reason?: string }> {
  const k = key(id);
  const now = Date.now();
  const cur = ((await chrome.storage.session.get(k))[k] as Usage | undefined) ?? {
    day: { date: today(), count: 0 },
    min: { start: now, count: 0 },
  };

  if (cur.day.date !== today()) cur.day = { date: today(), count: 0 };
  if (now - cur.min.start > 60_000) cur.min = { start: now, count: 0 };

  if (limits.perDay != null && cur.day.count >= limits.perDay) {
    return { ok: false, reason: `已达每日上限 ${limits.perDay}` };
  }
  if (limits.perMin != null && cur.min.count >= limits.perMin) {
    return { ok: false, reason: `已达每分钟上限 ${limits.perMin}` };
  }

  cur.day.count++;
  cur.min.count++;
  await chrome.storage.session.set({ [k]: cur });
  return { ok: true };
}
