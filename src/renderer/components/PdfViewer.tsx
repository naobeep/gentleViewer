import React, { useEffect, useRef, useState } from 'react';

type Props = { filePath: string; zoom?: number };

// // Vite 用 worker import を型付け（?url を使うため正確なモジュール名にする）
// declare module 'pdfjs-dist/build/pdf.worker?url' {
//   const value: string;
//   export default value;
// }

export const PdfViewer: React.FC<Props> = ({ filePath, zoom = 1.0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState<number>(zoom);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        // 動的 import を使い Vite に適した worker を指定する
        // @ts-ignore: no type declarations for pdfjs-dist legacy build in this project
        const pdfjs = (await import('pdfjs-dist/legacy/build/pdf')) as any;
        // Vite 用: worker をバンドル済みアセットとして読み込む（?url を使う）
        const workerModule = await import('pdfjs-dist/build/pdf.worker?url');
        const workerSrc: string =
          (workerModule && (workerModule as any).default) || String(workerModule);
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const src = filePath.replace(/\\/g, '/');
        const loadingTask = pdfjs.getDocument(src);
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        const renderPage = async (num: number) => {
          const page = await pdf.getPage(num);
          const viewport = page.getViewport({ scale });
          const canvas = canvasRef.current;
          if (!canvas) return;
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
        };

        await renderPage(pageNum);
      } catch (err) {
        console.error('PdfViewer error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, pageNum, scale]);

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1}>
          前
        </button>
        <span>
          {pageNum} / {pageCount || '...'}
        </span>
        <button
          onClick={() => setPageNum(p => Math.min(pageCount || p, p + 1))}
          disabled={pageNum >= (pageCount || 1)}
        >
          次
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => setScale(s => Math.round((s + 0.25) * 100) / 100)}>+</button>
          <button onClick={() => setScale(s => Math.max(0.25, Math.round((s - 0.25) * 100) / 100))}>
            -
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
        {loading ? (
          <div>読み込み中...</div>
        ) : (
          <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
