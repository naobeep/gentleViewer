// renderer/components/Dialogs/FileInfoDialog.tsx
import React, { useState, useEffect } from 'react';
import { FileInfo } from '../../types';

interface FileInfoDialogProps {
  file: FileInfo;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

/**
 * ファイル情報ダイアログ
 * ファイルの詳細情報・メタデータを表示
 */
const FileInfoDialog: React.FC<FileInfoDialogProps> = ({
  file,
  isOpen,
  onClose,
  onEdit
}) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file.thumbnailPath) {
      setThumbnail(`file://${file.thumbnailPath}`);
    }
  }, [isOpen, file.thumbnailPath]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog file-info-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>ファイル情報</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {/* サムネイル */}
          {thumbnail && (
            <div className="file-thumbnail">
              <img src={thumbnail} alt={file.file_name} />
            </div>
          )}

          {/* 基本情報 */}
          <section className="info-section">
            <h3>基本情報</h3>
            <div className="info-grid">
              <InfoItem label="ファイル名" value={file.file_name} />
              <InfoItem label="形式" value={file.file_extension.toUpperCase()} />
              <InfoItem label="ファイルサイズ" value={formatFileSize(file.file_size)} />
              <InfoItem
                label="ファイルパス"
                value={file.file_path}
                copyable
              />
            </div>
          </section>

          {/* 日時情報 */}
          <section className="info-section">
            <h3>日時情報</h3>
            <div className="info-grid">
              <InfoItem label="作成日時" value={formatDate(file.created_at)} />
              <InfoItem label="更新日時" value={formatDate(file.updated_at)} />
              <InfoItem label="登録日時" value={formatDate(file.registered_at)} />
            </div>
          </section>

          {/* アーカイブ固有情報 */}
          {file.file_type === 'archive' && (
            <section className="info-section">
              <h3>アーカイブ情報</h3>
              <div className="info-grid">
                <InfoItem label="画像枚数" value={`${file.image_count || 0} ページ`} />
                {file.is_encrypted && (
                  <InfoItem label="暗号化" value="はい" valueClass="warning" />
                )}
              </div>
            </section>
          )}

          {/* 動画/音声固有情報 */}
          {(file.file_type === 'video' || file.file_type === 'audio') && file.duration && (
            <section className="info-section">
              <h3>メディア情報</h3>
              <div className="info-grid">
                <InfoItem label="長さ" value={formatDuration(file.duration)} />
                {file.width && file.height && (
                  <InfoItem label="解像度" value={`${file.width} × ${file.height}`} />
                )}
                {file.codec_video && (
                  <InfoItem label="映像コーデック" value={file.codec_video} />
                )}
                {file.codec_audio && (
                  <InfoItem label="音声コーデック" value={file.codec_audio} />
                )}
                {file.bitrate && (
                  <InfoItem label="ビットレート" value={`${file.bitrate} kbps`} />
                )}
                {file.framerate && (
                  <InfoItem label="フレームレート" value={`${file.framerate} fps`} />
                )}
              </div>
            </section>
          )}

          {/* PDF固有情報 */}
          {file.file_type === 'pdf' && (
            <section className="info-section">
              <h3>PDF情報</h3>
              <div className="info-grid">
                <InfoItem label="ページ数" value={`${file.page_count || 0} ページ`} />
                {file.title && <InfoItem label="タイトル" value={file.title} />}
                {file.artist && <InfoItem label="作成者" value={file.artist} />}
              </div>
            </section>
          )}

          {/* 画像固有情報 */}
          {file.file_type === 'image' && file.width && file.height && (
            <section className="info-section">
              <h3>画像情報</h3>
              <div className="info-grid">
                <InfoItem label="解像度" value={`${file.width} × ${file.height}`} />
                <InfoItem
                  label="アスペクト比"
                  value={`${(file.width / file.height).toFixed(2)}:1`}
                />
              </div>
            </section>
          )}

          {/* タグ情報 */}
          <section className="info-section">
            <h3>タグ ({file.tags?.length || 0})</h3>
            <div className="tag-list">
              {file.tags && file.tags.length > 0 ? (
                file.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="tag-chip"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.tag_name}
                  </span>
                ))
              ) : (
                <p className="no-data">タグが設定されていません</p>
              )}
            </div>
          </section>
        </div>

        <div className="dialog-footer">
          {onEdit && (
            <button className="secondary" onClick={onEdit}>
              タグを編集
            </button>
          )}
          <button className="primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 情報項目コンポーネント
 */
const InfoItem: React.FC<{
  label: string;
  value: string;
  copyable?: boolean;
  valueClass?: string;
}> = ({ label, value, copyable, valueClass }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      // 成功通知（実装は省略）
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className={`info-value ${valueClass || ''}`}>
        {value}
        {copyable && (
          <button
            className="copy-button"
            onClick={handleCopy}
            title="コピー"
          >
            📋
          </button>
        )}
      </span>
    </div>
  );
};

// ヘルパー関数
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default FileInfoDialog;
