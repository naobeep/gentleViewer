// renderer/components/Loading/LoadingComponents.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

/**
 * 基本スピナー
 */
export const Spinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#1976d2',
}) => {
  const sizeMap = {
    small: 16,
    medium: 32,
    large: 64,
  };

  const dimension = sizeMap[size];

  return (
    <div
      className={`spinner spinner-${size}`}
      style={{
        width: dimension,
        height: dimension,
        borderColor: `${color}33`,
        borderTopColor: color,
      }}
    />
  );
};

/**
 * 全画面ローディング
 */
export const FullScreenLoading: React.FC<{
  message?: string;
  progress?: number;
}> = ({ message = '読み込み中...', progress }) => {
  return (
    <div className="fullscreen-loading">
      <div className="loading-content">
        <Spinner size="large" />
        <p className="loading-message">{message}</p>
        {progress !== undefined && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * インラインローディング
 */
export const InlineLoading: React.FC<{
  message?: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ message, size = 'small' }) => {
  return (
    <div className="inline-loading">
      <Spinner size={size} />
      {message && <span className="inline-loading-message">{message}</span>}
    </div>
  );
};

/**
 * スケルトンローダー
 */
export const Skeleton: React.FC<{
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | 'none';
}> = ({
  variant = 'text',
  width = '100%',
  height = variant === 'text' ? 20 : 100,
  animation = 'wave',
}) => {
  return (
    <div
      className={`skeleton skeleton-${variant} skeleton-${animation}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

/**
 * カードスケルトン（ファイルカード用）
 */
export const FileCardSkeleton: React.FC = () => {
  return (
    <div className="file-card-skeleton">
      <Skeleton variant="rectangular" width={232} height={300} />
      <Skeleton variant="text" width="80%" height={20} />
      <Skeleton variant="text" width="60%" height={16} />
      <div className="skeleton-tags">
        <Skeleton variant="rectangular" width={60} height={24} />
        <Skeleton variant="rectangular" width={80} height={24} />
      </div>
    </div>
  );
};

/**
 * リストアイテムスケルトン
 */
export const ListItemSkeleton: React.FC = () => {
  return (
    <div className="list-item-skeleton">
      <Skeleton variant="rectangular" width={40} height={40} />
      <div className="list-item-skeleton-content">
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
    </div>
  );
};

/**
 * 進捗インジケーター
 */
export const ProgressIndicator: React.FC<{
  current: number;
  total: number;
  message?: string;
  showPercentage?: boolean;
  cancelable?: boolean;
  onCancel?: () => void;
}> = ({
  current,
  total,
  message,
  showPercentage = true,
  cancelable = false,
  onCancel,
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-indicator">
      {message && <p className="progress-message">{message}</p>}

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="progress-info">
          {showPercentage && (
            <span className="progress-percentage">{percentage}%</span>
          )}
          <span className="progress-count">
            {current.toLocaleString()} / {total.toLocaleString()}
          </span>
        </div>
      </div>

      {cancelable && onCancel && (
        <button className="progress-cancel" onClick={onCancel}>
          キャンセル
        </button>
      )}
    </div>
  );
};

/**
 * ファイルスキャン進捗
 */
export const FileScanProgress: React.FC<{
  scannedCount: number;
  currentFile?: string;
  onCancel?: () => void;
}> = ({ scannedCount, currentFile, onCancel }) => {
  return (
    <div className="file-scan-progress">
      <div className="scan-header">
        <Spinner size="medium" />
        <h3>ファイルをスキャン中...</h3>
      </div>

      <div className="scan-stats">
        <p className="scan-count">
          {scannedCount.toLocaleString()} 件のファイルを検出
        </p>
        {currentFile && (
          <p className="scan-current" title={currentFile}>
            {truncateFileName(currentFile, 50)}
          </p>
        )}
      </div>

      {onCancel && (
        <button className="scan-cancel" onClick={onCancel}>
          中止
        </button>
      )}
    </div>
  );
};

/**
 * サムネイル生成進捗
 */
export const ThumbnailProgress: React.FC<{
  current: number;
  total: number;
  currentFile?: string;
}> = ({ current, total, currentFile }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="thumbnail-progress">
      <div className="thumbnail-progress-header">
        <span>サムネイル生成中</span>
        <span className="thumbnail-progress-count">
          {current} / {total}
        </span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {currentFile && (
        <p className="thumbnail-progress-file" title={currentFile}>
          {truncateFileName(currentFile, 40)}
        </p>
      )}
    </div>
  );
};

/**
 * ヘルパー関数
 */
const truncateFileName = (path: string, maxLength: number): string => {
  if (path.length <= maxLength) return path;

  const fileName = path.split(/[/\\]/).pop() || path;
  if (fileName.length <= maxLength) return fileName;

  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.slice(0, -(extension?.length || 0) - 1);
  const truncateLength = maxLength - (extension?.length || 0) - 4;

  return `${nameWithoutExt.slice(0, truncateLength)}...${extension}`;
};
