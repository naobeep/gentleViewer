// renderer/components/UnifiedViewer/UnifiedViewer.tsx
import React, { useEffect, useState } from 'react';
import { FileInfo } from '../../types';
import ArchiveViewer from '../ArchiveViewer/ArchiveViewer';
import VideoViewer from '../VideoViewer/VideoViewer';
import PDFViewer from '../PDFViewer/PDFViewer';
import ImageViewer from '../ImageViewer/ImageViewer';
import AudioPlayer from '../AudioPlayer/AudioPlayer';

interface UnifiedViewerProps {
  file: FileInfo;
  files: FileInfo[];
  onClose: () => void;
  onFileChange?: (file: FileInfo) => void;
}

/**
 * 統合ビューワー - ファイル形式に応じて適切なビューワーを表示
 */
const UnifiedViewer: React.FC<UnifiedViewerProps> = ({
  file,
  files,
  onClose,
  onFileChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    files.findIndex(f => f.id === file.id)
  );

  const currentFile = files[currentIndex];

  // ファイル変更時の通知
  useEffect(() => {
    if (onFileChange) {
      onFileChange(currentFile);
    }
  }, [currentFile, onFileChange]);

  // ナビゲーション関数
  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleGoTo = (index: number) => {
    if (index >= 0 && index < files.length) {
      setCurrentIndex(index);
    }
  };

  // ファイル形式判定
  const renderViewer = () => {
    const fileType = currentFile.file_type;

    switch (fileType) {
      case 'archive':
        return (
          <ArchiveViewer
            file={currentFile}
            onClose={onClose}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={currentIndex < files.length - 1}
            hasPrevious={currentIndex > 0}
          />
        );

      case 'video':
        return (
          <VideoViewer
            file={currentFile}
            files={files}
            initialIndex={currentIndex}
            onClose={onClose}
            onIndexChange={setCurrentIndex}
          />
        );

      case 'pdf':
        return (
          <PDFViewer
            file={currentFile}
            onClose={onClose}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={currentIndex < files.length - 1}
            hasPrevious={currentIndex > 0}
          />
        );

      case 'image':
        return (
          <ImageViewer
            file={currentFile}
            files={files}
            initialIndex={currentIndex}
            onClose={onClose}
            onIndexChange={setCurrentIndex}
          />
        );

      case 'audio':
        return (
          <AudioPlayer
            file={currentFile}
            files={files}
            initialIndex={currentIndex}
            onClose={onClose}
            onIndexChange={setCurrentIndex}
          />
        );

      default:
        return (
          <UnsupportedFileViewer
            file={currentFile}
            onClose={onClose}
          />
        );
    }
  };

  return (
    <div className="unified-viewer">
      {renderViewer()}
    </div>
  );
};

/**
 * 非対応ファイル形式の表示
 */
const UnsupportedFileViewer: React.FC<{
  file: FileInfo;
  onClose: () => void;
}> = ({ file, onClose }) => {
  const handleOpenExternal = () => {
    window.electronAPI.openExternal(file.file_path);
  };

  const handleShowInExplorer = () => {
    window.electronAPI.showInExplorer(file.file_path);
  };

  return (
    <div className="unsupported-viewer">
      <div className="unsupported-content">
        <div className="unsupported-icon">
          <FileQuestionIcon size={64} />
        </div>

        <h2>このファイルは直接表示できません</h2>
        <p className="file-name">{file.file_name}</p>
        <p className="file-type">ファイル形式: {file.file_extension}</p>

        <div className="unsupported-actions">
          <button className="primary" onClick={handleOpenExternal}>
            <ExternalLinkIcon size={16} />
            既定のアプリで開く
          </button>

          <button onClick={handleShowInExplorer}>
            <FolderIcon size={16} />
            エクスプローラーで表示
          </button>

          <button onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="unsupported-info">
          <InfoIcon size={16} />
          このファイル形式は現在サポートされていません。
          外部アプリケーションで開くことができます。
        </div>
      </div>
    </div>
  );
};

// アイコンのプレースホルダー（実際にはlucide-reactから import）
const FileQuestionIcon = ({ size }: { size: number }) => <span>?</span>;
const ExternalLinkIcon = ({ size }: { size: number }) => <span>↗</span>;
const FolderIcon = ({ size }: { size: number }) => <span>📁</span>;
const InfoIcon = ({ size }: { size: number }) => <span>ℹ️</span>;

export default UnifiedViewer;
