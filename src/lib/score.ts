// 加权综合评分：只有"报恶意/可疑"的源提供威胁证据并决定分数；
// clean（无威胁情报=查无记录）不稀释分数。unknown 与 error 不参与。
// 这样 VT/微步判恶意时，不会被某个 clean 源平均成"可疑"。

import type { AggregateResult, QueryResult, Settings, Verdict } from '../adapters/types';

export function aggregate(results: QueryResult[], settings: Settings): AggregateResult {
  let malW = 0; // 恶意证据权重
  let suspW = 0; // 可疑证据权重
  let flagCount = 0; // 报恶意/可疑的源数
  let cleanCount = 0; // 报 clean 的源数

  for (const r of results) {
    if (r.error || r.verdict === 'unknown') continue;
    const w = settings.sources[r.source]?.weight ?? 1;
    if (r.verdict === 'malicious') {
      malW += w;
      flagCount++;
    } else if (r.verdict === 'suspicious') {
      suspW += w;
      flagCount++;
    } else if (r.verdict === 'clean') {
      cleanCount++;
    }
  }

  const flagW = malW + suspW;
  if (flagW === 0) {
    // 无任何威胁证据
    if (cleanCount > 0) return { score: 0, label: 'clean', contributors: cleanCount };
    return { score: null, label: 'unknown', contributors: 0 };
  }

  // 分数 = 恶意(100)/可疑(50) 的加权平均；clean 不参与
  const score = Math.round((malW * 100 + suspW * 50) / flagW);
  const label: Verdict = score >= 66 ? 'malicious' : 'suspicious';
  return { score, label, contributors: flagCount + cleanCount };
}

export const LABEL_TEXT: Record<Verdict, string> = {
  malicious: '恶意',
  suspicious: '可疑',
  clean: '低风险',
  unknown: '未知',
};

export const LABEL_COLOR: Record<Verdict, string> = {
  malicious: '#e53935',
  suspicious: '#fb8c00',
  clean: '#43a047',
  unknown: '#9e9e9e',
};
