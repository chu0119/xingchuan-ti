// 每源配额/节流：用 chrome.storage.session 记录当日/当分钟计数（关闭浏览器即清）。
// 使用写入锁防止并发读写竞态；查询失败时退款（不浪费配额）。

const key = (id: string) => `rl:${id}`;
const today = () => new Date().toISOString().slice(0, 10);

interface Usage {
  day: { date: string; count: number };
  min: { start: number; count: number };
}

// 简易互斥锁：防止并发 get-set 覆盖
let writeLock: Promise<void> = Promise.resolve();

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let resolve: () => void;
  writeLock = new Promise(r => (resolve = r));
  await prev;
  try {
    return await fn();
  } finally {
    resolve!();
  }
}

async function getUsage(id: string, now: number): Promise<Usage> {
  const k = key(id);
  const cur = ((await chrome.storage.session.get(k))[k] as Usage | undefined) ?? {
    day: { date: today(), count: 0 },
    min: { start: now, count: 0 },
  };
  if (cur.day.date !== today()) cur.day = { date: today(), count: 0 };
  if (now - cur.min.start > 60_000) cur.min = { start: now, count: 0 };
  return cur;
}

export async function tryConsume(
  id: string,
  limits: { perDay?: number; perMin?: number },
): Promise<{ ok: boolean; reason?: string }> {
  return withLock(async () => {
    const now = Date.now();
    const cur = await getUsage(id, now);

    if (limits.perDay != null && cur.day.count >= limits.perDay) {
      return { ok: false, reason: `已达每日上限 ${limits.perDay}` };
    }
    if (limits.perMin != null && cur.min.count >= limits.perMin) {
      return { ok: false, reason: `已达每分钟上限 ${limits.perMin}` };
    }

    cur.day.count++;
    cur.min.count++;
    await chrome.storage.session.set({ [key(id)]: cur });
    return { ok: true };
  });
}

/** 查询失败时退款（不浪费配额） */
export async function refund(id: string): Promise<void> {
  return withLock(async () => {
    const now = Date.now();
    const cur = await getUsage(id, now);
    if (cur.day.count > 0) cur.day.count--;
    if (cur.min.count > 0) cur.min.count--;
    await chrome.storage.session.set({ [key(id)]: cur });
  });
}

/** 获取某源当日已用次数 */
export async function getUsageToday(id: string): Promise<{ today: number }> {
  const k = key(id);
  const cur = ((await chrome.storage.session.get(k))[k] as Usage | undefined) ?? {
    day: { date: today(), count: 0 },
    min: { start: 0, count: 0 },
  };
  if (cur.day.date !== today()) return { today: 0 };
  return { today: cur.day.count };
}
