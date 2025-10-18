// ...new file...
import { useEffect, useRef, useState, useCallback } from 'react';

type ThumbMap = Record<string, string | null>;

export function useThumbnails(filePaths: string[], options?: { autoStart?: boolean }) {
  const autoStart = options?.autoStart ?? true;
  const [thumbnails, setThumbnails] = useState<ThumbMap>({});
  const runningRef = useRef(false);

  const refresh = useCallback(
    async (paths?: string[]) => {
      const arr = Array.isArray(paths) ? paths : filePaths;
      if (!arr || arr.length === 0) return;
      try {
        const res = await (window as any).electronAPI.getThumbnailPaths(arr);
        // res is array of (string | null) in the same order
        const map: ThumbMap = {};
        arr.forEach((p: string, i: number) => (map[p] = res[i] ?? null));
        setThumbnails(prev => ({ ...prev, ...map }));
      } catch (e) {
        console.error('useThumbnails: refresh error', e);
      }
    },
    [filePaths]
  );

  const start = useCallback(
    async (paths?: string[]) => {
      const arr = Array.isArray(paths) ? paths : filePaths;
      if (!arr || arr.length === 0) return;
      try {
        runningRef.current = true;
        await (window as any).electronAPI.startThumbnailGeneration(arr);
      } catch (e) {
        console.error('useThumbnails: start error', e);
      }
    },
    [filePaths]
  );

  useEffect(() => {
    // initial load
    refresh();

    // auto start generation if desired
    if (autoStart && filePaths && filePaths.length > 0) {
      start();
    }

    const unsubProgress = (window as any).electronAPI.onThumbnailProgress((p: any) => {
      // when an individual file is processed, try to fetch its cached path
      if (p && p.currentFile) {
        (window as any).electronAPI
          .getThumbnailPath(p.currentFile)
          .then((path: string | null) => {
            setThumbnails(prev => ({ ...prev, [p.currentFile]: path ?? null }));
          })
          .catch(() => {});
      }
      // when overall completed, refresh all to ensure final paths
      if (p && p.status === 'completed') {
        refresh();
        runningRef.current = false;
      }
    });

    // cleanup
    return () => {
      try {
        unsubProgress();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePaths.join('|')]);

  return {
    thumbnails,
    refresh,
    start,
    isRunning: () => runningRef.current,
  } as const;
}
