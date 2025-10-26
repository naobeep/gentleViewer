import React, { useEffect, useRef, useState } from 'react';

type Props = { filePath: string };

export default function PdfViewer({ filePath }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.25);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pdf: any = null;

    (async () => {
      try {
        // 動的 import を使う（require を回避）
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        // Vite 用: worker を import せずに URL で指定する（Rollup がコピーする）
        // 参照するファイル名はインストールされている pdfjs-dist の実ファイル名に合わせる
        /* @vite-ignore */
        const workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString();
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

        const res = await (window as any).electronAPI?.pdf?.getData(filePath);
        if (!res?.ok || cancelled) return;
        const uint8 = new Uint8Array(res.data);
        const loadingTask = (pdfjsLib as any).getDocument({ data: uint8 });
        pdf = await loadingTask.promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);

        const renderPage = async (num: number) => {
          const page = await pdf.getPage(num);
          const viewport = page.getViewport({ scale, rotation });
          const canvas = canvasRef.current;
          if (!canvas) return;
          const context = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const renderContext = {
            canvasContext: context,
            viewport,
          };
          await page.render(renderContext).promise;
        };

        await renderPage(pageNum);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('PDF load/render error', e);
      }
    })();

    return () => {
      cancelled = true;
      // PDF オブジェクトがあればクリーンアップ（可能なら）
      try {
        if (pdf && typeof pdf.destroy === 'function') pdf.destroy();
      } catch {}
    };
  }, [filePath, pageNum, scale, rotation]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setPageNum(p => Math.max(1, p - 1))}>Prev</button>
        <span>
          {pageNum} / {numPages}
        </span>
        <button onClick={() => setPageNum(p => Math.min(numPages, p + 1))}>Next</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Zoom:
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
          />
        </label>
        <button onClick={() => setRotation(r => (r + 90) % 360)}>Rotate</button>
        <button onClick={() => window.print()}>Print</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />
      </div>
    </div>
  );
}
