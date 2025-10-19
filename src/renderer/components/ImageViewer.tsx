import React, { useEffect, useRef, useState } from 'react';

type Props = {
  filePath: string;
  onClose?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  showMeta?: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export const ImageViewer: React.FC<Props> = ({
  filePath,
  onClose,
  onPrev,
  onNext,
  showMeta = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [rotate, setRotate] = useState<number>(0); // degrees
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 1 / 1.1;
      const rect = imgRef.current?.getBoundingClientRect();
      if (!rect || !imgRef.current || !containerRef.current) {
        setScale(s => clamp(s * factor, 0.1, 8));
        return;
      }
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const prevScale = scale;
      const nextScale = clamp(prevScale * factor, 0.1, 8);
      const ratio = nextScale / prevScale;
      setOffset(o => ({
        x: (o.x - cx) * ratio + cx,
        y: (o.y - cy) * ratio + cy,
      }));
      setScale(nextScale);
    };
    const node = containerRef.current;
    node?.addEventListener('wheel', onWheel, { passive: false });
    return () => node?.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, filePath]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as Element).setPointerCapture?.((e as any).pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging.current = false;
      try {
        (e.target as Element).releasePointerCapture?.((e as any).pointerId);
      } catch {}
    };
    const node = containerRef.current;
    node?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      node?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key === 'ArrowUp') setScale(s => clamp(s * 1.1, 0.1, 8));
      if (e.key === 'ArrowDown') setScale(s => clamp(s / 1.1, 0.1, 8));
      if (e.key.toLowerCase() === 'r' && !e.shiftKey) setRotate(r => (r + 90) % 360);
      if (e.key.toLowerCase() === 'r' && e.shiftKey) setRotate(r => (r - 90 + 360) % 360);
      if (e.key === 'f') {
        try {
          const el = containerRef.current;
          if (el) {
            if (!document.fullscreenElement) el.requestFullscreen?.();
            else document.exitFullscreen?.();
          }
        } catch {}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  const styleImg: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotate}deg)`,
    transformOrigin: '0 0',
    cursor: dragging.current ? 'grabbing' : 'grab',
    maxWidth: 'none',
    maxHeight: 'none',
    userSelect: 'none',
    display: 'block',
  };

  const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: '#111',
      }}
    >
      <img ref={imgRef} src={fileUrl} alt="" style={styleImg} draggable={false} />
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => setScale(s => clamp(s * 1.1, 0.1, 8))}>+</button>
        <button onClick={() => setScale(s => clamp(s / 1.1, 0.1, 8))}>-</button>
        <button onClick={() => setRotate(r => (r + 90) % 360)}>⤾</button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
            setRotate(0);
          }}
        >
          リセット
        </button>
      </div>
      {showMeta && (
        <div
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            background: 'rgba(255,255,255,0.9)',
            color: '#000',
            padding: 8,
            borderRadius: 6,
            maxWidth: 320,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {filePath.split(/[/\\]/).pop()}
          </div>
          <div style={{ fontSize: 12 }}>ズーム: {Math.round(scale * 100)}%</div>
          <div style={{ fontSize: 12 }}>回転: {rotate}°</div>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
