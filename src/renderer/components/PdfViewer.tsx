import React, { useEffect, useRef, useState, useCallback } from 'react';

// 以下は既存の実装を置き換える拡張実装です
export const PdfViewer: React.FC<{ filePath: string; zoom?: number }> = ({
  filePath,
  zoom = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState<number>(zoom);
  const [docLoaded, setDocLoaded] = useState<any>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [pdfDataBuf, setPdfDataBuf] = useState<ArrayBuffer | null>(null);

  // keyboard navigation
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        setPageNum(p => Math.min(p + 1, pageCount));
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        setPageNum(p => Math.max(p - 1, 1));
      } else if (e.key.toLowerCase() === 'f') {
        // フルスクリーン切替（Canvas を含むコンテナをフルスクリーンにする）
        const el = canvasRef.current?.parentElement;
        if (el) {
          if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
        setScale(s => Math.min(5, s + 0.1));
      } else if (e.key === '-' || (e.ctrlKey && e.key === '_')) {
        setScale(s => Math.max(0.1, s - 0.1));
      }
    },
    [pageCount]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        // dynamic import pdfjs (legacy build used by project)
        // @ts-ignore
        const pdfjs = (await import('pdfjs-dist/legacy/build/pdf')) as any;
        const workerModule = await import('pdfjs-dist/build/pdf.worker?url');
        const workerSrc: string =
          (workerModule && (workerModule as any).default) || String(workerModule);
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        // Try to read binary via preload API (if available) for robust file access in Electron.
        let dataBuf: ArrayBuffer | null = null;
        try {
          // window.electronAPI.readFile should return { ok, data: ArrayBuffer | Uint8Array } or raw ArrayBuffer
          // 呼び出しが存在しない場合は fetch fallback を試す
          if ((window as any).electronAPI && (window as any).electronAPI.readFile) {
            const res = await (window as any).electronAPI.readFile(filePath);
            // Accept various shapes
            if (res && res.data) {
              if (res.data instanceof ArrayBuffer) dataBuf = res.data;
              else if (res.data.buffer instanceof ArrayBuffer) dataBuf = res.data.buffer;
              else dataBuf = new Uint8Array(res.data).buffer;
            } else if (res instanceof ArrayBuffer) {
              dataBuf = res;
            }
          }
        } catch {
          // ignore, fallback to fetch
        }

        if (!dataBuf) {
          // fallback: try fetch with file:// URL or encoded path
          try {
            const fileUrl = encodeURI(`file://${filePath.replace(/\\/g, '/')}`);
            const resp = await fetch(fileUrl);
            if (resp.ok) dataBuf = await resp.arrayBuffer();
          } catch (e) {
            // last resort: pass file path to pdfjs.getDocument (may work in electron)
            dataBuf = null;
          }
        }

        setPdfDataBuf(dataBuf);

        const loadingTask = dataBuf
          ? pdfjs.getDocument({ data: dataBuf })
          : pdfjs.getDocument(filePath.replace(/\\/g, '/'));
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setDocLoaded(pdf);
        setPageCount(pdf.numPages);
        setPageNum(1);
      } catch (err) {
        console.error('PdfViewer load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, zoom]);

  // render current page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!docLoaded) return;
      try {
        setLoading(true);
        const page = await docLoaded.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };
        const renderTask = page.render(renderContext);
        await renderTask.promise;

        // extract raw text (for selectable plain-text panel)
        try {
          const textContent = await page.getTextContent();
          const strs: string[] = [];
          for (const item of textContent.items) {
            if (typeof item.str === 'string') strs.push(item.str);
          }
          setRawText(strs.join('\n'));
        } catch (e) {
          setRawText(null);
        }
      } catch (err) {
        console.error('PdfViewer render error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docLoaded, pageNum, scale]);

  const goPrev = () => setPageNum(p => Math.max(1, p - 1));
  const goNext = () => setPageNum(p => Math.min(pageCount, p + 1));
  const zoomIn = () => setScale(s => Math.min(5, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale(s => Math.max(0.1, +(s - 0.25).toFixed(2)));
  const fitWidth = () => {
    // approximate fit to container width
    const container = canvasRef.current?.parentElement;
    if (!docLoaded || !container) return;
    const targetWidth = container.clientWidth - 16;
    (async () => {
      const page = await docLoaded.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const newScale = targetWidth / viewport.width;
      setScale(newScale);
    })();
  };

  const handlePrint = async () => {
    try {
      // If we have the original PDF bytes, open a print window using blob URL (preserves vector quality)
      if (pdfDataBuf) {
        const blob = new Blob([pdfDataBuf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
          <html><head><title>Print PDF</title></head>
          <body style="margin:0">
            <embed src="${url}" type="application/pdf" width="100%" height="100%"></embed>
          </body></html>
        `);
        w.document.close();
        // wait a bit for embed to load then print
        setTimeout(() => {
          try {
            w.focus();
            w.print();
          } catch {}
        }, 500);
        return;
      }

      // Fallback: print rendered canvas as image
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<img src="${dataUrl}" style="width:100%" />`);
      w.document.close();
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {}
      }, 300);
    } catch (e) {
      console.error('print failed', e);
    }
  };

  return (
    <div
      className="pdf-viewer"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        className="pdf-toolbar"
        style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}
      >
        <button onClick={goPrev} disabled={pageNum <= 1}>
          ◀
        </button>
        <button onClick={goNext} disabled={pageNum >= pageCount}>
          ▶
        </button>
        <span>
          {pageNum} / {pageCount || '-'}
        </span>

        <div style={{ width: 1, height: 24, background: '#eee', marginLeft: 8, marginRight: 8 }} />

        <button onClick={zoomOut}>−</button>
        <button onClick={zoomIn}>＋</button>
        <button onClick={fitWidth}>幅に合わせる</button>
        <span style={{ marginLeft: 8 }}>拡大率: {(scale * 100).toFixed(0)}%</span>

        <div style={{ flex: 1 }} />

        <button onClick={handlePrint}>印刷</button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
        }}
      >
        <div style={{ position: 'relative' }}>
          {loading && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                textAlign: 'center',
                zIndex: 5,
              }}
            >
              読み込み中...
            </div>
          )}
          <canvas ref={canvasRef} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
        </div>
      </div>

      {/* テキスト抽出パネル（選択可能なプレーンテキスト） */}
      <div
        style={{
          borderTop: '1px solid #eee',
          padding: 8,
          maxHeight: 160,
          overflow: 'auto',
          background: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <strong>テキスト抽出</strong>
          <span style={{ color: '#666' }}>
            {rawText ? '（選択・コピー可能）' : '（テキストなし または 抽出不可）'}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              setRawText(null);
              /* 再抽出トリガー */ setPageNum(p => p);
            }}
          >
            再抽出
          </button>
        </div>
        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.4 }}>
          {rawText ? (
            <div style={{ userSelect: 'text' }}>{rawText}</div>
          ) : (
            <div style={{ color: '#999' }}>ページのテキストがここに表示されます</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
