export type ProgressCb = (info: { index: number; total: number; current?: string }) => void;

/**
 * execute an async worker function for items with concurrency limit.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: ProgressCb
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  let active = 0;
  return new Promise((resolve, reject) => {
    const total = items.length;
    if (total === 0) return resolve([]);
    const next = () => {
      if (idx >= total && active === 0) {
        return resolve(results);
      }
      while (active < concurrency && idx < total) {
        const curIndex = idx++;
        const item = items[curIndex];
        active++;
        Promise.resolve()
          .then(() => worker(item, curIndex))
          .then(r => {
            results[curIndex] = r;
            active--;
            onProgress?.({ index: curIndex, total, current: String(item) });
            next();
          })
          .catch(err => {
            active--;
            // record undefined and continue or reject? reject to surface errors.
            reject(err);
          });
      }
    };
    next();
  });
}
