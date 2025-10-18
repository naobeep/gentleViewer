# 統合ビューワー切替ロジック・ダイアログ設計書

## 目次

### パート1: 統合ビューワー

1. [統合ビューワー概要](#1-統合ビューワー概要)
2. [ファイル形式判定](#2-ファイル形式判定)
3. [ビューワー切替ロジック](#3-ビューワー切替ロジック)
4. [ナビゲーション制御](#4-ナビゲーション制御)

### パート2: ダイアログ

5. [ファイル情報ダイアログ](#5-ファイル情報ダイアログ)
6. [タグ編集ダイアログ](#6-タグ編集ダイアログ)
7. [ファイル追加ダイアログ](#7-ファイル追加ダイアログ)
8. [共通ダイアログコンポーネント](#8-共通ダイアログコンポーネント)

---

# パート1: 統合ビューワー

## 1. 統合ビューワー概要

### 1.1 設計思想

```typescript
/**
 * 統合ビューワーの責務:
 * 1. ファイル形式を自動判定
 * 2. 適切なビューワーコンポーネントを選択
 * 3. 統一されたナビゲーション（前/次）を提供
 * 4. 共通のヘッダー・ツールバーを管理
 */
```

### 1.2 サポートビューワー

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

## 2. ファイル形式判定

### 2.1 判定ロジック

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

## 3. ビューワー切替ロジック

### 3.1 統合ビューワーコンポーネント

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
          <button onClick={onClose}>閉じる
