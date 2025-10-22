import React, { useEffect, useRef, useState, useCallback } from 'react';

type Props = { filePath: string; initialScale?: number };

export default function ImageViewer({ filePath, initialScale = 1 }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(initialScale);
  const [rotation, setRotation] = useState<number>(0); // degrees
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [meta, setMeta] = useState<{ w?: number; h?: number; size?: number; name?: string }>({});
  const blobUrlRef = useRef<string | null>(null);

  // load image: prefer preload readFile -> ArrayBuffer/Uint8Array/base64, fallback to file://
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // try electronAPI.readFile (preload)
        if ((window as any).electronAPI && (window as any).electronAPI.readFile) {
          const res = await (window as any).electronAPI.readFile(filePath);
          // accept { data: Uint8Array | ArrayBuffer | base64 string, size? } or raw ArrayBuffer
          let ab: ArrayBuffer | null = null;
          if (!res) {
            /* fallthrough */
          } else if (res.data) {
            if (res.data instanceof ArrayBuffer) ab = res.data;
            else if (res.data.buffer instanceof ArrayBuffer) ab = res.data.buffer;
            else if (typeof res.data === 'string' && res.data.startsWith('data:')) {
              // data url
              if (mounted) setSrc(res.data);
            } else if (typeof res.data === 'string') {
              // assume base64 without prefix
              const bin = atob(res.data);
              const len = bin.length;
              const u8 = new Uint8Array(len);
              for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
              ab = u8.buffer;
            }
            if (ab) {
              const blob = new Blob([ab], { type: 'image/*' });
              const url = URL.createObjectURL(blob);
              blobUrlRef.current = url;
              if (mounted) setSrc(url);
              // set size meta if available
              if (mounted && typeof res.size === 'number') setMeta(m => ({ ...m, size: res.size }));
            }
          } else if (res instanceof ArrayBuffer) {
            const blob = new Blob([res], { type: 'image/*' });
            const url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
            if (mounted) setSrc(url);
          }
        }
      } catch {
        /* ignore; fallback below */
      }

      if (!mounted) return;
      if (!src) {
        try {
          // fallback: file:// URL (encode path)
          const fileUrl = encodeURI(`file://${filePath.replace(/\\/g, '/')}`);
          setSrc(fileUrl);
        } catch {
          setSrc(null);
        }
      }

      // set name
      if (mounted) setMeta(m => ({ ...m, name: filePath.split(/[\\/]/).pop() }));
    })();

    return () => {
      mounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // collect natural size when image loads
  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setMeta(m => ({ ...m, w: img.naturalWidth, h: img.naturalHeight }));
    // reset scale / offset if needed
  }, []);

  // pointer events for pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      if ((e as any).button && (e as any).button !== 0) return;
      setIsPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as Element).setPointerCapture?.((e as any).pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning || !lastPos.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    };
    const onPointerUp = (e: PointerEvent) => {
      setIsPanning(false);
      lastPos.current = null;
      try {
        (e.target as Element).releasePointerCapture?.((e as any).pointerId);
      } catch {}
    };
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isPanning]);

  // wheel zoom (ctrl+wheel or wheel with alt)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.altKey) return; // require modifier to avoid interfering with scroll
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 0.9;
      setScale(s => Math.max(0.05, Math.min(10, +(s * factor).toFixed(3))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || (e.ctrlKey && e.key === '='))
        setScale(s => Math.min(10, +(s * 1.2).toFixed(3)));
      else if (e.key === '-' || (e.ctrlKey && e.key === '_'))
        setScale(s => Math.max(0.05, +(s / 1.2).toFixed(3)));
      else if (e.key.toLowerCase() === 'r') setRotation(r => (r + 90) % 360);
      else if (e.key === 'ArrowLeft') setOffset(o => ({ ...o, x: o.x + 50 }));
      else if (e.key === 'ArrowRight') setOffset(o => ({ ...o, x: o.x - 50 }));
      else if (e.key === 'ArrowUp') setOffset(o => ({ ...o, y: o.y + 50 }));
      else if (e.key === 'ArrowDown') setOffset(o => ({ ...o, y: o.y - 50 }));
      else if (e.key === '0') {
        // fit to container
        const container = containerRef.current;
        const img = imgRef.current;
        if (!container || !img) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
        setScale(Math.max(0.05, +s.toFixed(3)));
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const resetView = () => {
    setScale(initialScale);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const rotateCW = () => setRotation(r => (r + 90) % 360);
  const rotateCCW = () => setRotation(r => (r + 270) % 360);
  const zoomIn = () => setScale(s => Math.min(10, +(s * 1.25).toFixed(3)));
  const zoomOut = () => setScale(s => Math.max(0.05, +(s / 1.25).toFixed(3)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={rotateCCW} aria-label="左回転">
          ⟲
        </button>
        <button onClick={rotateCW} aria-label="右回転">
          ⟳
        </button>
        <button onClick={zoomOut} aria-label="ズームアウト">
          −
        </button>
        <button onClick={zoomIn} aria-label="ズームイン">
          ＋
        </button>
        <button onClick={resetView}>リセット</button>
        <div style={{ marginLeft: 8 }}>拡大率: {(scale * 100).toFixed(0)}%</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: '#444' }}>
          {meta.name ? meta.name : ''} {meta.w ? ` ${meta.w}×${meta.h}` : ''}{' '}
          {meta.size ? ` ${Math.round(meta.size / 1024)} KB` : ''}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          background: '#222',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          touchAction: 'none',
          position: 'relative',
        }}
        title="ドラッグでパン、Ctrl/Alt+ホイールでズーム、R: 回転、0:幅/高さ合わせ"
      >
        {src ? (
          <img
            ref={imgRef}
            src={src}
            onLoad={onImgLoad}
            alt={meta.name || 'image'}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              userSelect: 'none',
              touchAction: 'none',
              willChange: 'transform',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
            draggable={false}
          />
        ) : (
          <div style={{ color: '#fff' }}>読み込み中...</div>
        )}
      </div>

      <div style={{ padding: 8, borderTop: '1px solid #eee', background: '#f7f7f7', fontSize: 13 }}>
        <strong>メタデータ</strong>
        <div style={{ marginTop: 6, color: '#333' }}>
          <div>パス: {filePath}</div>
          <div>名前: {meta.name ?? '-'}</div>
          <div>解像度: {meta.w ? `${meta.w} × ${meta.h}` : '-'}</div>
          <div>サイズ: {meta.size ? `${Math.round(meta.size / 1024)} KB` : '-'}</div>
        </div>
      </div>
    </div>
  );
}
