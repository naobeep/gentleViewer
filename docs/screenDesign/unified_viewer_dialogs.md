# 統合ビューワー切替ロジック・ダイアログ設計書

## 目次

1. [統合ビューワー概要](#1-統合ビューワー概要)
2. [ファイル形式判定](#2-ファイル形式判定)
3. [ビューワー切替ロジック](#3-ビューワー切替ロジック)
4. [ナビゲーション制御](#4-ナビゲーション制御)
5. [ファイル情報ダイアログ](#5-ファイル情報ダイアログ)
6. [タグ編集ダイアログ](#6-タグ編集ダイアログ)
7. [ファイル追加ダイアログ](#7-ファイル追加ダイアログ)
8. [共通ダイアログコンポーネント](#8-共通ダイアログコンポーネント)

---

## パート1: 統合ビューワー

### 1. 統合ビューワー概要

#### 1.1 設計思想

```typescript
/**
 * 統合ビューワーの責務:
 * 1. ファイル形式を自動判定
 * 2. 適切なビューワーコンポーネントを選択
 * 3. 統一されたナビゲーション（前/次）を提供
 * 4. 共通のヘッダー・ツールバーを管理
 */
```

#### 1.2 サポートビューワー

```typescript
type ViewerType =
  | 'archive'    // 画像アーカイブ（ZIP）
  | 'video'      // 動画
  | 'pdf'        // PDF
  | 'image'      // 単体画像
  | 'audio'      // 音声
  | 'unsupported'; // 非対応

interface ViewerMapping {
  type: ViewerType;
  extensions: string[];
  component: React.ComponentType<ViewerProps>;
  mimeTypes: string[];
}

const VIEWER_MAPPINGS: ViewerMapping[] = [
  {
    type: 'archive',
    extensions: ['.zip'],
    mimeTypes: ['application/zip'],
    component: ArchiveViewer,
  },
  {
    type: 'video',
    extensions: ['.mp4', '.webm', '.ogv', '.mkv', '.avi'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska'],
    component: VideoViewer,
  },
  {
    type: 'pdf',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    component: PDFViewer,
  },
  {
    type: 'image',
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp'],
    component: ImageViewer,
  },
  {
    type: 'audio',
    extensions: ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/flac'],
    component: AudioPlayer,
  },
];
```

---

### 2. ファイル形式判定

#### 2.1 判定ロジック

```typescript
interface FileTypeDetectionResult {
  viewerType: ViewerType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

const detectFileType = async (file: FileInfo): Promise<FileTypeDetectionResult> => {
  // 1. データベースのfile_typeを優先
  if (file.file_type) {
    const mapping = VIEWER_MAPPINGS.find(m => m.type === file.file_type);
    if (mapping) {
      return {
        viewerType: file.file_type as ViewerType,
        confidence: 'high',
        reason: 'Database metadata',
      };
    }
  }

  // 2. 拡張子チェック
  const ext = path.extname(file.file_name).toLowerCase();
  const byExtension = VIEWER_MAPPINGS.find(m =>
    m.extensions.includes(ext)
  );

  if (byExtension) {
    return {
      viewerType: byExtension.type,
      confidence: 'high',
      reason: `Extension match: ${ext}`,
    };
  }

  // 3. MIMEタイプチェック（ファイルヘッダー解析）
  const mimeType = await detectMimeType(file.file_path);
  const byMime = VIEWER_MAPPINGS.find(m =>
    m.mimeTypes.some(mime => mimeType.startsWith(mime))
  );

  if (byMime) {
    return {
      viewerType: byMime.type,
      confidence: 'medium',
      reason: `MIME type match: ${mimeType}`,
    };
  }

  // 4. 非対応
  return {
    viewerType: 'unsupported',
    confidence: 'low',
    reason: 'No matching viewer found',
  };
};

// MIMEタイプ検出（メインプロセス）
const detectMimeType = async (filePath: string): Promise<string> => {
  return await window.electronAPI.detectMimeType(filePath);
};
```

**メインプロセス実装:**

```typescript
// main/services/mime-detector.ts
import { fileTypeFromFile } from 'file-type';

export const detectMimeType = async (filePath: string): Promise<string> => {
  try {
    const result = await fileTypeFromFile(filePath);
    return result?.mime || 'application/octet-stream';
  } catch (error) {
    console.error('MIME detection failed:', error);
    return 'application/octet-stream';
  }
};
```

---

### 3. ビューワー切替ロジック

#### 3.1 統合ビューワーコンポーネント

```typescript
interface UnifiedViewerProps {
  files: FileInfo[];
  initialIndex: number;
  onClose: () => void;
}

const UnifiedViewer: React.FC<UnifiedViewerProps> = ({
  files,
  initialIndex,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewerType, setViewerType] = useState<ViewerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentFile = files[currentIndex];

  // ファイル形式判定
  useEffect(() => {
    const detectType = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await detectFileType(currentFile);

        if (result.viewerType === 'unsupported') {
          setError(`このファイル形式には対応していません: ${currentFile.file_name}`);
          setViewerType(null);
        } else {
          setViewerType(result.viewerType);
        }
      } catch (err) {
        setError('ファイル形式の判定に失敗しました');
        setViewerType(null);
      } finally {
        setLoading(false);
      }
    };

    detectType();
  }, [currentFile]);

  // ナビゲーション
  const navigation = {
    next: () => {
      if (currentIndex < files.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    },
    prev: () => {
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    },
    goTo: (index: number) => {
      if (index >= 0 && index < files.length) {
        setCurrentIndex(index);
      }
    },
    hasNext: currentIndex < files.length - 1,
    hasPrev: currentIndex > 0,
  };

  // ローディング
  if (loading) {
    return (
      <div className="unified-viewer loading">
        <Spinner size={64} />
        <p>ファイルを読み込んでいます...</p>
      </div>
    );
  }

  // エラー
  if (error || !viewerType) {
    return (
      <div className="unified-viewer error">
        <AlertTriangleIcon size={64} />
        <h3>ファイルを開けません</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => window.electronAPI.openExternal(currentFile.file_path)}>
            外部アプリで開く
          </button>
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    );
  }

  // 通常レンダリング: viewerType に応じたコンポーネントを選択して表示
  return (
    <div className="unified-viewer">
      <ViewerToolbar currentFile={currentFile} navigation={navigation} onClose={onClose} />
      <div className="unified-viewer-body">
        {viewerType === 'image' && <ImageViewer file={currentFile} navigation={navigation} />}
        {viewerType === 'pdf' && <PDFViewer file={currentFile} navigation={navigation} />}
        {viewerType === 'video' && <VideoViewer file={currentFile} navigation={navigation} />}
        {viewerType === 'audio' && <AudioPlayer file={currentFile} navigation={navigation} />}
        {viewerType === 'archive' && <ArchiveViewer file={currentFile} navigation={navigation} />}
        {viewerType === 'unsupported' && (
          <div className="unified-viewer-unsupported">
            <p>このファイルはサポートされていません。</p>
          </div>
        )}
      </div>
    </div>
  );
};

---

## 4. ナビゲーション制御

- 前/次移動はキーボード左右キー、ページ上下キー、及び UI のボタンで可能とする。
- ループなし。最終ファイルで next は無効、最初のファイルで prev は無効。
- サムネイルパネルやファイルリストからの jump は goTo(index) を使用する。
- navigation API（コンポーネント内部で使用）:
  - next(): void
  - prev(): void
  - goTo(index: number): void
  - hasNext: boolean
  - hasPrev: boolean

キーボードハンドリングの例:
```typescript
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') navigation.next();
    if (e.key === 'ArrowLeft') navigation.prev();
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [navigation, onClose]);
```

---

## 5. ファイル情報ダイアログ

目的: 現在表示中のファイルのメタデータを編集・参照する。

必須フィールド:

- ファイル名
- パス（読み取り専用）
- サイズ
- 作成日時 / 更新日時
- タグ一覧（編集可能）
- 備考 / メモ

振る舞い:

- 編集可能なフィールドは保存ボタンで main 側へ送信: window.electronAPI.saveFileMetadata(fileId, metadata)
- 閉じる: モーダルの × ボタン / 外側クリック / Esc
- バリデーション: ファイル名の空文字は不可

簡易 UI スニペット:

```tsx
<Dialog title="ファイル情報" onClose={onClose}>
  <div>
    <label>ファイル名<input value={name} onChange={...} /></label>
    <label>パス<input value={path} readOnly /></label>
    <label>タグ<ChipInput value={tags} onChange={...} /></label>
    <div className="dialog-actions">
      <button onClick={onClose}>キャンセル</button>
      <button onClick={save}>保存</button>
    </div>
  </div>
</Dialog>
```

IPC:

- get-file-metadata (invoke) → main returns metadata
- save-file-metadata (invoke) ← renderer 提出

---

## 6. タグ編集ダイアログ

目的: タグの追加・削除・色変更を行う共通ダイアログ。

機能:

- タグ一覧の表示（色・使用回数）
- 新規タグ追加（名前・色）
- タグの削除（確認ダイアログ）
- フィルタリング（部分一致検索）

IPC:

- get-tags → list of Tag
- save-tag → upsert
- delete-tag → remove

UX:

- 変更は即時プレビュー（保存ボタンで永続化）
- 削除は undo を一定時間可能（トーストで撤回ボタンを表示）

---

## 7. ファイル追加ダイアログ

目的: ユーザーがローカルファイルをアプリに追加するフロー。

フロー:

1. ダイアログでフォルダまたはファイルを選択（ネイティブファイルダイアログを利用）
   - window.electronAPI.openFileDialog(options) を利用
2. 選択結果を確認し、インポートオプション（タグ付与／コピー先／メタデータ取得）を指定
3. 実行ボタンで main 側にファイルリストを送信して取り込みを開始
   - ipc: import-files (invoke) → returns jobId
4. 進捗はサムネイル生成同様にイベントで受信して UI 表示

注意:

- 大量インポート時はバックグラウンドジョブにし、キャンセル／一時停止を可能にすること。

---

## 8. 共通ダイアログコンポーネント

仕様:

- Dialog コンポーネントは portaled root を利用して document.body 直下に配置する。
- props:
  - title?: string
  - isOpen: boolean
  - onClose: () => void
  - size?: 'small' | 'medium' | 'large'
  - ariaLabel?: string
- 動作:
  - フォーカストラップを実装
  - Esc で閉じる
  - 背景クリックで閉じる（オプションで無効化可能）

サンプル型定義:

```ts
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'small'|'medium'|'large';
  disableBackdropClick?: boolean;
}
```

---

## 9. 通信（IPC）設計とイベント一覧

エンドポイント一覧（main <-> renderer）:

同步/非同期ハンドラ:

- invoke('thumbnail-start', string[] filePaths) => { started: true }
- invoke('thumbnail-pause') => { ok: true }
- invoke('thumbnail-resume') => { ok: true }
- invoke('thumbnail-cancel') => { ok: true }

イベント（main -> renderer, subscribe pattern in preload）:

- 'thumbnail-progress' : ThumbnailGenerationProgress
- 'thumbnail-error' : ThumbnailError
- 'execute-search' : SearchQuery (通知的, UI が受けて実行する)
- 'ipc-test-pong' : any (debug)

ファイル・メタデータ:

- invoke('get-file-metadata', fileId) => FileMetadata
- invoke('save-file-metadata', fileId, metadata) => { ok: true }

タグ管理:

- invoke('get-tags') => Tag[]
- invoke('save-tag', Tag) => { ok: true }
- invoke('delete-tag', tagId) => { ok: true }

UI からの例:

```js
const res = await window.electronAPI.startThumbnailGeneration(['/path/a', '/path/b']);
window.electronAPI.onThumbnailProgress(p => { /* update UI */ });
```

---

## 10. 例外処理とユーザーフィードバック

- 長時間処理はトースト＋ステータスバーに進捗を表示。
- エラーはエラーダイアログを出し、原因と再試行ボタンを提示。
- クリティカルな失敗はログ収集（ユーザー許可のもとで）して報告。

---

## 11. アクセシビリティ & テスト要件

- すべてのダイアログに aria-label を付与
- キーボードのみで閉じる／操作できることを E2E テストで検証
- コントラスト比は WCAG AA を目安に配色を調整
- 主要な操作はユニットテストでカバレッジを確保（React Testing Library）

---

## 12. 付録: 用語・型リファレンス（抜粋）

```ts
type ViewerType = 'archive' | 'video' | 'pdf' | 'image' | 'audio' | 'unsupported';

interface ThumbnailGenerationProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  total: number;
  completed: number;
  skipped: number;
  errors: number;
  currentFile?: string;
  startedAt?: number;
  updatedAt?: number;
}
```

---

（終）
