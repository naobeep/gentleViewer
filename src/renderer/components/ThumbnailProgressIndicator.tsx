import React, { useEffect, useState } from 'react';
import { ThumbnailGenerationProgress, ThumbnailError } from '../../shared/types/thumbnail';

const formatDuration = (sec: number) => {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${s}秒`;
};

export const ThumbnailProgressIndicator: React.FC = () => {
  const isElectronReady = typeof window !== 'undefined' && !!(window as any).electronAPI;

  // フォールバック表示: electronAPI が無い開発環境 (vite) 向け
  if (!isElectronReady) {
    return (
      <div className="thumbnail-progress-indicator dev">
        <span>開発モード: サムネイル進捗は未接続 (electronAPI 未検出)</span>
      </div>
    );
  }

  const [progress, setProgress] = useState<ThumbnailGenerationProgress | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [errors, setErrors] = useState<ThumbnailError[]>([]);

  useEffect(() => {
    const unsub = window.electronAPI.onThumbnailProgress((data) => {
      setProgress(data);
      if (data.status === 'completed') {
        setTimeout(() => setShowDetail(false), 3000);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = window.electronAPI.onThumbnailError((err) => {
      setErrors(prev => [...prev, err]);
    });
    return unsub;
  }, []);

  if (!progress || progress.status === 'idle') return null;

  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <>
      <div className="thumbnail-progress-indicator" onClick={() => setShowDetail(true)}>
        {progress.status === 'running' && (
          <>
            <span className="icon">🔄</span>
            <span>サムネイル生成中 {progress.completed}/{progress.total}</span>
          </>
        )}
        {progress.status === 'completed' && (
          <>
            <span className="icon">✓</span>
            <span>サムネイル生成完了</span>
          </>
        )}
        {progress.status === 'error' && (
          <>
            <span className="icon">⚠</span>
            <span>サムネイル生成エラー</span>
          </>
        )}
      </div>

      {showDetail && (
        <div className="thumbnail-progress-detail">
          <div className="detail-header">
            <h3>サムネイル生成</h3>
            <button onClick={() => setShowDetail(false)}>×</button>
          </div>
          <div className="detail-content">
            <p>進捗: {progress.completed} / {progress.total} ファイル ({percentage.toFixed(1)}%)</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percentage}%` }} />
            </div>

            {progress.currentFile && <p>処理中: {progress.currentFile}</p>}
            {progress.estimatedTimeRemaining != null && <p>残り時間: 約 {formatDuration(progress.estimatedTimeRemaining)}</p>}

            <div className="stats-grid">
              <div className="stat-item">
                <span className="label">成功</span>
                <span className="value success">{progress.completed - progress.errors}</span>
              </div>
              <div className="stat-item">
                <span className="label">スキップ</span>
                <span className="value">{progress.skipped}</span>
              </div>
              <div className="stat-item">
                <span className="label">エラー</span>
                <span className="value error">{progress.errors}</span>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="error-list">
                <h4>エラー ({errors.length}件)</h4>
                {errors.slice(0, 5).map((e, i) => (
                  <div key={i}>
                    <span>{e.fileName}</span>
                    <span>{e.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="detail-footer">
            {progress.status === 'running' ? (
              <button onClick={() => window.electronAPI.pauseThumbnailGeneration()}>一時停止</button>
            ) : progress.status === 'paused' ? (
              <button onClick={() => window.electronAPI.resumeThumbnailGeneration()}>再開</button>
            ) : null}
            <button onClick={async () => { await window.electronAPI.cancelThumbnailGeneration(); setShowDetail(false); }}>キャンセル</button>
            <button className="primary" onClick={() => setShowDetail(false)}>バックグラウンド実行</button>
          </div>
        </div>
      )}
    </>
  );
};
