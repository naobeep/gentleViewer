import fs from 'fs';
import path from 'path';
import { pruneCache, getCacheInfo } from './cache'; // 既存の pruneCache/getCacheInfo を使う想定
type Policy = {
  maxSizeBytes: number;
  ttlSeconds: number;
  intervalMinutes?: number;
  enabled?: boolean;
};

const POLICY_FILE = 'cache-policy.json';

let timer: NodeJS.Timeout | null = null;
let currentPolicy: Policy | null = null;
let userDataDirGlobal = '';

function policyPath(userData: string) {
  userDataDirGlobal = userData;
  return path.join(userData, POLICY_FILE);
}

export async function loadPolicy(userData: string): Promise<Policy> {
  const p = policyPath(userData);
  try {
    const txt = await fs.promises.readFile(p, 'utf8');
    currentPolicy = JSON.parse(txt) as Policy;
    return currentPolicy;
  } catch {
    // デフォルトポリシー
    currentPolicy = {
      maxSizeBytes: 1024 * 1024 * 1024,
      ttlSeconds: 60 * 60 * 24 * 30,
      intervalMinutes: 60,
      enabled: false,
    };
    return currentPolicy;
  }
}

export async function savePolicy(userData: string, policy: Policy) {
  const p = policyPath(userData);
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
  await fs.promises.writeFile(p, JSON.stringify(policy, null, 2), 'utf8');
  currentPolicy = policy;
  // 再スケジュール
  if (policy.enabled) startAutoPrune(userData, policy);
  else stopAutoPrune();
}

export function startAutoPrune(userData: string, policyOverride?: Partial<Policy>) {
  stopAutoPrune();
  const basePolicy = currentPolicy || {
    maxSizeBytes: 1024 * 1024 * 1024,
    ttlSeconds: 60 * 60 * 24 * 30,
    intervalMinutes: 60,
    enabled: true,
  };
  const policy: Policy = { ...basePolicy, ...(policyOverride || {}), enabled: true };
  currentPolicy = policy;
  const intervalMin = Math.max(1, policy.intervalMinutes ?? 60);
  // タイマー登録
  timer = setInterval(
    async () => {
      try {
      // pruneCache の実装に size/ttl を渡せるなら渡す。なければ force:false で実行して getCacheInfo をチェック。
      // pruneCache の型が { force?: boolean } のみ受け取る場合は force を渡す
      await pruneCache(
        userData,
        { force: false },
        progress => {
          // optional: ログや progress broadcast
          // console.log('[cache.auto] prune progress', progress);
        }
      );
        // optional: 終了後の情報ログ
        const info = await getCacheInfo(userData).catch(() => null);
        // console.info('[cache.auto] prune done', info);
      } catch (e) {
        console.error('[cache.auto] prune error', e);
      }
    },
    intervalMin * 60 * 1000
  );

  // 保存
  savePolicy(userData, policy).catch(() => {});
}

export function stopAutoPrune() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (currentPolicy) currentPolicy.enabled = false;
}

export function getCurrentPolicy(): Policy | null {
  return currentPolicy;
}
