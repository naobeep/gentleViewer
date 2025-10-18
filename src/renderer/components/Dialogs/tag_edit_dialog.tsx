// renderer/components/Dialogs/TagEditDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { FileInfo, Tag } from '../../types';

interface TagEditDialogProps {
  files: FileInfo[];
  allTags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileIds: number[], tagIds: number[]) => Promise<void>;
}

/**
 * タグ編集ダイアログ
 * 単一または複数ファイルのタグを編集
 */
const TagEditDialog: React.FC<TagEditDialogProps> = ({
  files,
  allTags,
  isOpen,
  onClose,
  onSave
}) => {
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTagMode, setIsNewTagMode] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1976d2');
  const [saving, setSaving] = useState(false);

  // 初期選択タグの設定
  useEffect(() => {
    if (isOpen && files.length === 1) {
      // 単一ファイルの場合は現在のタグを選択
      const currentTags = files[0].tags?.map(t => t.id) || [];
      setSelectedTags(new Set(currentTags));
    } else if (isOpen && files.length > 1) {
      // 複数ファイルの場合は共通タグのみ選択
      const commonTags = findCommonTags(files);
      setSelectedTags(new Set(commonTags));
    }
  }, [isOpen, files]);

  // 検索フィルター
  const filteredTags = useMemo(() => {
    if (!searchQuery) return allTags;

    const query = searchQuery.toLowerCase();
    return allTags.filter(tag =>
      tag.tag_name.toLowerCase().includes(query)
    );
  }, [allTags, searchQuery]);

  // タグトグル
  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const fileIds = files.map(f => f.id);
      await onSave(fileIds, Array.from(selectedTags));
      onClose();
    } catch (error) {
      console.error('Failed to save tags:', error);
      // エラー通知（実装は省略）
    } finally {
      setSaving(false);
    }
  };

  // 新規タグ作成
  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await window.electronAPI.createTag({
        tag_name: newTagName.trim(),
        color: newTagColor,
      });

      setSelectedTags(prev => new Set(prev).add(newTag.id));
      setIsNewTagMode(false);
      setNewTagName('');
      setNewTagColor('#1976d2');
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  if (!isOpen) return null;

  const isSingleFile = files.length === 1;
  const fileNames = isSingleFile
    ? files[0].file_name
    : `${files.length}件のファイル`;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog tag-edit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>タグ編集</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {/* ファイル情報 */}
          <div className="edit-target">
            <span className="label">編集対象:</span>
            <span className="value">{fileNames}</span>
          </div>

          {/* 検索バー */}
          <div className="tag-search">
            <input
              type="text"
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button
              className="new-tag-button"
              onClick={() => setIsNewTagMode(true)}
              title="新規タグを作成"
            >
              + 新規タグ
            </button>
          </div>

          {/* 新規タグ作成フォーム */}
          {isNewTagMode && (
            <div className="new-tag-form">
              <input
                type="text"
                placeholder="タグ名を入力..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                autoFocus
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
              />
              <button onClick={handleCreateNewTag} disabled={!newTagName.trim()}>
                作成
              </button>
              <button onClick={() => {
                setIsNewTagMode(false);
                setNewTagName('');
              }}>
                キャンセル
              </button>
            </div>
          )}

          {/* タグリスト */}
          <div className="tag-list-container">
            {filteredTags.length > 0 ? (
              <div className="tag-list">
                {filteredTags.map(tag => (
                  <TagItem
                    key={tag.id}
                    tag={tag}
                    selected={selectedTags.has(tag.id)}
                    onToggle={() => handleTagToggle(tag.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="no-tags">
                {searchQuery
                  ? `"${searchQuery}" に一致するタグがありません`
                  : 'タグがありません。新規タグを作成してください。'
                }
              </div>
            )}
          </div>

          {/* 選択サマリー */}
          <div className="selection-summary">
            {selectedTags.size > 0 ? (
              <>
                <span>{selectedTags.size}個のタグを選択中</span>
                <button
                  className="clear-button"
                  onClick={() => setSelectedTags(new Set())}
                >
                  すべて解除
                </button>
              </>
            ) : (
              <span>タグが選択されていません</span>
            )}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * タグアイテムコンポーネント
 */
const TagItem: React.FC<{
  tag: Tag;
  selected: boolean;
  onToggle: () => void;
}> = ({ tag, selected, onToggle }) => {
  return (
    <div
      className={`tag-item ${selected ? 'selected' : ''}`}
      onClick={onToggle}
    >
      <div className="tag-checkbox">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div
        className="tag-color"
        style={{ backgroundColor: tag.color }}
      />

      <div className="tag-info">
        <span className="tag-name">{tag.tag_name}</span>
        <span className="tag-count">({tag.usage_count || 0})</span>
      </div>

      {tag.is_favorite && (
        <span className="favorite-icon" title="お気に入り">
          ⭐
        </span>
      )}
    </div>
  );
};

/**
 * 複数ファイルの共通タグを見つける
 */
const findCommonTags = (files: FileInfo[]): number[] => {
  if (files.length === 0) return [];
  if (files.length === 1) return files[0].tags?.map(t => t.id) || [];

  const tagCounts = new Map<number, number>();

  files.forEach(file => {
    const tagIds = new Set(file.tags?.map(t => t.id) || []);
    tagIds.forEach(tagId => {
      tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
    });
  });

  // すべてのファイルに共通するタグのみ返す
  return Array.from(tagCounts.entries())
    .filter(([_, count]) => count === files.length)
    .map(([tagId]) => tagId);
};

export default TagEditDialog;
