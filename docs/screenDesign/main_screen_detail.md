# Gentle Viewer - メイン画面 詳細設計書

## 目次

1. [画面概要](#1-画面概要)
2. [全体レイアウト](#2-全体レイアウト)
3. [ヘッダー](#3-ヘッダー)
4. [サイドバー](#4-サイドバー)
5. [ファイルリストエリア](#5-ファイルリストエリア)
6. [ステータスバー](#6-ステータスバー)
7. [インタラクション](#7-インタラクション)
8. [コンテキストメニュー](#8-コンテキストメニュー)
9. [状態管理](#9-状態管理)
10. [レスポンシブ対応](#10-レスポンシブ対応)

---

## 1. 画面概要

### 1.1 目的

- ファイルの一覧表示・管理
- タグによる分類・フィルタリング
- ファイルの検索・ソート
- ビューワーへの遷移

### 1.2 主要機能

- ファイル表示（グリッド/リスト）
- タグ選択によるフィルタリング
- 複数ファイルの選択
- ドラッグ&ドロップ対応
- コンテキストメニュー

---

## 2. 全体レイアウト

### 2.1 基本構成

```txt
┌─────────────────────────────────────────────────────────────────────┐
│ ヘッダー (高さ: 64px)                                                │
├───────────┬─────────────────────────────────────────────────────────┤
│           │ ツールバー (高さ: 48px)                                  │
│ サイドバー │ ┌─────────────────────────────────────────────────────┐│
│           │ │                                                       ││
│ (240px)   │ │ ファイルリストエリア                                  ││
│           │ │ (可変高さ)                                            ││
│           │ │                                                       ││
│           │ └─────────────────────────────────────────────────────┘│
├───────────┴─────────────────────────────────────────────────────────┤
│ ステータスバー (高さ: 32px)                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 サイズ定義

```typescript
const LAYOUT = {
  header: {
    height: 64,
    padding: '0 16px',
  },
  sidebar: {
    width: 240,
    minWidth: 200,
    maxWidth: 400,
    resizable: false, // Phase 2で対応
  },
  toolbar: {
    height: 48,
    padding: '8px 16px',
  },
  statusBar: {
    height: 32,
    padding: '0 16px',
  },
};
```

---

## 3. ヘッダー

### 3.1 レイアウト

```txt
┌─────────────────────────────────────────────────────────────────────┐
│ [🎩] Gentle Viewer    [🔍 検索バー (400px)]    [⚙️] [🔒] [─] [□] [×] │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 要素詳細

#### 3.2.1 アプリロゴ & タイトル

```typescript
<div className="header-left">
  <img src="icon.png" width={32} height={32} />
  <h1>Gentle Viewer</h1>
</div>
```

**スタイル:**

- ロゴサイズ: 32x32px
- タイトル: 18px / 600
- 左マージン: 16px

#### 3.2.2 検索バー

```txt
┌──────────────────────────────────────┐
│ 🔍 ファイルを検索...                  │
└──────────────────────────────────────┘
```

**仕様:**

- 幅: 400px（固定）
- 高さ: 40px
- ボーダー: 1px solid divider
- フォーカス時: primary color border
- アイコン: 左側に虫眼鏡アイコン（20px）
- クリアボタン: 入力中のみ表示（右側）

**機能:**

- インクリメンタルサーチ（300msデバウンス）
- ファイル名の部分一致検索
- Enterキーで検索実行
- Escキーでクリア

```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onSearch }) => {
  const debouncedSearch = useDebouncedCallback(onChange, 300);

  return (
    <div className="search-bar">
      <SearchIcon size={20} />
      <input
        type="text"
        value={value}
        onChange={(e) => debouncedSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        placeholder="ファイルを検索..."
      />
      {value && <ClearIcon onClick={() => onChange('')} />}
    </div>
  );
};
```

#### 3.2.3 ヘッダーアクション

```txt
[⚙️ 設定] [🔒 ロック] [─ 最小化] [□ 最大化] [× 閉じる]
```

**ボタン仕様:**

- サイズ: 40x40px
- アイコンサイズ: 20x20px
- ホバー: background-color: hover
- 間隔: 4px

**ショートカット:**

- ⚙️ 設定: `Ctrl + ,`
- 🔒 ロック: `Ctrl + L`
- 最小化: `Alt + F9`
- 最大化: `Alt + F10`
- 閉じる: `Alt + F4`

---

## 4. サイドバー

### 4.1 全体構成

```txt
┌───────────────────────────┐
│ サイドバー (240px)         │
├───────────────────────────┤
│ [クイックアクセス]         │
│  📁 最近追加               │
│  ⭐ お気に入り             │
│  🔖 保存済み検索           │
│  📊 統計                   │
├───────────────────────────┤
│ [タグ一覧]                 │
│  🔍 [タグを検索...]        │
│  ────────────────────     │
│  [+ 新規タグ]              │
│  ────────────────────     │
│  ☑ 🔵 漫画 (87)    [⭐]   │
│  ☑ 🟢 イラスト (125) [⭐]  │
│  ☐ 🔴 写真集 (43)          │
│  ☐ 🟡 動画 (24)            │
│    ▼ アニメ (12)           │
│    ▼ 実写 (12)             │
│  ☐ 🟣 PDF (8)              │
│  ☐ 🟠 音声 (15)            │
│  ────────────────────     │
│  👁️ 隠しタグを表示         │
│     (Ctrl+Shift+H)         │
└───────────────────────────┘
```

### 4.2 クイックアクセスセクション

**各項目の仕様:**

```typescript
interface QuickAccessItem {
  icon: ReactNode;
  label: string;
  count?: number;
  query: SearchQuery;
  shortcut?: string;
}

const quickAccessItems: QuickAccessItem[] = [
  {
    icon: <FolderIcon />,
    label: '最近追加',
    count: 45,
    query: { dateRange: [sevenDaysAgo, now] },
  },
  {
    icon: <StarIcon />,
    label: 'お気に入り',
    count: 23,
    query: { favorite: true },
  },
  {
    icon: <BookmarkIcon />,
    label: '保存済み検索',
    onClick: () => openSavedSearches(),
  },
  {
    icon: <ChartIcon />,
    label: '統計',
    onClick: () => openStatistics(),
  },
];
```

**スタイル:**

- 高さ: 40px
- パディング: 8px 16px
- ホバー: background-color: hover
- 選択状態: background-color: primary (10% opacity)

### 4.3 タグ検索ボックス

```txt
┌──────────────────────────┐
│ 🔍 タグを検索...          │
└──────────────────────────┘
```

**機能:**

- FTS5による部分一致検索
- インクリメンタルサーチ
- ひらがな→カタカナ自動変換
- 最大20件の候補表示

```typescript
const TagSearchBox: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);

  const searchTags = useDebouncedCallback(async (q: string) => {
    if (q.length > 0) {
      const results = await window.electronAPI.searchTags(q);
      setSuggestions(results.slice(0, 20));
    } else {
      setSuggestions([]);
    }
  }, 300);

  return (
    <div className="tag-search">
      <SearchIcon size={16} />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          searchTags(e.target.value);
        }}
        placeholder="タグを検索..."
      />
      {suggestions.length > 0 && (
        <SuggestionList suggestions={suggestions} />
      )}
    </div>
  );
};
```

### 4.4 新規タグボタン

```txt
┌──────────────────────────┐
│ [+] 新規タグを作成        │
└──────────────────────────┘
```

**仕様:**

- 高さ: 36px
- ボーダー: 1px dashed divider
- クリック: 新規タグダイアログを開く
- ショートカット: `Ctrl + N`

### 4.5 タグアイテム

#### 基本表示

```txt
☑ 🔵 漫画 (87)         [⭐]
│  │  │   │           │
│  │  │   │           └─ お気に入りボタン
│  │  │   └──────────── ファイル数
│  │  └──────────────── タグ名
│  └─────────────────── 色インジケーター
└────────────────────── チェックボックス
```

**サイズ:**

- 高さ: 36px
- パディング: 6px 12px
- 左インデント: 階層ごとに +16px

**状態:**

| 状態 | 背景色 | ボーダー |
|-----|--------|---------|
| 通常 | transparent | none |
| ホバー | hover | none |
| 選択 | primary(10%) | 2px solid primary |
| ドラッグオーバー | primary(20%) | 2px dashed primary |

**インタラクション:**

- クリック: チェックボックス切替
- ダブルクリック: タグ編集ダイアログ
- 右クリック: コンテキストメニュー
- ドラッグ: ファイルへのタグ付与

#### 階層表示

```txt
☐ 🟡 動画 (24)         [⭐]
  ▼ アニメ (12)
  ▼ 実写 (12)
```

**折りたたみ:**

- 展開アイコン: ▼（展開時）/ ▶（折りたたみ時）
- アイコンクリックで開閉
- 状態を保存（localStorage）

```typescript
interface TagItemProps {
  tag: Tag;
  level: number;
  selected: boolean;
  onSelect: (tagId: number) => void;
  onToggle?: (tagId: number) => void;
}

const TagItem: React.FC<TagItemProps> = ({
  tag,
  level,
  selected,
  onSelect,
  onToggle
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = tag.children && tag.children.length > 0;

  return (
    <div
      className={`tag-item level-${level}`}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
    >
      {hasChildren && (
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
      )}

      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(tag.id)}
      />

      <div
        className="tag-color-indicator"
        style={{ backgroundColor: tag.color }}
      />

      <span className="tag-name">{tag.name}</span>
      <span className="tag-count">({tag.usage_count})</span>

      {tag.is_favorite && <StarIcon className="favorite-icon" />}

      {expanded && hasChildren && (
        <div className="tag-children">
          {tag.children.map(child => (
            <TagItem
              key={child.id}
              tag={child}
              level={level + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4.6 隠しタグセクション

```txt
────────────────────────
👁️ 隠しタグを表示 (Ctrl+Shift+H)
```

**通常時:**

- グレーアウト表示
- クリックで認証ダイアログ

**表示中:**

```txt
────────────────────────
🔒 隠しタグ
  ☐ [秘密タグ1] (12)
  ☐ [秘密タグ2] (8)
────────────────────────
👁️ 隠しタグを隠す (Ctrl+Shift+H)
```

---

## 5. ファイルリストエリア

### 5.1 ツールバー

```txt
┌─────────────────────────────────────────────────────────────┐
│ [≡ 表示] [⊞ グリッド] [↓ 名前順] [🏷️ フィルター] [45/1234] │
└─────────────────────────────────────────────────────────────┘
```

#### 5.1.1 表示切替ボタン

```txt
[≡ 表示切替 ▾]
  ├─ グリッド表示  (Ctrl+1)
  ├─ リスト表示    (Ctrl+2)
  └─ 詳細表示      (Ctrl+3)
```

#### 5.1.2 グリッドサイズボタン

```txt
[⊞ グリッド ▾]
  ├─ 小 (4列 - 160x240px)
  ├─ 中 (3列 - 232x380px)  ← デフォルト
  └─ 大 (2列 - 320x480px)
```

#### 5.1.3 ソートボタン

```txt
[↓ 名前順 ▾]
  ├─ 名前 (昇順/降順)
  ├─ 更新日時 (昇順/降順)
  ├─ サイズ (昇順/降順)
  ├─ ファイル形式
  ├─ 画像枚数 (アーカイブのみ)
  └─ 長さ (動画/音声のみ)
```

#### 5.1.4 タグフィルターボタン

```txt
[🏷️ タグフィルター ▾]
  ├─ AND検索 (すべてのタグを含む) ← デフォルト
  ├─ OR検索 (いずれかのタグを含む)
  └─ NOT検索 (タグを除外)
```

#### 5.1.5 選択カウンター

```txt
選択: 45 / 1,234件
```

### 5.2 グリッド表示

#### 5.2.1 ファイルカード（中サイズ）

```txt
┌───────────────────┐
│                   │
│                   │
│   [サムネイル]     │ 200x300px
│   (200x300px)     │
│                   │
│                   │
├───────────────────┤
│ 📚 manga_vol1.zip │ ← ファイル名（1行省略）
│ 50ページ 12.3MB   │ ← メタ情報
│ 🏷️漫画 🏷️完結     │ ← タグ（最大3つ）
└───────────────────┘
```

**全体サイズ:** 232px × 380px

**構成:**

```typescript
interface FileCardProps {
  file: FileInfo;
  selected: boolean;
  size: 'small' | 'medium' | 'large';
  onSelect: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

const FileCard: React.FC<FileCardProps> = ({
  file,
  selected,
  size,
  onSelect,
  onDoubleClick,
  onContextMenu
}) => {
  return (
    <div
      className={`file-card ${size} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={(e) => handleDragStart(e, file)}
    >
      <div className="thumbnail-container">
        <img
          src={file.thumbnailPath || getDefaultIcon(file.type)}
          alt={`${file.name}のサムネイル`}
          loading="lazy"
        />
        <div className="file-type-badge">
          {getFileTypeIcon(file.type)}
        </div>
        {selected && (
          <div className="selection-overlay">
            <CheckIcon />
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="file-name" title={file.name}>
          {getFileTypeIcon(file.type)} {file.name}
        </div>

        <div className="file-meta">
          {getMetaText(file)}
        </div>

        <div className="file-tags">
          {file.tags.slice(0, 3).map(tag => (
            <TagChip key={tag.id} tag={tag} size="small" />
          ))}
          {file.tags.length > 3 && (
            <span className="more-tags">+{file.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
};
```

**サムネイル表示:**

| ファイル形式 | サムネイル内容 |
|------------|--------------|
| ZIP | 最初の画像 |
| 動画 | 最初のフレーム |
| PDF | 最初のページ |
| 画像 | 画像本体 |
| 音声 | アルバムアート or 🎵アイコン |

**メタ情報の表示:**

```typescript
const getMetaText = (file: FileInfo): string => {
  switch (file.type) {
    case 'archive':
      return `${file.image_count}ページ ${formatSize(file.size)}`;
    case 'video':
    case 'audio':
      return `${formatDuration(file.duration)} ${formatSize(file.size)}`;
    case 'pdf':
      return `${file.page_count}ページ ${formatSize(file.size)}`;
    case 'image':
      return `${file.width}x${file.height} ${formatSize(file.size)}`;
    default:
      return formatSize(file.size);
  }
};
```

**状態表現:**

| 状態 | 表現 |
|-----|------|
| 通常 | shadow-sm |
| ホバー | shadow-hover, translateY(-4px) |
| 選択 | 2px solid primary, チェックマーク表示 |
| ドラッグ中 | opacity: 0.5 |
| ファイル利用不可 | グレースケール + 警告アイコン |

#### 5.2.2 グリッドレイアウト

```css
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
}

/* 仮想スクロール対応 */
.file-grid-virtualized {
  /* react-window使用 */
}
```

### 5.3 リスト表示

```txt
┌──────┬──────────────────┬──────┬──────────┬────────────┬────────┐
│ [✓] │ ファイル名       │ 形式 │ サイズ   │ 更新日時   │ タグ   │
├──────┼──────────────────┼──────┼──────────┼────────────┼────────┤
│ [✓] │ 📚 manga_v1.zip  │ ZIP  │ 12.3 MB  │ 2025-10-01 │🏷️🏷️   │
│ [ ] │ 🎬 video.mp4     │ 動画 │ 523 MB   │ 2025-09-30 │🏷️     │
│ [ ] │ 📄 doc.pdf       │ PDF  │ 2.1 MB   │ 2025-09-28 │🏷️🏷️🏷️ │
└──────┴──────────────────┴──────┴──────────┴────────────┴────────┘
```

**カラム定義:**

```typescript
interface Column {
  key: string;
  label: string;
  width: number | 'auto';
  sortable: boolean;
  renderer?: (file: FileInfo) => ReactNode;
}

const columns: Column[] = [
  {
    key: 'select',
    label: '',
    width: 40,
    sortable: false,
  },
  {
    key: 'name',
    label: 'ファイル名',
    width: 'auto',
    sortable: true,
  },
  {
    key: 'type',
    label: '形式',
    width: 80,
    sortable: true,
  },
  {
    key: 'size',
    label: 'サイズ',
    width: 100,
    sortable: true,
  },
  {
    key: 'updated_at',
    label: '更新日時',
    width: 120,
    sortable: true,
  },
  {
    key: 'tags',
    label: 'タグ',
    width: 200,
    sortable: false,
  },
];
```

**行の高さ:** 48px

**ホバー/選択:**

- ホバー: background-color: hover
- 選択: background-color: primary(10%)

### 5.4 空の状態

```txt
┌─────────────────────────────────┐
│                                 │
│          📂                     │
│                                 │
│    ファイルがありません          │
│                                 │
│  ファイルをドラッグ&ドロップ     │
│  または                         │
│  [+ ファイルを追加]              │
│                                 │
└─────────────────────────────────┘
```

### 5.5 ローディング状態

**スケルトンスクリーン:**

```txt
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│▓▓▓▓▓│ │▓▓▓▓▓│ │▓▓▓▓▓│ │▓▓▓▓▓│ ← 脈動アニメーション
│▓▓▓▓▓│ │▓▓▓▓▓│ │▓▓▓▓▓│ │▓▓▓▓▓│
└─────┘ └─────┘ └─────┘ └─────┘
▭▭▭▭▭  ▭▭▭▭▭  ▭▭▭▭▭  ▭▭▭▭▭
```

---

## 6. ステータスバー

```txt
┌────────────────────────────────────────────────────────────┐
│ 📊 1,234件中 45件選択  合計: 2.3GB  [同期中...]  [v1.0.0] │
└────────────────────────────────────────────────────────────┘
```

### 構成

**左側:**

- ファイル数: `{total}件中 {selected}件選択`
- 合計サイズ: 選択ファイルの合計

**中央:**

- バックグラウンド処理状況
  - ファイルスキャン中
  - サムネイル生成中
  - データベース最適化中

**右側:**

- アプリバージョン

---

## 7. インタラクション

### 7.1 ファイル選択

**単一選択:**

- クリック: ファイルを選択

**複数選択:**

- `Ctrl + クリック`: 追加選択/選択解除
- `Shift + クリック`: 範囲選択
- `Ctrl + A`: すべて選択

**選択状態の視覚化:**

```css
.file-card.selected {
  border: 2px solid var(--primary-main);
  box-shadow: 0 0 0 4px var(--primary-main, 0.1);
}

.file-card.selected .selection-overlay {
  display: flex;
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--primary-main);
  border-radius: 50%;
  width: 24px;
  height: 24px;
}
```

### 7.2 ドラッグ&ドロップ

#### ファイルをタグにドロップ

```typescript
const handleDragStart = (e: DragEvent, file: FileInfo) => {
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({
    type: 'file',
    files: selectedFiles.includes(file) ? selectedFiles : [file]
  }));
};

const handleTagDrop = (e: DragEvent, tag: Tag) => {
  e.preventDefault();
  const data = JSON.parse(e.dataTransfer.getData('application/json'));

  if (data.type === 'file') {
    addTagsToFiles(data.files, [tag.id]);
  }
};
```

#### 外部ファイルをドロップ

```typescript
const handleFileDrop = (e: DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  const paths = files.map(f => f.path);

  openFileAddDialog(paths);
};
```

**ドロップゾーン表示:**

```css
.drop-zone-active {
  border: 2px dashed var(--primary-main);
  background: var(--primary-main, 0.05);
}

.drop-zone-active::after {
  content: 'ファイルをドロップ';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: var(--primary-main);
}
```

---

## 8. コンテキストメニュー

### 8.1 ファイルでの右クリック

```txt
┌────────────────────────────┐
│ ビューワーで開く            │ Enter
│ ─────────────────────────│
│ エクスプローラーで表示      │ Ctrl+E
│ ファイルパスをコピー        │ Ctrl+Shift+C
│ ─────────────────────────│
│ タグを編集...              │ Ctrl+T
│   └ 漫画を追加             │
│   └ イラストを追加          │
│   └ 新規タグ...            │
│ ─────────────────────────│
│ お気に入りに追加            │ Ctrl+D
│ ─────────────────────────│
│ 外部アプリで開く            │
│   └ 既定のプログラム        │
│   └ その他...              │
│ ─────────────────────────│
│ ファイル情報               │ Ctrl+I
│ 削除（登録解除）           │ Delete
└────────────────────────────┘
```

**実装:**

```typescript
interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

const getFileContextMenu = (file: FileInfo): ContextMenuItem[] => [
  {
    label: 'ビューワーで開く',
    icon: <PlayIcon />,
    shortcut: 'Enter',
    onClick: () => openInViewer(file),
  },
  { separator: true },
  {
    label: 'エクスプローラーで表示',
    icon: <FolderIcon />,
    shortcut: 'Ctrl+E',
    onClick: () => window.electronAPI.showInExplorer(file.path),
  },
  {
    label: 'ファイルパスをコピー',
    icon: <CopyIcon />,
    shortcut: 'Ctrl+Shift+C',
    onClick: () => navigator.clipboard.writeText(file.path),
  },
  { separator: true },
  {
    label: 'タグを編集...',
    icon: <TagIcon />,
    shortcut: 'Ctrl+T',
    submenu: [
      ...file.availableTags.map(tag => ({
        label: `${tag.name}を追加`,
        icon: <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: tag.color
        }} />,
        onClick: () => addTag(file, tag),
      })),
      { separator: true },
      {
        label: '新規タグ...',
        icon: <PlusIcon />,
        onClick: () => openNewTagDialog(file),
      },
    ],
  },
  {
    label: file.is_favorite ? 'お気に入りから削除' : 'お気に入りに追加',
    icon: file.is_favorite ? <StarFilledIcon /> : <StarOutlineIcon />,
    shortcut: 'Ctrl+D',
    onClick: () => toggleFavorite(file),
  },
  { separator: true },
  {
    label: '外部アプリで開く',
    icon: <ExternalLinkIcon />,
    submenu: [
      {
        label: '既定のプログラム',
        onClick: () => window.electronAPI.openExternal(file.path),
      },
      { separator: true },
      {
        label: 'その他...',
        onClick: () => openWithDialog(file),
      },
    ],
  },
  { separator: true },
  {
    label: 'ファイル情報',
    icon: <InfoIcon />,
    shortcut: 'Ctrl+I',
    onClick: () => openFileInfoDialog(file),
  },
  {
    label: '削除（登録解除）',
    icon: <TrashIcon />,
    shortcut: 'Delete',
    onClick: () => confirmRemoveFile(file),
    className: 'danger',
  },
];
```

**コンテキストメニューコンポーネント:**

```typescript
interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 画面外に出ないように調整
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={index} className="menu-separator" />;
        }

        return (
          <div
            key={index}
            className={`menu-item ${item.disabled ? 'disabled' : ''} ${item.className || ''}`}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
          >
            {item.icon && <span className="menu-icon">{item.icon}</span>}
            <span className="menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="menu-shortcut">{item.shortcut}</span>
            )}
            {item.submenu && <ChevronRightIcon className="menu-arrow" />}
          </div>
        );
      })}
    </div>
  );
};
```

**スタイル:**

```css
.context-menu {
  position: fixed;
  background: var(--bg-paper);
  border: 1px solid var(--divider);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  min-width: 220px;
  z-index: 9999;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  gap: 8px;
  font-size: 14px;
}

.menu-item:hover:not(.disabled) {
  background: var(--bg-hover);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.danger {
  color: var(--error);
}

.menu-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  font-size: 12px;
  color: var(--text-secondary);
}

.menu-separator {
  height: 1px;
  background: var(--divider);
  margin: 4px 0;
}
```

### 8.2 タグでの右クリック

```txt
┌────────────────────────────┐
│ タグを編集...              │
│ 色を変更                   │
│   └ 🔵 青                  │
│   └ 🔴 赤                  │
│   └ 🟢 緑                  │
│   └ 🟡 黄                  │
│   └ その他...              │
│ ─────────────────────────│
│ お気に入りに追加/削除       │
│ ─────────────────────────│
│ サブタグを作成              │
│ タグをマージ...             │
│ ─────────────────────────│
│ 隠しタグに設定/解除         │
│ ─────────────────────────│
│ 削除...                    │
└────────────────────────────┘
```

```typescript
const getTagContextMenu = (tag: Tag): ContextMenuItem[] => {
  const colorOptions = [
    { name: '青', color: '#1976d2' },
    { name: '赤', color: '#dc004e' },
    { name: '緑', color: '#4caf50' },
    { name: '黄', color: '#ff9800' },
    { name: '紫', color: '#9c27b0' },
    { name: '橙', color: '#ff5722' },
  ];

  return [
    {
      label: 'タグを編集...',
      icon: <EditIcon />,
      onClick: () => openTagEditDialog(tag),
    },
    {
      label: '色を変更',
      icon: <PaletteIcon />,
      submenu: [
        ...colorOptions.map(opt => ({
          label: `${opt.name}`,
          icon: <div style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: opt.color,
            border: tag.color === opt.color ? '2px solid white' : 'none'
          }} />,
          onClick: () => updateTagColor(tag.id, opt.color),
        })),
        { separator: true },
        {
          label: 'その他...',
          icon: <MoreIcon />,
          onClick: () => openColorPicker(tag),
        },
      ],
    },
    { separator: true },
    {
      label: tag.is_favorite ? 'お気に入りから削除' : 'お気に入りに追加',
      icon: tag.is_favorite ? <StarFilledIcon /> : <StarOutlineIcon />,
      onClick: () => toggleTagFavorite(tag),
    },
    { separator: true },
    {
      label: 'サブタグを作成',
      icon: <PlusIcon />,
      onClick: () => openNewSubTagDialog(tag),
    },
    {
      label: 'タグをマージ...',
      icon: <MergeIcon />,
      onClick: () => openTagMergeDialog(tag),
    },
    { separator: true },
    {
      label: tag.is_hidden ? '通常タグに戻す' : '隠しタグに設定',
      icon: tag.is_hidden ? <EyeIcon /> : <EyeOffIcon />,
      onClick: () => toggleTagHidden(tag),
    },
    { separator: true },
    {
      label: '削除...',
      icon: <TrashIcon />,
      onClick: () => confirmDeleteTag(tag),
      className: 'danger',
    },
  ];
};
```

### 8.3 空白エリアでの右クリック

```txt
┌────────────────────────────┐
│ ファイルを追加...          │ Ctrl+O
│ フォルダを追加...          │ Ctrl+Shift+O
│ ─────────────────────────│
│ すべて選択                 │ Ctrl+A
│ 選択を解除                 │ Esc
│ ─────────────────────────│
│ 表示を更新                 │ F5
│ ─────────────────────────│
│ 表示設定                   │
│   └ グリッド表示           │ Ctrl+1
│   └ リスト表示             │ Ctrl+2
│   └ 詳細表示               │ Ctrl+3
└────────────────────────────┘
```

```typescript
const getEmptyAreaContextMenu = (): ContextMenuItem[] => [
  {
    label: 'ファイルを追加...',
    icon: <FileAddIcon />,
    shortcut: 'Ctrl+O',
    onClick: () => openFileAddDialog(),
  },
  {
    label: 'フォルダを追加...',
    icon: <FolderAddIcon />,
    shortcut: 'Ctrl+Shift+O',
    onClick: () => openFolderAddDialog(),
  },
  { separator: true },
  {
    label: 'すべて選択',
    icon: <SelectAllIcon />,
    shortcut: 'Ctrl+A',
    onClick: () => selectAllFiles(),
  },
  {
    label: '選択を解除',
    icon: <DeselectIcon />,
    shortcut: 'Esc',
    onClick: () => deselectAll(),
    disabled: selectedFiles.length === 0,
  },
  { separator: true },
  {
    label: '表示を更新',
    icon: <RefreshIcon />,
    shortcut: 'F5',
    onClick: () => refreshFileList(),
  },
  { separator: true },
  {
    label: '表示設定',
    icon: <ViewIcon />,
    submenu: [
      {
        label: 'グリッド表示',
        shortcut: 'Ctrl+1',
        icon: viewMode === 'grid' ? <CheckIcon /> : null,
        onClick: () => setViewMode('grid'),
      },
      {
        label: 'リスト表示',
        shortcut: 'Ctrl+2',
        icon: viewMode === 'list' ? <CheckIcon /> : null,
        onClick: () => setViewMode('list'),
      },
      {
        label: '詳細表示',
        shortcut: 'Ctrl+3',
        icon: viewMode === 'detail' ? <CheckIcon /> : null,
        onClick: () => setViewMode('detail'),
      },
    ],
  },
];
```

---

## 9. 状態管理

### 9.1 グローバル状態（Zustand）

```typescript
interface MainScreenState {
  // ファイルリスト
  files: FileInfo[];
  selectedFiles: FileInfo[];
  filteredFiles: FileInfo[];

  // タグ
  tags: Tag[];
  selectedTags: number[];
  showHiddenTags: boolean;

  // 表示設定
  viewMode: 'grid' | 'list' | 'detail';
  gridSize: 'small' | 'medium' | 'large';
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';

  // 検索
  searchQuery: string;

  // UI状態
  isLoading: boolean;
  sidebarCollapsed: boolean;

  // アクション
  setFiles: (files: FileInfo[]) => void;
  selectFile: (file: FileInfo, multi?: boolean) => void;
  selectRange: (start: FileInfo, end: FileInfo) => void;
  deselectAll: () => void;

  setSelectedTags: (tagIds: number[]) => void;
  toggleTag: (tagId: number) => void;
  toggleHiddenTags: () => void;

  setViewMode: (mode: ViewMode) => void;
  setGridSize: (size: GridSize) => void;
  setSortBy: (sort: SortOption, order?: SortOrder) => void;

  setSearchQuery: (query: string) => void;

  filterFiles: () => void;
  sortFiles: () => void;
}

const useMainScreenStore = create<MainScreenState>((set, get) => ({
  files: [],
  selectedFiles: [],
  filteredFiles: [],
  tags: [],
  selectedTags: [],
  showHiddenTags: false,
  viewMode: 'grid',
  gridSize: 'medium',
  sortBy: 'name',
  sortOrder: 'asc',
  searchQuery: '',
  isLoading: false,
  sidebarCollapsed: false,

  setFiles: (files) => {
    set({ files });
    get().filterFiles();
  },

  selectFile: (file, multi = false) => {
    const { selectedFiles } = get();

    if (multi) {
      const index = selectedFiles.findIndex(f => f.id === file.id);
      if (index >= 0) {
        set({ selectedFiles: selectedFiles.filter((_, i) => i !== index) });
      } else {
        set({ selectedFiles: [...selectedFiles, file] });
      }
    } else {
      set({ selectedFiles: [file] });
    }
  },

  selectRange: (start, end) => {
    const { files } = get();
    const startIndex = files.findIndex(f => f.id === start.id);
    const endIndex = files.findIndex(f => f.id === end.id);

    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);

    const rangeFiles = files.slice(min, max + 1);
    set({ selectedFiles: rangeFiles });
  },

  deselectAll: () => set({ selectedFiles: [] }),

  toggleTag: (tagId) => {
    const { selectedTags } = get();
    const index = selectedTags.indexOf(tagId);

    if (index >= 0) {
      set({ selectedTags: selectedTags.filter((_, i) => i !== index) });
    } else {
      set({ selectedTags: [...selectedTags, tagId] });
    }

    get().filterFiles();
  },

  toggleHiddenTags: () => {
    set({ showHiddenTags: !get().showHiddenTags });
    get().filterFiles();
  },

  filterFiles: () => {
    const { files, selectedTags, searchQuery, showHiddenTags } = get();

    let filtered = files;

    // タグフィルター（AND検索）
    if (selectedTags.length > 0) {
      filtered = filtered.filter(file =>
        selectedTags.every(tagId =>
          file.tags.some(tag => tag.id === tagId)
        )
      );
    }

    // 隠しタグフィルター
    if (!showHiddenTags) {
      filtered = filtered.filter(file =>
        !file.tags.some(tag => tag.is_hidden)
      );
    }

    // 検索クエリフィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(query)
      );
    }

    set({ filteredFiles: filtered });
    get().sortFiles();
  },

  sortFiles: () => {
    const { filteredFiles, sortBy, sortOrder } = get();

    const sorted = [...filteredFiles].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'imageCount':
          comparison = (a.image_count || 0) - (b.image_count || 0);
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    set({ filteredFiles: sorted });
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setGridSize: (size) => set({ gridSize: size }),

  setSortBy: (sort, order) => {
    const currentOrder = get().sortOrder;
    const newOrder = order || (get().sortBy === sort ? (currentOrder === 'asc' ? 'desc' : 'asc') : 'asc');

    set({ sortBy: sort, sortOrder: newOrder });
    get().sortFiles();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().filterFiles();
  },
}));
```

### 9.2 ローカル状態（useState）

```typescript
const MainScreen: React.FC = () => {
  // コンテキストメニュー
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  // ドラッグ&ドロップ
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTag, setDragOverTag] = useState<number | null>(null);
  const [draggedFiles, setDraggedFiles] = useState<FileInfo[]>([]);

  // ホバー
  const [hoveredFile, setHoveredFile] = useState<number | null>(null);

  // 選択範囲
  const [selectionAnchor, setSelectionAnchor] = useState<FileInfo | null>(null);

  // ダイアログ
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showFileAddDialog, setShowFileAddDialog] = useState(false);

  return (
    <div className="main-screen">
      {/* ... */}
    </div>
  );
};
```

### 9.3 キャッシュ管理（React Query）

```typescript
// ファイル一覧
const useFiles = () => {
  return useQuery({
    queryKey: ['files'],
    queryFn: () => window.electronAPI.getFiles(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// タグ一覧
const useTags = () => {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => window.electronAPI.getTags(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// 検索
const useSearchFiles = (query: SearchQuery) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => window.electronAPI.searchFiles(query),
    enabled: !!query && (query.tags.length > 0 || !!query.filename),
    staleTime: 1 * 60 * 1000,
  });
};

// ファイルのミューテーション
const useAddFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paths: string[]) => window.electronAPI.scanFiles(paths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

const useRemoveFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: number) => window.electronAPI.removeFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

const useAddTagToFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, tagId }: { fileId: number; tagId: number }) =>
      window.electronAPI.addTagToFile(fileId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};
```

---

## 10. レスポンシブ対応

### 10.1 ウィンドウサイズ別レイアウト

```typescript
const useResponsiveGrid = () => {
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth - 240; // サイドバー幅を引く

      if (width < 1040) {
        setColumnCount(2);
      } else if (width < 1360) {
        setColumnCount(3);
      } else {
        setColumnCount(4);
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);

    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  return columnCount;
};
```

### 10.2 CSS Media Queries

```css
/* 小（1024px - 1280px）: 2列 */
@media (min-width: 1024px) and (max-width: 1280px) {
  .file-grid {
    grid-template-columns: repeat(2, minmax(232px, 1fr));
  }
}

/* 中（1280px - 1600px）: 3列 */
@media (min-width: 1280px) and (max-width: 1600px) {
  .file-grid {
    grid-template-columns: repeat(3, minmax(232px, 1fr));
  }
}

/* 大（1600px以上）: 4列 */
@media (min-width: 1600px) {
  .file-grid {
    grid-template-columns: repeat(4, minmax(232px, 1fr));
  }
}

/* 超小（最小幅1024px未満には対応しない） */
@media (max-width: 1023px) {
  .main-screen {
    min-width: 1024px;
  }
}
```

---

## 11. パフォーマンス最適化

### 11.1 仮想スクロール

```typescript
import { FixedSizeGrid } from 'react-window';

const VirtualizedFileGrid: React.FC<{
  files: FileInfo[];
}> = ({ files }) => {
  const columnCount = useResponsiveGrid();
  const rowCount = Math.ceil(files.length / columnCount);

  const columnWidth = 248; // 232px + 16px gap
  const rowHeight = 396;   // 380px + 16px gap

  return (
    <FixedSizeGrid
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={window.innerHeight - 144} // ヘッダー+ツールバー+ステータスバー
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={window.innerWidth - 240} // サイドバー幅
      overscanRowCount={2}
    >
      {({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * columnCount + columnIndex;
        const file = files[index];

        if (!file) return null;

        return (
          <div style={{ ...style, padding: '8px' }}>
            <FileCard file={file} />
          </div>
        );
      }}
    </FixedSizeGrid>
  );
};
```

### 11.2 メモ化

```typescript
// FileCardのメモ化
const FileCard = React.memo<FileCardProps>(
  ({ file, selected, onSelect, onDoubleClick }) => {
    return (
      <div className="file-card">
        {/* ... */}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.file.id === nextProps.file.id &&
      prevProps.selected === nextProps.selected
    );
  }
);

// フィルタリングのメモ化
const filteredFiles = useMemo(() => {
  return files.filter(file => {
    if (selectedTags.length > 0) {
      return selectedTags.every(tagId =>
        file.tags.some(tag => tag.id === tagId)
      );
    }
    return true;
  });
}, [files, selectedTags]);

// ソートのメモ化
const sortedFiles = useMemo(() => {
  return [...filteredFiles].sort((a, b) => {
    // ソートロジック
  });
}, [filteredFiles, sortBy, sortOrder]);
```

### 11.3 画像遅延読み込み

```typescript
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';

const ThumbnailImage: React.FC<{
  src: string;
  alt: string;
}> = ({ src, alt }) => {
  return (
    <LazyLoadImage
      src={src}
      alt={alt}
      effect="opacity"
      threshold={200}
      placeholder={
        <Skeleton
          variant="rectangular"
          width={200}
          height={300}
          animation="wave"
        />
      }
      onError={(e) => {
        // エラー時はデフォルトアイコンを表示
        e.currentTarget.src = '/assets/default-thumbnail.svg';
      }}
    />
  );
};
```

### 11.4 デバウンス・スロットル

```typescript
import { useDebouncedCallback } from 'use-debounce';

// 検索のデバウンス
const SearchBar: React.FC = () => {
  const setSearchQuery = useMainScreenStore(state => state.setSearchQuery);

  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    300
  );

  return (
    <input
      type="text"
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="ファイルを検索..."
    />
  );
};

// スクロールのスロットル
const useScrollThrottle = (callback: () => void, delay: number) => {
  const throttledCallback = useCallback(
    throttle(callback, delay),
    [callback, delay]
  );

  return throttledCallback;
};
```

---

## 12. アニメーション・トランジション

### 12.1 カードホバー

```css
.file-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.file-card:active {
  transform: translateY(-2px);
}
```

### 12.2 選択アニメーション

```css
.file-card.selected {
  animation: selectPulse 0.3s ease-out;
}

@keyframes selectPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--primary-main);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.3);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.1);
  }
}
```

### 12.3 ドラッグ中のアニメーション

```css
.file-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: rotate(3deg);
}

.tag-item.drag-over {
  background-color: rgba(25, 118, 210, 0.1);
  border: 2px dashed var(--primary-main);
  animation: dragOverPulse 1s ease-in-out infinite;
}

@keyframes dragOverPulse {
  0%, 100% {
    background-color: rgba(25, 118, 210, 0.05);
  }
  50% {
    background-color: rgba(25, 118, 210, 0.15);
  }
}
```

### 12.4 リスト更新のトランジション

```css
.file-list-enter {
  opacity: 0;
  transform: translateY(20px);
}

.file-list-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease-out;
}

.file-list-exit {
  opacity: 1;
}

.file-list-exit-active {
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.2s ease-in;
}
```

---

## 13. エラー処理・エッジケース

### 13.1 ファイルが見つからない

```typescript
const FileCard: React.FC<FileCardProps> = ({ file }) => {
  if (!file.is_available) {
    return (
      <div className="file-card unavailable">
        <div className="thumbnail-container">
          <div className="error-overlay">
            <AlertTriangleIcon size={48} />
            <span>ファイルが見つかりません</span>
          </div>
        </div>
        <div className="card-content">
          <div className="file-name error">{file.name}</div>
          <div className="error-actions">
            <button onClick={() => updateFilePath(file)}>
              パスを更新
            </button>
            <button onClick={() => removeFile(file)}>
              登録解除
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // 通常の表示
  );
};
```

```css
.file-card.unavailable {
  opacity: 0.6;
  filter: grayscale(100%);
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  gap: 8px;
}
```

### 13.2 サムネイル読み込みエラー

```typescript
const ThumbnailImage: React.FC<ThumbnailProps> = ({ file }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className="thumbnail-error">
        <BrokenImageIcon size={48} />
        <span>サムネイル読み込み失敗</span>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <Skeleton
          variant="rectangular"
          width={200}
          height={300}
          animation="wave"
        />
      )}
      <img
        src={file.thumbnailPath}
        alt={file.name}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </>
  );
};
```

### 13.3 大量選択時の警告

```typescript
const handleSelectAll = () => {
  const { files } = useMainScreenStore.getState();

  if (files.length > 1000) {
    showConfirmDialog({
      title: '大量選択の確認',
      message: `${files.length.toLocaleString()}件のファイルを選択します。処理に時間がかかる可能性があります。続行しますか？`,
      confirmText: '選択する',
      cancelText: 'キャンセル',
      onConfirm: () => {
        useMainScreenStore.getState().setSelectedFiles(files);
        showNotification({
          type: 'success',
          message: `${files.length.toLocaleString()}件のファイルを選択しました`,
        });
      },
    });
  } else {
    useMainScreenStore.getState().setSelectedFiles(files);
  }
};
```

### 13.4 空の検索結果

```typescript
const EmptySearchResult: React.FC = () => {
  const searchQuery = useMainScreenStore(state => state.searchQuery);
  const selectedTags = useMainScreenStore(state => state.selectedTags);

  return (
    <div className="empty-search-result">
      <SearchOffIcon size={64} />
      <h3>ファイルが見つかりません</h3>
      <p>検索条件に一致するファイルがありません</p>

      {searchQuery && (
        <div className="search-info">
          検索キーワード: <strong>{searchQuery}</strong>
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="tag-info">
          選択中のタグ: {selectedTags.length}個
        </div>
      )}

      <div className="empty-actions">
        <button onClick={() => {
          useMainScreenStore.getState().setSearchQuery('');
          useMainScreenStore.getState().setSelectedTags([]);
        }}>
          条件をクリア
        </button>
      </div>
    </div>
  );
};
```

---

## 14. アクセシビリティ

### 14.1 キーボードナビゲーション

```typescript
const useKeyboardNavigation = () => {
  const { files, selectedFiles, selectFile, selectRange } = useMainScreenStore();
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const columnCount = getColumnCount();

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, files.length - 1));
          break;

        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;

        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev =>
            Math.min(prev + columnCount, files.length - 1)
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - columnCount, 0));
          break;

        case 'Enter':
          if (files[focusedIndex]) {
            openInViewer(files[focusedIndex]);
          }
          break;

        case ' ':
          e.preventDefault();
          if (files[focusedIndex]) {
            if (e.shiftKey) {
              // Shift+Space: 範囲選択
              const lastSelected = selectedFiles[selectedFiles.length - 1];
              if (lastSelected) {
                selectRange(lastSelected, files[focusedIndex]);
              }
            } else {
              // Space: トグル選択
              selectFile(files[focusedIndex], true);
            }
          }
          break;

        case 'a':
          if (e.ctrlKey) {
            e.preventDefault();
            selectAllFiles();
          }
          break;

        case 'Escape':
          deselectAll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, focusedIndex, selectedFiles]);

  return focusedIndex;
};
```

### 14.2 ARIA属性

```tsx
const FileGrid: React.FC = () => {
  const files = useMainScreenStore(state => state.filteredFiles);
  const selectedFiles = useMainScreenStore(state => state.selectedFiles);

  return (
    <div
      role="grid"
      aria-label="ファイル一覧"
      aria-rowcount={files.length}
      aria-multiselectable="true"
    >
      {files.map((file, index) => (
        <div
          key={file.id}
          role="gridcell"
          aria-label={`${file.name}, ${getMetaText(file)}, ${file.tags.length}個のタグ`}
          aria-selected={selectedFiles.some(f => f.id === file.id)}
          aria-posinset={index + 1}
          aria-setsize={files.length}
          tabIndex={0}
        >
          <FileCard file={file} />
        </div>
      ))}
    </div>
  );
};
```

### 14.3 フォーカス管理

```typescript
const FileCard = React.forwardRef<HTMLDivElement, FileCardProps>(
  ({ file, selected, onSelect, onDoubleClick }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);

    // 選択時にスクロール
    useEffect(() => {
      if (selected && cardRef.current) {
        cardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }, [selected]);

    return (
      <div
        ref={cardRef}
        className={`file-card ${selected ? 'selected' : ''}`}
        tabIndex={0}
        role="button"
        aria-pressed={selected}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {/* カード内容 */}
      </div>
    );
  }
);
```

### 14.4 スクリーンリーダー対応

```tsx
// ライブリージョンで状態変化を通知
const SearchStatus: React.FC = () => {
  const filteredFiles = useMainScreenStore(state => state.filteredFiles);
  const selectedFiles = useMainScreenStore(state => state.selectedFiles);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {filteredFiles.length}件のファイルを表示中。
      {selectedFiles.length > 0 && `${selectedFiles.length}件選択中。`}
    </div>
  );
};

// スクリーンリーダー専用テキスト
const styles = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
`;
```

---

## 15. 実装チェックリスト

### Phase 1: 基本表示（Week 3-4）

- [ ] ヘッダーのレイアウト実装
- [ ] 検索バーの実装
- [ ] サイドバーの基本構造
- [ ] クイックアクセスの実装
- [ ] タグ一覧の表示
- [ ] グリッド表示の実装
- [ ] ファイルカードの表示
- [ ] ステータスバーの実装

### Phase 2: インタラクション（Week 5-6）

- [ ] ファイル選択機能（単一/複数/範囲）
- [ ] タグフィルタリング
- [ ] タグ検索機能
- [ ] ソート機能
- [ ] 検索機能（デバウンス）
- [ ] グリッドサイズ変更
- [ ] リスト表示の実装

### Phase 3: コンテキストメニュー（Week 7）

- [ ] ファイル右クリックメニュー
- [ ] タグ右クリックメニュー
- [ ] 空白エリア右クリックメニュー
- [ ] サブメニューの実装
- [ ] メニュー位置調整（画面外対応）

### Phase 4: ドラッグ&ドロップ（Week 8）

- [ ] ファイルをタグにドロップ
- [ ] 外部ファイルのドロップ
- [ ] ドラッグ中の視覚フィードバック
- [ ] ドロップゾーンの表示

### Phase 5: パフォーマンス（Week 9）

- [ ] 仮想スクロールの実装
- [ ] 画像遅延読み込み
- [ ] React.memoによる最適化
- [ ] useMemoでのフィルタリング最適化
- [ ] デバウンス・スロットル

### Phase 6: アクセシビリティ（Week 10）

- [ ] キーボードナビゲーション
- [ ] ARIA属性の追加
- [ ] フォーカス管理
- [ ] スクリーンリーダー対応
- [ ] ライブリージョンの実装

### Phase 7: エラー処理（Week 11）

- [ ] ファイル未検出の処理
- [ ] サムネイルエラーの処理
- [ ] 空の状態の表示
- [ ] 大量選択の警告
- [ ] ネットワークエラーの処理

### Phase 8: アニメーション（Week 12）

- [ ] ホバーアニメーション
- [ ] 選択アニメーション
- [ ] ドラッグアニメーション
- [ ] リスト更新のトランジション

---

## 16. テストケース

### 16.1 ファイル選択

```typescript
describe('File Selection', () => {
  it('単一選択', () => {
    // ファイルをクリック
    // 選択状態になることを確認
  });

  it('複数選択（Ctrl+クリック）', () => {
    // Ctrl押しながら複数ファイルクリック
    // すべて選択されることを確認
  });

  it('範囲選択（Shift+クリック）', () => {
    // 最初のファイルをクリック
    // Shift押しながら別のファイルをクリック
    // 間のファイルも選択されることを確認
  });

  it('すべて選択（Ctrl+A）', () => {
    // Ctrl+Aキー
    // すべてのファイルが選択されることを確認
  });
});
```

### 16.2 タグフィルタリング

```typescript
describe('Tag Filtering', () => {
  it('単一タグでフィルタ', () => {
    // タグを選択
    // 該当ファイルのみ表示されることを確認
  });

  it('複数タグでAND検索', () => {
    // 複数タグを選択
    // すべてのタグを含むファイルのみ表示
  });

  it('隠しタグの表示切替', () => {
    // 隠しタグ表示をON
    // 隠しタグ付きファイルが表示される
    // OFF にすると非表示になる
  });
});
```

### 16.3 ドラッグ&ドロップ

```typescript
describe('Drag and Drop', () => {
  it('ファイルをタグにドロップ', () => {
    // ファイルをドラッグ開始
    // タグの上でドロップ
    // タグが付与されることを確認
  });

  it('外部ファイルをドロップ', () => {
    // 外部からファイルをドロップ
    // ファイル追加ダイアログが開く
  });
});
```
