import React, { useEffect, useState } from 'react';
import '../styles/screenDesign.css';
import type { ThumbnailGenerationProgress, ThumbnailError } from '../../shared/types/thumbnail';

export const ThumbnailProgressIndicator: React.FC = () => {
  const isElectronReady = typeof window !== 'undefined' && !!(window as any).electronAPI;
  const [progress, setProgress] = useState<ThumbnailGenerationProgress | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [errors, setErrors] = useState<ThumbnailError[]>([]);

  useEffect(() => {
    if (!isElectronReady) return;
    const unsub = window.electronAPI.onThumbnailProgress(data => {
      setProgress(data);
      if (data.status === 'completed') {
        setTimeout(() => setShowDetail(false), 3000);
      }
    });
    return unsub;
  }, [isElectronReady]);

  useEffect(() => {
    if (!isElectronReady) return;
    const unsubErr = window.electronAPI.onThumbnailError(e => {
      setErrors(prev => [...prev, e]);
    });
    return unsubErr;
  }, [isElectronReady]);

  // サムネイル進捗が無い時にもデバッグ用のプレースホルダを表示
  if (!isElectronReady) {
    return <div className="tv-status-dev">開発モード: サムネイル進捗は未接続</div>;
  }

  if (!progress || progress.status === 'idle') {
    return (
      <div className="tv-status-badge tv-status-idle">
        <span className="tv-status-icon">🖼</span>
        <span className="tv-status-text">サムネイル: 未開始</span>
        <button
          style={{ marginLeft: 8 }}
          onClick={async () => {
            try {
              // 優先: 実装済みの startThumbnailGeneration を呼ぶ
              if ((window as any).electronAPI?.startThumbnailGeneration) {
                // 開発テスト: 空配列では何もしない場合があるため ipcTestPing も送って確認
                await (window as any).electronAPI.startThumbnailGeneration([]);
                // 確認用に ping も送る
                await (window as any).electronAPI.ipcTestPing?.({
                  from: 'renderer-test',
                  ts: Date.now(),
                });
                console.log('startThumbnailGeneration invoked');
              } else if ((window as any).electronAPI?.ipcTestPing) {
                const res = await (window as any).electronAPI.ipcTestPing({
                  from: 'renderer-test',
                  ts: Date.now(),
                });
                console.log('ipcTestPing result', res);
              } else {
                console.warn('no electronAPI.startThumbnailGeneration nor ipcTestPing available');
              }
            } catch (e) {
              console.error('start test failed', e);
            }
          }}
        >
          テスト開始
        </button>
      </div>
    );
  }

  const percentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <>
      <div
        className={`tv-status-badge tv-status-${progress.status}`}
        role="button"
        onClick={() => setShowDetail(s => !s)}
        title={
          progress.status === 'running'
            ? `サムネイル生成中 ${progress.completed}/${progress.total}`
            : undefined
        }
      >
        <span className="tv-status-icon">
          {progress.status === 'running' ? '🔄' : progress.status === 'completed' ? '✓' : '⚠'}
        </span>
        <span className="tv-status-text">
          {progress.status === 'running'
            ? `サムネイル ${progress.completed}/${progress.total}`
            : progress.status === 'completed'
              ? '生成完了'
              : '生成エラー'}
        </span>
      </div>

      {showDetail && (
        <div className="tv-detail-panel" role="dialog" aria-label="サムネイル生成詳細">
          <div className="tv-detail-header">
            <strong>サムネイル生成</strong>
            <button className="tv-close" onClick={() => setShowDetail(false)}>
              ×
            </button>
          </div>

          <div className="tv-detail-body">
            <div className="tv-progress-row">
              <div className="tv-progress-info">
                <div className="tv-progress-label">進捗</div>
                <div className="tv-progress-value">
                  {progress.completed} / {progress.total} ({percentage}%)
                </div>
              </div>
              <div className="tv-progress-bar">
                <div className="tv-progress-fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>

            {progress.currentFile && (
              <div className="tv-current-file">処理中: {progress.currentFile}</div>
            )}

            <div className="tv-stats-grid">
              <div className="tv-stat">
                <div className="tv-stat-label">成功</div>
                <div className="tv-stat-value">
                  {Math.max(0, progress.completed - progress.errors)}
                </div>
              </div>
              <div className="tv-stat">
                <div className="tv-stat-label">スキップ</div>
                <div className="tv-stat-value">{progress.skipped}</div>
              </div>
              <div className="tv-stat">
                <div className="tv-stat-label">エラー</div>
                <div className="tv-stat-value">{progress.errors}</div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="tv-error-list">
                <div className="tv-error-title">最近のエラー</div>
                {errors
                  .slice(-5)
                  .reverse()
                  .map((e, i) => (
                    <div className="tv-error-item" key={i}>
                      <div className="tv-error-file">{e.fileName || e.filePath}</div>
                      <div className="tv-error-msg">{e.error}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="tv-detail-footer">
            {progress.status === 'running' ? (
              <button onClick={() => window.electronAPI.pauseThumbnailGeneration()}>
                一時停止
              </button>
            ) : progress.status === 'paused' ? (
              <button onClick={() => window.electronAPI.resumeThumbnailGeneration()}>再開</button>
            ) : null}
            <button onClick={() => window.electronAPI.cancelThumbnailGeneration()}>
              キャンセル
            </button>
            <button className="primary" onClick={() => setShowDetail(false)}>
              バックグラウンド実行
            </button>
          </div>
        </div>
      )}
    </>
  );
};
