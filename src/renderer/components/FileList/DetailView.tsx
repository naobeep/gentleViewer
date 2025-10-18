// renderer/components/FileList/DetailView.tsx

interface DetailViewProps {
  files: FileInfo[];
  selectedFiles: FileInfo[];
  onFileSelect: (file: FileInfo, multi: boolean) => void;
  onFileDoubleClick: (file: FileInfo) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const DetailView: React.FC<DetailViewProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onFileDoubleClick,
  sortBy,
  onSortChange,
}) => {
  const columns: Column[] = [
    {
      key: 'select',
      label: '',
      width: 40,
      sortable: false,
      render: file => (
        <input
          type="checkbox"
          checked={selectedFiles.includes(file)}
          onChange={() => onFileSelect(file, true)}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'thumbnail',
      label: '',
      width: 80,
      sortable: false,
      render: file => (
        <div className="detail-thumbnail">
          {file.thumbnailPath ? (
            <img src={`file://${file.thumbnailPath}`} alt="" />
          ) : (
            getFileTypeIcon(file.file_type)
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'ファイル名',
      width: 'auto',
      sortable: true,
      render: file => (
        <div className="detail-name">
          <div className="name-text" title={file.file_name}>
            {file.file_name}
          </div>
          <div className="name-path" title={file.file_path}>
            {file.file_path}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: '種類',
      width: 100,
      sortable: true,
      render: file => (
        <span className="detail-type">{getFileTypeLabel(file.file_type)}</span>
      ),
    },
    {
      key: 'size',
      label: 'サイズ',
      width: 100,
      sortable: true,
      render: file => formatFileSize(file.file_size),
    },
    {
      key: 'metadata',
      label: '詳細',
      width: 150,
      sortable: false,
      render: file => <FileMetadata file={file} />,
    },
    {
      key: 'tags',
      label: 'タグ',
      width: 200,
      sortable: false,
      render: file => (
        <div className="detail-tags">
          {file.tags?.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="tag-chip small"
              style={{ backgroundColor: tag.color }}
            >
              {tag.tag_name}
            </span>
          ))}
          {file.tags && file.tags.length > 3 && (
            <span className="more-tags">+{file.tags.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      label: '更新日時',
      width: 150,
      sortable: true,
      render: file => formatDate(file.updated_at),
    },
  ];

  return (
    <div className="detail-view">
      {/* ヘッダー */}
      <div className="detail-header">
        {columns.map(column => (
          <div
            key={column.key}
            className={`detail-header-cell ${
              column.sortable ? 'sortable' : ''
            }`}
            style={{ width: column.width }}
            onClick={() =>
              column.sortable && onSortChange(column.key as SortOption)
            }
          >
            <span>{column.label}</span>
            {column.sortable && sortBy === column.key && (
              <SortIcon direction="asc" />
            )}
          </div>
        ))}
      </div>

      {/* 行 */}
      <div className="detail-body">
        {files.map(file => (
          <DetailRow
            key={file.id}
            file={file}
            columns={columns}
            selected={selectedFiles.includes(file)}
            onSelect={() => onFileSelect(file, false)}
            onDoubleClick={() => onFileDoubleClick(file)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 詳細表示の行
 */
const DetailRow: React.FC<{
  file: FileInfo;
  columns: Column[];
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}> = ({ file, columns, selected, onSelect, onDoubleClick }) => {
  return (
    <div
      className={`detail-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {columns.map(column => (
        <div
          key={column.key}
          className="detail-cell"
          style={{ width: column.width }}
        >
          {column.render(file)}
        </div>
      ))}
    </div>
  );
};

/**
 * ファイル種類別メタデータ表示
 */
const FileMetadata: React.FC<{ file: FileInfo }> = ({ file }) => {
  switch (file.file_type) {
    case 'archive':
      return <span>{file.image_count || 0}ページ</span>;

    case 'video':
    case 'audio':
      return <span>{formatDuration(file.duration || 0)}</span>;

    case 'pdf':
      return <span>{file.page_count || 0}ページ</span>;

    case 'image':
      return file.width && file.height ? (
        <span>
          {file.width}×{file.height}
        </span>
      ) : null;

    default:
      return null;
  }
};
