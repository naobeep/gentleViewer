// renderer/components/FileList/FileListItem.tsx

const FileListItem: React.FC<{
  file: FileInfo;
  searchQuery: string;
  selected: boolean;
  onClick: () => void;
}> = ({ file, searchQuery, selected, onClick }) => {
  return (
    <div
      className={`file-list-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="file-icon">{getFileTypeIcon(file.file_type)}</div>

      <div className="file-info">
        {/* ファイル名をハイライト */}
        <div className="file-name">
          {highlightText(file.file_name, searchQuery)}
        </div>

        {/* タグ名もハイライト */}
        <div className="file-tags">
          {file.tags?.map(tag => (
            <span
              key={tag.id}
              className="tag-chip"
              style={{ backgroundColor: tag.color }}
            >
              {highlightText(tag.tag_name, searchQuery)}
            </span>
          ))}
        </div>
      </div>

      {/* マッチ数表示 */}
      {searchQuery && (
        <MatchCounter
          fileName={file.file_name}
          tags={file.tags || []}
          query={searchQuery}
        />
      )}
    </div>
  );
};

/**
 * マッチ数カウンター
 */
const MatchCounter: React.FC<{
  fileName: string;
  tags: Tag[];
  query: string;
}> = ({ fileName, tags, query }) => {
  const count = useMemo(() => {
    if (!query) return 0;

    const pattern = new RegExp(escapeRegExp(query), 'gi');
    let total = 0;

    // ファイル名のマッチ
    const fileMatches = fileName.match(pattern);
    if (fileMatches) total += fileMatches.length;

    // タグ名のマッチ
    tags.forEach(tag => {
      const tagMatches = tag.tag_name.match(pattern);
      if (tagMatches) total += tagMatches.length;
    });

    return total;
  }, [fileName, tags, query]);

  if (count === 0) return null;

  return (
    <div className="match-counter" title={`${count}件のマッチ`}>
      {count}
    </div>
  );
};
