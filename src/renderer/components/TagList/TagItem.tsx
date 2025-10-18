// renderer/components/TagList/TagItem.tsx

const TagItem: React.FC<{
  tag: Tag;
  selected: boolean;
  onSelect: () => void;
  onDrop: (files: FileInfo[]) => void;
}> = ({ tag, selected, onSelect, onDrop }) => {
  const dropRef = useRef<HTMLDivElement>(null);
  const { isDragOver, canDrop } = useDropZone(dropRef, {
    accept: ['file'],
    onDrop: files => onDrop(files),
  });

  return (
    <div
      ref={dropRef}
      className={`tag-item ${selected ? 'selected' : ''} ${
        isDragOver ? (canDrop ? 'drag-over-accept' : 'drag-over-reject') : ''
      }`}
      onClick={onSelect}
    >
      <div className="tag-color" style={{ backgroundColor: tag.color }} />
      <span className="tag-name">{tag.tag_name}</span>
      <span className="tag-count">({tag.usage_count})</span>

      {/* ドロップインジケーター */}
      {isDragOver && canDrop && (
        <div className="drop-indicator">
          <PlusIcon size={16} />
          <span>タグを追加</span>
        </div>
      )}
    </div>
  );
};
