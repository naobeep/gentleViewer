// renderer/components/Error/ErrorDisplay.tsx
import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  onClose?: () => void;
  type?: 'error' | 'warning' | 'info';
}

/**
 * 汎用エラー表示コンポーネント
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'エラーが発生しました',
  message,
  details,
  onRetry,
  onClose,
  type = 'error',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  return (
    <div className={`error-display error-${type}`}>
      <div className="error-icon">{getIcon()}</div>
      <div className="error-content">
        <h3 className="error-title">{title}</h3>
        <p className="error-message">{message}</p>
        {details && (
          <details className="error-details">
            <summary>詳細情報</summary>
            <pre>{details}</pre>
          </details>
        )}
      </div>
      <div className="error-actions">
        {onRetry && (
          <button className="primary" onClick={onRetry}>
            再試行
          </button>
        )}
        {onClose && (
          <button className="secondary" onClick={onClose}>
            閉じる
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ファイル読み込みエラー
 */
export const FileLoadError: React.FC<{
  fileName: string;
  error: string;
  onRetry?: () => void;
  onClose: () => void;
}> = ({ fileName, error, onRetry, onClose }) => {
  return (
    <ErrorDisplay
      title="ファイルの読み込みに失敗しました"
      message={`${fileName} を開くことができませんでした。`}
      details={error}
      onRetry={onRetry}
      onClose={onClose}
      type="error"
    />
  );
};

/**
 * ネットワークエラー
 */
export const NetworkError: React.FC<{
  onRetry?: () => void;
  onClose?: () => void;
}> = ({ onRetry, onClose }) => {
  return (
    <ErrorDisplay
      title="ネットワークエラー"
      message="接続に失敗しました。インターネット接続を確認してください。"
      onRetry={onRetry}
      onClose={onClose}
      type="error"
    />
  );
};

/**
 * データベースエラー
 */
export const DatabaseError: React.FC<{
  error: string;
  onClose: () => void;
}> = ({ error, onClose }) => {
  return (
    <ErrorDisplay
      title="データベースエラー"
      message="データベース操作中にエラーが発生しました。"
      details={error}
      onClose={onClose}
      type="error"
    />
  );
};

/**
 * 権限エラー
 */
export const PermissionError: React.FC<{
  resource: string;
  onClose: () => void;
}> = ({ resource, onClose }) => {
  return (
    <ErrorDisplay
      title="アクセス権限がありません"
      message={`${resource} へのアクセスが拒否されました。`}
      details="管理者権限で実行するか、ファイルの権限を確認してください。"
      onClose={onClose}
      type="error"
    />
  );
};

/**
 * 空の状態表示
 */
export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon = '📂', title, message, action }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action && (
        <button className="primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

/**
 * エラーバウンダリ
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          title="予期しないエラー"
          message="アプリケーションでエラーが発生しました。"
          details={this.state.error?.stack}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
          type="error"
        />
      );
    }

    return this.props.children;
  }
}

/**
 * インラインエラー表示（小型）
 */
export const InlineError: React.FC<{
  message: string;
  onDismiss?: () => void;
}> = ({ message, onDismiss }) => {
  return (
    <div className="inline-error">
      <span className="inline-error-icon">⚠</span>
      <span className="inline-error-message">{message}</span>
      {onDismiss && (
        <button className="inline-error-dismiss" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
};
