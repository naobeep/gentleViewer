// ...new file...
import React from 'react';
import { useThumbnails } from '../hooks/useThumbnails';

type Props = {
  filePaths: string[];
  colCount?: number;
  thumbWidth?: number;
};

export const ThumbnailGrid: React.FC<Props> = ({ filePaths, colCount = 4, thumbWidth = 160 }) => {
  const { thumbnails, start } = useThumbnails(filePaths, { autoStart: true });

  const toFileUrl = (p?: string | null) => {
    if (!p) return undefined;
    // normalize Windows backslashes and ensure file:/// prefix
    const normalized = p.replace(/\\/g, '/');
    if (normalized.startsWith('/')) return `file://${normalized}`;
    return `file:///${normalized}`;
  };

  const cols = Math.max(1, colCount);
  const gap = 8;
  const itemStyle: React.CSSProperties = {
    width: thumbWidth,
    height: Math.round((thumbWidth * 9) / 16),
    objectFit: 'cover',
    background: '#eee',
    borderRadius: 6,
  };

  if (!filePaths || filePaths.length === 0) return <div>表示するファイルがありません</div>;

  return (
    <div>
      <div
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${thumbWidth}px)`, gap }}
      >
        {filePaths.map(fp => {
          const tp = thumbnails[fp];
          const src = toFileUrl(tp);
          return (
            <div key={fp} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {src ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={src} alt="thumbnail" style={itemStyle} />
              ) : (
                <div
                  style={{
                    ...itemStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12 }}>No thumb</div>
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => start([fp])} style={{ fontSize: 12 }}>
                        生成
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  maxWidth: thumbWidth,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fp}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThumbnailGrid;
