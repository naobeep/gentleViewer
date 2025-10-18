// renderer/components/Dialogs/FileAddDialog.tsx
import React, { useState, useEffect } from 'react';

interface FileAddDialogProps {
  isOpen: boolean;
  initialPaths?: string[];
  onClose: () => void;
  onConfirm: (paths: string[], options: ScanOptions) => void;
}

interface ScanOptions {
  recursive: boolean;
  excludeHidden: boolean;
  minFileSize: number;
  skipDuplicates: boolean;
  extensionFilter: string[];
  autoTagging: boolean;
}

/**
 * ファイル追加ダイアログ
 * ファイル/フォルダの選択とスキャンオプション設定
 */
const FileAddDialog: React.FC<FileAddDialogProps> = ({
  isOpen,
  initialPaths = [],
  onClose,
  onConfirm
}) => {
  const [selectedPaths, setSelectedPaths] = useState<string[]>(initialPaths);
  const [options, setOptions] = useState<ScanOptions>({
    recursive: true,
    excludeHidden: true,
    minFileSize: 1024, // 1KB
    skipDuplicates: true,
    extensionFilter: [],
    autoTagging: false,
  });

  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  useEffect(() => {
    if (initialPaths.length > 0) {
      setSelectedPaths(initialPaths);
    }
  }, [initialPaths]);

  // ファイル選択ダイアログ
  const handleSelectFiles = async () => {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'すべてのファイル', extensions: ['*'] },
        { name: '画像アーカイブ', extensions: ['zip'] },
        { name: '動画', extensions: ['mp4', 'webm', 'mkv', 'avi'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: '画像', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
        { name: '音声', extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      setSelectedPaths(prev => [...new Set([...prev, ...result.filePaths])]);
    }
  };

  // フォルダ選択ダイアログ
  const handleSelectFolder = async () => {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openDirectory', 'multiSelections'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      setSelectedPaths(prev => [...new Set([...prev, ...result.filePaths])]);
    }
  };

  // パス削除
  const handleRemovePath = (index: number) => {
    setSelectedPaths(prev => prev.filter((_, i) => i !== index));
  };

  // 推定ファイル数計算
  const handleEstimate = async () => {
    if (selectedPaths.length === 0) return;

    setIsEstimating(true);
    try {
      const count = await window.electronAPI.estimateFileCount(
        selectedPaths,
        options
      );
      setEstimatedCount(count);
    } catch (error) {
      console.error('Failed to estimate:', error);
    } finally {
      setIsEstimating(false);
    }
  };

  // 確認
  const handleConfirm = () => {
    if (selectedPaths.length > 0) {
      onConfirm(selectedPaths, options);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog file-add-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>ファイル追加</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {/* ファイル/フォルダ選択 */}
          <section className="section">
            <h3>追加するファイル/フォルダ</h3>
            <div className="button-group">
              <button onClick={handleSelectFiles}>
                📄 ファイルを選択
              </button>
              <button onClick={handleSelectFolder}>
                📁 フォルダを選択
              </button>
            </div>

            {/* 選択されたパス一覧 */}
            <div className="selected-paths">
              {selectedPaths.length > 0 ? (
                selectedPaths.map((path, index) => (
                  <div key={index} className="path-item">
                    <span className="path-text" title={path}>
                      {path}
                    </span>
                    <button
                      className="remove-button"
                      onClick={() => handleRemovePath(index)}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-paths">
                  ファイルまたはフォルダが選択されていません
                </div>
              )}
            </div>
          </section>

          {/* スキャンオプション */}
          <section className="section">
            <h3>スキャンオプション</h3>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={options.recursive}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  recursive: e.target.checked
                }))}
              />
              サブフォルダを含める
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={options.excludeHidden}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  excludeHidden: e.target.checked
                }))}
              />
              隠しファイルを除外
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={options.skipDuplicates}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  skipDuplicates: e.target.checked
                }))}
              />
              重複ファイルをスキップ
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={options.autoTagging}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  autoTagging: e.target.checked
                }))}
              />
              自動タグ付け（Phase 2）
            </label>

            <div className="input-option">
              <label>最小ファイルサイズ:</label>
              <input
                type="number"
                min="0"
                value={options.minFileSize}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  minFileSize: parseInt(e.target.value) || 0
                }))}
              />
              <span>バイト</span>
            </div>
          </section>

          {/* 推定情報 */}
          {selectedPaths.length > 0 && (
            <section className="section estimate-section">
              <button
                className="estimate-button"
                onClick={handleEstimate}
                disabled={isEstimating}
              >
                {isEstimating ? '計算中...' : '📊 推定ファイル数を計算'}
              </button>

              {estimatedCount !== null && (
                <div className="estimate-result">
                  <InfoIcon />
                  推定: 約 {estimatedCount.toLocaleString()} ファイル
                </div>
              )}
            </section>
          )}
        </div>

        <div className="dialog-footer">
          <button className="secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="primary"
            onClick={handleConfirm}
            disabled={selectedPaths.length === 0}
          >
            追加開始
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoIcon = () => <span>ℹ️</span>;

export default FileAddDialog;