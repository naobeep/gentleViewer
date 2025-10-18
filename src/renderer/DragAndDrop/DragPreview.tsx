// renderer/components/DragAndDrop/DragPreview.tsx

interface DragPreviewProps {
  files: FileInfo[];
  position: { x: number; y: number };
}

/**
 * ドラッグ中のプレビュー表示
 */
const DragPreview: React.FC<DragPreviewProps> = ({ files, position }) => {
  const previewFile = files[0];
  const additionalCount = files.length - 1;

  return (
    <div
      className="drag-preview"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      <div className="preview-card">
        {/* サムネイル */}
        {previewFile.thumbnailPath ? (
          <img
            src={`file://${previewFile.thumbnailPath}`}
            alt={previewFile.file_name}
            className="preview-thumbnail"
          />
        ) : (
          <div className="preview-icon">
            {getFileTypeIcon(previewFile.file_type)}
          </div>
        )}

        {/* ファイル情報 */}
        <div className="preview-info">
          <div className="preview-name">{previewFile.file_name}</div>
          {additionalCount > 0 && (
            <div className="preview-count">+{additionalCount}ファイル</div>
          )}
        </div>
      </div>

      {/* ドラッグアイコン */}
      <div className="drag-icon">
        <MoveIcon size={16} />
      </div>
    </div>
  );
};
