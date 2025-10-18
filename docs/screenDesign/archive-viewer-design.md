# 画像アーカイブビューワー 詳細設計書

## 概要・画面構成・アーカイブ処理

---

## 1. ビューワー概要

### 1.1 目的

ZIPアーカイブ内の画像を**解凍せずに**快適に閲覧できる漫画・イラスト集向けビューワー。

### 1.2 主要機能

- **アーカイブ直接読み込み**: 解凍不要
- **見開き表示**: 左右2ページ同時表示
- **右綴じ/左綴じ対応**: 日本語漫画・洋書対応
- **高速ページめくり**: プリロードによる即座切替
- **しおり機能**: 読書位置の記憶
- **全画面モード**: 没入型閲覧体験
- **スライドショー**: 自動ページめくり

### 1.3 対応形式

**アーカイブ:**

- ZIP (Phase 1)
- RAR, 7z, CBZ, CBR (Phase 2)

**画像:**

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)
- BMP (.bmp)
- SVG (.svg) (Phase 2)

---

## 2. 画面構成

### 2.1 全体レイアウト

```txt
┌──────────────────────────────────────────────────────────────┐
│ ヘッダー (高さ: 56px, 自動非表示)                             │
│ [◀] manga_vol1.zip (15/120) [見開き] [右綴じ] [...] [×]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                       画像表示エリア                          │
│                      (可変サイズ)                            │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ フッター (高さ: 48px, 自動非表示)                             │
│ [━━━━━━●━━━━━━━━━━━━━━] 15/120 [fit] [100%]              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 ヘッダー詳細

```txt
┌──────────────────────────────────────────────────────────────┐
│ [◀] manga_vol1.zip (15/120) [≡] [見開き▾] [⚙] [─] [□] [×]   │
└──────────────────────────────────────────────────────────────┘
```

**要素:**

| 要素 | 説明 | サイズ |
|-----|------|-------|
| `[◀]` | 前のファイル | 40x40px |
| ファイル名 | 現在のアーカイブ名 | 可変 |
| `(15/120)` | 現在ページ/総ページ数 | 80px |
| `[≡]` | サムネイルパネル切替 | 40x40px |
| `[見開き▾]` | 表示モード切替 | 100px |
| `[⚙]` | 設定メニュー | 40x40px |
| `[─]` `[□]` `[×]` | ウィンドウ操作 | 40x40px × 3 |

**自動非表示:**

```typescript
const AUTO_HIDE_DELAY = 3000; // 3秒

const useAutoHide = () => {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showHeader = useCallback(() => {
    setVisible(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, AUTO_HIDE_DELAY);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 上部50pxにカーソルがある場合は常に表示
      if (e.clientY < 50) {
        showHeader();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showHeader]);

  return { visible, showHeader };
};
```

### 2.3 フッター詳細

```txt
┌──────────────────────────────────────────────────────────────┐
│ [━━━━━━●━━━━━━━━━━━━━━] 15/120 [幅に合わせる▾] [100%] [⚙]   │
└──────────────────────────────────────────────────────────────┘
```

**要素:**

| 要素 | 説明 |
|-----|------|
| シークバー | ページ移動スライダー |
| `15/120` | 現在ページ/総ページ数 |
| `[幅に合わせる▾]` | フィットモード選択 |
| `[100%]` | ズーム率表示・入力 |
| `[⚙]` | クイック設定 |

---

## 3. アーカイブ処理

### 3.1 アーカイブ読み込み

#### 3.1.1 型定義

```typescript
interface ArchiveLoadResult {
  success: boolean;
  archive: Archive | null;
  error?: string;
}

interface Archive {
  path: string;
  name: string;
  entries: ArchiveEntry[];
  imageEntries: ArchiveEntry[];
  totalSize: number;
  isEncrypted: boolean;
}

interface ArchiveEntry {
  path: string;
  name: string;
  index: number;
  size: number;
  compressedSize: number;
}
```

#### 3.1.2 読み込みフロー

```typescript
const loadArchive = async (filePath: string): Promise<ArchiveLoadResult> => {
  try {
    // 1. ファイル存在確認
    const exists = await window.electronAPI.fileExists(filePath);
    if (!exists) {
      return { success: false, archive: null, error: 'ファイルが見つかりません' };
    }

    // 2. ZIPファイル読み込み
    const buffer = await window.electronAPI.readFile(filePath);
    const zip = await JSZip.loadAsync(buffer);

    // 3. エントリー一覧取得
    const entries: ArchiveEntry[] = [];
    let index = 0;

    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        entries.push({
          path: relativePath,
          name: path.basename(relativePath),
          index: index++,
          size: file._data.uncompressedSize,
          compressedSize: file._data.compressedSize,
        });
      }
    });

    // 4. 画像ファイルのみフィルタリング
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    const imageEntries = entries
      .filter(entry => {
        const ext = path.extname(entry.name).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .sort((a, b) => {
        // 自然順ソート（1.jpg < 2.jpg < 10.jpg）
        return a.path.localeCompare(b.path, undefined, { numeric: true });
      });

    // 5. 暗号化チェック
    const isEncrypted = entries.some(entry => {
      const file = zip.file(entry.path);
      return file && file._data.encrypted;
    });

    if (isEncrypted) {
      return {
        success: false,
        archive: null,
        error: '暗号化されたアーカイブには対応していません'
      };
    }

    const archive: Archive = {
      path: filePath,
      name: path.basename(filePath),
      entries,
      imageEntries,
      totalSize: entries.reduce((sum, e) => sum + e.size, 0),
      isEncrypted,
    };

    return { success: true, archive };

  } catch (error) {
    console.error('Archive load error:', error);
    return {
      success: false,
      archive: null,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};
```

### 3.2 画像抽出

#### 3.2.1 単一画像の抽出

```typescript
interface ExtractImageOptions {
  quality?: 'original' | 'compressed';
  maxWidth?: number;
  maxHeight?: number;
}

const extractImage = async (
  archive: Archive,
  entryIndex: number,
  options: ExtractImageOptions = {}
): Promise<string | null> => {
  try {
    const entry = archive.imageEntries[entryIndex];
    if (!entry) return null;

    // ZIPから画像データ取得
    const buffer = await window.electronAPI.readFile(archive.path);
    const zip = await JSZip.loadAsync(buffer);
    const file = zip.file(entry.path);

    if (!file) return null;

    // ArrayBufferとして取得
    const arrayBuffer = await file.async('arraybuffer');
    const blob = new Blob([arrayBuffer]);

    // Blob URLを生成
    const blobUrl = URL.createObjectURL(blob);

    // 圧縮が必要な場合
    if (options.quality === 'compressed' || options.maxWidth || options.maxHeight) {
      return await compressImage(blobUrl, options);
    }

    return blobUrl;

  } catch (error) {
    console.error('Image extract error:', error);
    return null;
  }
};
```

#### 3.2.2 画像圧縮（オプション）

```typescript
const compressImage = async (
  imageUrl: string,
  options: ExtractImageOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // リサイズ計算
      let width = img.width;
      let height = img.height;

      if (options.maxWidth && width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }

      if (options.maxHeight && height > options.maxHeight) {
        width = (width * options.maxHeight) / height;
        height = options.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // 描画
      ctx.drawImage(img, 0, 0, width, height);

      // Data URLとして出力
      const quality = options.quality === 'compressed' ? 0.85 : 1.0;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageUrl;
  });
};
```

### 3.3 メモリ管理

#### 3.3.1 Blob URL解放

```typescript
class ImageCache {
  private cache: Map<number, string> = new Map();
  private maxSize: number = 50; // 最大50画像

  set(index: number, url: string) {
    // キャッシュサイズ超過時は古いものを削除
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      const oldUrl = this.cache.get(firstKey);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      this.cache.delete(firstKey);
    }

    this.cache.set(index, url);
  }

  get(index: number): string | undefined {
    return this.cache.get(index);
  }

  clear() {
    // すべてのBlob URLを解放
    this.cache.forEach(url => URL.revokeObjectURL(url));
    this.cache.clear();
  }

  remove(index: number) {
    const url = this.cache.get(index);
    if (url) {
      URL.revokeObjectURL(url);
      this.cache.delete(index);
    }
  }
}

const imageCache = new ImageCache();
```

#### 3.3.2 クリーンアップ

```typescript
const ArchiveViewer: React.FC = () => {
  useEffect(() => {
    // コンポーネントアンマウント時にキャッシュクリア
    return () => {
      imageCache.clear();
    };
  }, []);

  // ページ変更時に不要なキャッシュを削除
  useEffect(() => {
    const currentPage = viewerState.currentPage;
    const preloadRange = 3;

    // 現在ページから遠いキャッシュを削除
    imageCache.forEach((url, index) => {
      if (Math.abs(index - currentPage) > preloadRange) {
        imageCache.remove(index);
      }
    });
  }, [viewerState.currentPage]);
};
```

### 3.4 エラーハンドリング

#### 3.4.1 破損アーカイブ

```typescript
const validateArchive = async (archive: Archive): Promise<boolean> => {
  try {
    // 最初の画像を試しに読み込み
    if (archive.imageEntries.length === 0) {
      throw new Error('画像が含まれていません');
    }

    const firstImage = await extractImage(archive, 0);
    if (!firstImage) {
      throw new Error('画像の読み込みに失敗しました');
    }

    // 成功したらクリーンアップ
    URL.revokeObjectURL(firstImage);

    return true;

  } catch (error) {
    console.error('Archive validation failed:', error);
    return false;
  }
};
```

#### 3.4.2 画像読み込みエラー

```typescript
const ImageDisplay: React.FC<{ imageUrl: string | null }> = ({ imageUrl }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className="image-error">
        <AlertTriangleIcon size={64} />
        <p>画像の読み込みに失敗しました</p>
        <button onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="image-loading">
          <Spinner />
          <p>読み込み中...</p>
        </div>
      )}
      <img
        src={imageUrl || ''}
        alt="Page"
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

---

## 4. パフォーマンス最適化

### 4.1 ストリーミング読み込み

```typescript
// JSZipのストリーミングAPI使用
const extractImageStream = async (
  archive: Archive,
  entryIndex: number
): Promise<ReadableStream> => {
  const entry = archive.imageEntries[entryIndex];
  const buffer = await window.electronAPI.readFile(archive.path);
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(entry.path);

  if (!file) {
    throw new Error('File not found in archive');
  }

  // ストリームとして読み込み
  return file.nodeStream();
};
```

### 4.2 Worker活用

```typescript
// archive-worker.ts
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'LOAD_ARCHIVE':
      const result = await loadArchive(payload.path);
      self.postMessage({ type: 'ARCHIVE_LOADED', payload: result });
      break;

    case 'EXTRACT_IMAGE':
      const imageUrl = await extractImage(
        payload.archive,
        payload.index,
        payload.options
      );
      self.postMessage({
        type: 'IMAGE_EXTRACTED',
        payload: { index: payload.index, url: imageUrl }
      });
      break;
  }
};
```

使用例:

```typescript
const useArchiveWorker = () => {
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker('archive-worker.ts');

    workerRef.current.onmessage = (e) => {
      // メッセージ処理
    };

    return () => workerRef.current?.terminate();
  }, []);

  const loadArchive = (path: string) => {
    workerRef.current?.postMessage({
      type: 'LOAD_ARCHIVE',
      payload: { path },
    });
  };

  return { loadArchive };
};
```

---

## ページめくり・表示モード・操作系

---

## 5. ページめくり機能

### 5.1 ページ管理

#### 5.1.1 状態定義

```typescript
interface ViewerState {
  currentPage: number;        // 現在のページ（0始まり）
  totalPages: number;         // 総ページ数
  viewMode: ViewMode;         // 表示モード
  readingDirection: 'rtl' | 'ltr'; // 読み方向
  zoomLevel: number;          // ズーム率
  fitMode: FitMode;           // フィット設定
  isFullscreen: boolean;      // 全画面モード
  isLoading: boolean;         // 読み込み中
  preloadedPages: Set<number>; // プリロード済みページ
}

type ViewMode = 'single' | 'spread' | 'continuous';
type FitMode = 'fit-width' | 'fit-height' | 'fit-page' | 'original' | 'custom';
```

#### 5.1.2 ページ移動

```typescript
const usePageNavigation = (archive: Archive, state: ViewerState) => {
  const [currentPage, setCurrentPage] = useState(0);

  // 次のページへ
  const nextPage = useCallback(() => {
    if (state.viewMode === 'spread') {
      // 見開きの場合は2ページずつ
      const nextPage = Math.min(
        currentPage + 2,
        state.totalPages - 1
      );
      setCurrentPage(nextPage);
    } else {
      const nextPage = Math.min(currentPage + 1, state.totalPages - 1);
      setCurrentPage(nextPage);
    }
  }, [currentPage, state.viewMode, state.totalPages]);

  // 前のページへ
  const prevPage = useCallback(() => {
    if (state.viewMode === 'spread') {
      const prevPage = Math.max(currentPage - 2, 0);
      setCurrentPage(prevPage);
    } else {
      const prevPage = Math.max(currentPage - 1, 0);
      setCurrentPage(prevPage);
    }
  }, [currentPage, state.viewMode]);

  // 特定ページへ
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(0, Math.min(page, state.totalPages - 1));
    setCurrentPage(targetPage);
  }, [state.totalPages]);

  // 最初のページへ
  const goToFirst = () => goToPage(0);

  // 最後のページへ
  const goToLast = () => goToPage(state.totalPages - 1);

  return {
    currentPage,
    nextPage,
    prevPage,
    goToPage,
    goToFirst,
    goToLast,
  };
};
```

### 5.2 プリロード戦略

#### 5.2.1 プリロード範囲

```typescript
interface PreloadConfig {
  forward: number;  // 前方プリロードページ数
  backward: number; // 後方プリロードページ数
}

const DEFAULT_PRELOAD_CONFIG: PreloadConfig = {
  forward: 3,
  backward: 1,
};

const getPreloadPages = (
  currentPage: number,
  totalPages: number,
  viewMode: ViewMode,
  config: PreloadConfig = DEFAULT_PRELOAD_CONFIG
): number[] => {
  const pages: number[] = [];
  const step = viewMode === 'spread' ? 2 : 1;

  // 現在ページ
  pages.push(currentPage);
  if (viewMode === 'spread' && currentPage + 1 < totalPages) {
    pages.push(currentPage + 1);
  }

  // 前方プリロード
  for (let i = 1; i <= config.forward; i++) {
    const page = currentPage + (i * step);
    if (page < totalPages) {
      pages.push(page);
      if (viewMode === 'spread' && page + 1 < totalPages) {
        pages.push(page + 1);
      }
    }
  }

  // 後方プリロード
  for (let i = 1; i <= config.backward; i++) {
    const page = currentPage - (i * step);
    if (page >= 0) {
      pages.push(page);
      if (viewMode === 'spread' && page + 1 < totalPages) {
        pages.push(page + 1);
      }
    }
  }

  return [...new Set(pages)].sort((a, b) => a - b);
};
```

#### 5.2.2 プリロード実行

```typescript
const usePreloader = (archive: Archive, state: ViewerState) => {
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set());
  const preloadQueueRef = useRef<number[]>([]);
  const isPreloadingRef = useRef(false);

  const preloadImage = async (pageIndex: number) => {
    // すでにキャッシュ済みならスキップ
    if (imageCache.get(pageIndex)) {
      return;
    }

    try {
      const imageUrl = await extractImage(archive, pageIndex);
      if (imageUrl) {
        imageCache.set(pageIndex, imageUrl);
        setPreloadedPages(prev => new Set(prev).add(pageIndex));
      }
    } catch (error) {
      console.error(`Failed to preload page ${pageIndex}:`, error);
    }
  };

  const processPreloadQueue = async () => {
    if (isPreloadingRef.current || preloadQueueRef.current.length === 0) {
      return;
    }

    isPreloadingRef.current = true;

    while (preloadQueueRef.current.length > 0) {
      const pageIndex = preloadQueueRef.current.shift()!;
      await preloadImage(pageIndex);
    }

    isPreloadingRef.current = false;
  };

  useEffect(() => {
    const pagesToPreload = getPreloadPages(
      state.currentPage,
      state.totalPages,
      state.viewMode
    );

    // 優先度順にキューに追加（現在ページ→前方→後方）
    preloadQueueRef.current = pagesToPreload.filter(
      page => !preloadedPages.has(page)
    );

    processPreloadQueue();
  }, [state.currentPage, state.viewMode]);

  return { preloadedPages };
};
```

### 5.3 ページめくりアニメーション

#### 5.3.1 スライドアニメーション

```typescript
const PageTransition: React.FC<{
  direction: 'left' | 'right';
  children: ReactNode;
}> = ({ direction, children }) => {
  return (
    <motion.div
      initial={{ x: direction === 'left' ? '100%' : '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'left' ? '-100%' : '100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};
```

#### 5.3.2 フェードアニメーション

```typescript
const PageFade: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};
```

---

## 6. 表示モード

### 6.1 単ページ表示

```typescript
const SinglePageView: React.FC<{
  archive: Archive;
  currentPage: number;
  fitMode: FitMode;
  zoomLevel: number;
}> = ({ archive, currentPage, fitMode, zoomLevel }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      const url = imageCache.get(currentPage) ||
                  await extractImage(archive, currentPage);
      if (url) {
        imageCache.set(currentPage, url);
        setImageUrl(url);
      }
    };

    loadImage();
  }, [currentPage]);

  return (
    <div className="single-page-view">
      <ImageDisplay
        imageUrl={imageUrl}
        fitMode={fitMode}
        zoomLevel={zoomLevel}
      />
    </div>
  );
};
```

### 6.2 見開き表示

#### 6.2.1 右綴じ（日本語漫画）

```typescript
const SpreadViewRTL: React.FC<{
  archive: Archive;
  currentPage: number;
  fitMode: FitMode;
}> = ({ archive, currentPage, fitMode }) => {
  const [rightPage, setRightPage] = useState<string | null>(null);
  const [leftPage, setLeftPage] = useState<string | null>(null);

  useEffect(() => {
    const loadPages = async () => {
      // 右綴じ: 右ページ = currentPage, 左ページ = currentPage + 1
      const rightUrl = imageCache.get(currentPage) ||
                       await extractImage(archive, currentPage);
      const leftUrl = imageCache.get(currentPage + 1) ||
                      await extractImage(archive, currentPage + 1);

      if (rightUrl) {
        imageCache.set(currentPage, rightUrl);
        setRightPage(rightUrl);
      }

      if (leftUrl && currentPage + 1 < archive.imageEntries.length) {
        imageCache.set(currentPage + 1, leftUrl);
        setLeftPage(leftUrl);
      }
    };

    loadPages();
  }, [currentPage]);

  return (
    <div className="spread-view rtl">
      <div className="page-container right">
        <ImageDisplay imageUrl={rightPage} fitMode={fitMode} />
      </div>
      <div className="page-container left">
        {leftPage && <ImageDisplay imageUrl={leftPage} fitMode={fitMode} />}
      </div>
    </div>
  );
};
```

#### 6.2.2 左綴じ（洋書）

```typescript
const SpreadViewLTR: React.FC<{
  archive: Archive;
  currentPage: number;
  fitMode: FitMode;
}> = ({ archive, currentPage, fitMode }) => {
  const [leftPage, setLeftPage] = useState<string | null>(null);
  const [rightPage, setRightPage] = useState<string | null>(null);

  useEffect(() => {
    const loadPages = async () => {
      // 左綴じ: 左ページ = currentPage, 右ページ = currentPage + 1
      const leftUrl = imageCache.get(currentPage) ||
                      await extractImage(archive, currentPage);
      const rightUrl = imageCache.get(currentPage + 1) ||
                       await extractImage(archive, currentPage + 1);

      if (leftUrl) {
        imageCache.set(currentPage, leftUrl);
        setLeftPage(leftUrl);
      }

      if (rightUrl && currentPage + 1 < archive.imageEntries.length) {
        imageCache.set(currentPage + 1, rightUrl);
        setRightPage(rightUrl);
      }
    };

    loadPages();
  }, [currentPage]);

  return (
    <div className="spread-view ltr">
      <div className="page-container left">
        <ImageDisplay imageUrl={leftPage} fitMode={fitMode} />
      </div>
      <div className="page-container right">
        {rightPage && <ImageDisplay imageUrl={rightPage} fitMode={fitMode} />}
      </div>
    </div>
  );
};
```

#### 6.2.3 見開き判定（カバー対応）

```typescript
// 最初のページ（カバー）は単ページ表示
const shouldShowSpread = (currentPage: number, totalPages: number): boolean => {
  // ページ0（カバー）は常に単ページ
  if (currentPage === 0) return false;

  // 最後のページで奇数の場合は単ページ
  if (currentPage === totalPages - 1) return false;

  return true;
};

const SpreadView: React.FC<SpreadViewProps> = (props) => {
  const { currentPage, totalPages, readingDirection } = props;

  if (!shouldShowSpread(currentPage, totalPages)) {
    return <SinglePageView {...props} />;
  }

  return readingDirection === 'rtl'
    ? <SpreadViewRTL {...props} />
    : <SpreadViewLTR {...props} />;
};
```

### 6.3 連続スクロール表示

```typescript
const ContinuousScrollView: React.FC<{
  archive: Archive;
  fitMode: FitMode;
}> = ({ archive, fitMode }) => {
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observerで可視ページを追跡
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const pageIndex = parseInt(entry.target.getAttribute('data-page') || '0');

          if (entry.isIntersecting) {
            setVisiblePages(prev => [...prev, pageIndex]);
          } else {
            setVisiblePages(prev => prev.filter(p => p !== pageIndex));
          }
        });
      },
      { threshold: 0.1 }
    );

    // すべてのページ要素を監視
    const pageElements = containerRef.current?.querySelectorAll('.page');
    pageElements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="continuous-scroll-view" ref={containerRef}>
      {archive.imageEntries.map((_, index) => (
        <ContinuousPage
          key={index}
          archive={archive}
          pageIndex={index}
          fitMode={fitMode}
          isVisible={visiblePages.includes(index)}
        />
      ))}
    </div>
  );
};

const ContinuousPage: React.FC<{
  archive: Archive;
  pageIndex: number;
  fitMode: FitMode;
  isVisible: boolean;
}> = ({ archive, pageIndex, fitMode, isVisible }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      const loadImage = async () => {
        const url = imageCache.get(pageIndex) ||
                    await extractImage(archive, pageIndex);
        if (url) {
          imageCache.set(pageIndex, url);
          setImageUrl(url);
        }
      };
      loadImage();
    }
  }, [isVisible, pageIndex]);

  return (
    <div className="page" data-page={pageIndex}>
      {imageUrl ? (
        <ImageDisplay imageUrl={imageUrl} fitMode={fitMode} />
      ) : (
        <div className="page-placeholder">
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </div>
      )}
    </div>
  );
};
```

---

## 7. ズーム・パン機能

### 7.1 フィットモード

```typescript
interface ImageDimensions {
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const calculateFitScale = (
  image: ImageDimensions,
  viewport: ViewportSize,
  fitMode: FitMode
): number => {
  switch (fitMode) {
    case 'fit-width':
      return viewport.width / image.width;

    case 'fit-height':
      return viewport.height / image.height;

    case 'fit-page': {
      const widthRatio = viewport.width / image.width;
      const heightRatio = viewport.height / image.height;
      return Math.min(widthRatio, heightRatio);
    }

    case 'original':
      return 1.0;

    case 'custom':
      // カスタムズームの場合は現在の値を維持
      return -1;

    default:
      return 1.0;
  }
};
```

### 7.2 ズーム操作

#### 7.2.1 ホイールズーム

```typescript
const useWheelZoom = (
  containerRef: RefObject<HTMLDivElement>,
  onZoom: (delta: number, center: { x: number; y: number }) => void
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        onZoom(delta, { x, y });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, onZoom]);
};
```

#### 7.2.2 ピンチズーム

```typescript
const usePinchZoom = (
  containerRef: RefObject<HTMLDivElement>,
  onZoom: (scale: number, center: { x: number; y: number }) => void
) => {
  const lastDistanceRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = getDistance(e.touches[0], e.touches[1]);
        lastDistanceRef.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const distance = getDistance(e.touches[0], e.touches[1]);
        const scale = distance / lastDistanceRef.current;
        lastDistanceRef.current = distance;

        const rect = container.getBoundingClientRect();
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        onZoom(scale, { x: centerX, y: centerY });
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef, onZoom]);
};

const getDistance = (touch1: Touch, touch2: Touch): number => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};
```

### 7.3 パン操作

```typescript
interface PanState {
  x: number;
  y: number;
}

const usePan = (
  containerRef: RefObject<HTMLDivElement>,
  enabled: boolean
) => {
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // 左クリック
        isDraggingRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;

        setPan(prev => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));

        lastPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = 'grab';
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, containerRef]);

  return { pan, setPan };
};
```

### 7.4 統合ズーム・パンコンポーネント

```typescript
const ZoomablePannable: React.FC<{
  children: ReactNode;
  fitMode: FitMode;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}> = ({ children, fitMode, zoomLevel, onZoomChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.0);
  const { pan, setPan } = usePan(containerRef, scale > 1.0);

  // ズーム処理
  const handleZoom = useCallback((delta: number, center: { x: number; y: number }) => {
    setScale(prev => {
      const newScale = Math.max(0.1, Math.min(prev + delta, 5.0));

      // ズーム中心を維持するためにパン調整
      if (newScale !== prev) {
        const ratio = newScale / prev;
        setPan(prevPan => ({
          x: center.x - (center.x - prevPan.x) * ratio,
          y: center.y - (center.y - prevPan.y) * ratio,
        }));
      }

      onZoomChange(newScale);
      return newScale;
    });
  }, [onZoomChange, setPan]);

  useWheelZoom(containerRef, handleZoom);
  usePinchZoom(containerRef, (s, center) => handleZoom(s - 1, center));

  // フィットモード変更時にスケールリセット
  useEffect(() => {
    if (fitMode !== 'custom') {
      setScale(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [fitMode, setPan]);

  return (
    <div
      ref={containerRef}
      className="zoomable-pannable"
      style={{
        cursor: scale > 1.0 ? 'grab' : 'default',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

---

## 8. キーボード・マウス操作

### 8.1 キーボードショートカット

```typescript
const useViewerKeyboard = (
  navigation: ReturnType<typeof usePageNavigation>,
  viewerActions: ViewerActions
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 修飾キーが押されている場合はスキップ
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        // ページ移動
        case 'ArrowRight':
        case 'PageDown':
        case 'l':
          e.preventDefault();
          navigation.nextPage();
          break;

        case 'ArrowLeft':
        case 'PageUp':
        case 'h':
          e.preventDefault();
          navigation.prevPage();
          break;

        case 'Home':
          e.preventDefault();
          navigation.goToFirst();
          break;

        case 'End':
          e.preventDefault();
          navigation.goToLast();
          break;

        // ズーム
        case '+':
        case '=':
          e.preventDefault();
          viewerActions.zoomIn();
          break;

        case '-':
          e.preventDefault();
          viewerActions.zoomOut();
          break;

        case '0':
          e.preventDefault();
          viewerActions.resetZoom();
          break;

        // フィットモード
        case '1':
          e.preventDefault();
          viewerActions.setFitMode('fit-width');
          break;

        case '2':
          e.preventDefault();
          viewerActions.setFitMode('fit-height');
          break;

        case '3':
          e.preventDefault();
          viewerActions.setFitMode('fit-page');
          break;

        case '4':
          e.preventDefault();
          viewerActions.setFitMode('original');
          break;

        // 表示モード
        case 's':
          e.preventDefault();
          viewerActions.toggleViewMode();
          break;

        case 'r':
          e.preventDefault();
          viewerActions.toggleReadingDirection();
          break;

        // その他
        case 'f':
        case 'F11':
          e.preventDefault();
          viewerActions.toggleFullscreen();
          break;

        case 't':
          e.preventDefault();
          viewerActions.toggleThumbnails();
          break;

        case 'b':
          e.preventDefault();
          viewerActions.toggleBookmark();
          break;

        case 'Escape':
          if (viewerActions.isFullscreen) {
            viewerActions.exitFullscreen();
          } else {
            viewerActions.closeViewer();
          }
          break;

        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            navigation.prevPage();
          } else {
            navigation.nextPage();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, viewerActions]);
};
```

### 8.2 マウス操作

```typescript
const useViewerMouse = (
  containerRef: RefObject<HTMLDivElement>,
  navigation: ReturnType<typeof usePageNavigation>,
  viewerActions: ViewerActions
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // クリックでページ移動
    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickPosition = x / rect.width;

      // 画面を3分割: 左30% / 中央40% / 右30%
      if (clickPosition < 0.3) {
        // 左端クリック: 前のページ
        navigation.prevPage();
      } else if (clickPosition > 0.7) {
        // 右端クリック: 次のページ
        navigation.nextPage();
      }
      // 中央はクリックしても何もしない（パンやズーム用）
    };

    // ダブルクリックで全画面切替
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      viewerActions.toggleFullscreen();
    };

    // 右クリックでコンテキストメニュー
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      viewerActions.showContextMenu(e.clientX, e.clientY);
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('dblclick', handleDoubleClick);
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('dblclick', handleDoubleClick);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [containerRef, navigation, viewerActions]);
};
```

---

## サムネイル・しおり・設定・統合

---

## 9. サムネイルパネル

### 9.1 サムネイル生成

```typescript
interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 120,
  height: 180,
  quality: 0.8,
};

const generateThumbnail = async (
  imageUrl: string,
  options: ThumbnailOptions = DEFAULT_THUMBNAIL_OPTIONS
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // アスペクト比を維持してリサイズ
      const aspectRatio = img.width / img.height;
      let width = options.width;
      let height = options.height;

      if (aspectRatio > width / height) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', options.quality));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
};
```

### 9.2 サムネイルパネルUI

```typescript
const ThumbnailPanel: React.FC<{
  archive: Archive;
  currentPage: number;
  onPageSelect: (page: number) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ archive, currentPage, onPageSelect, isOpen, onClose }) => {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 可視範囲のサムネイルのみ生成
  useEffect(() => {
    const loadVisibleThumbnails = async () => {
      for (let i = visibleRange.start; i < visibleRange.end; i++) {
        if (i >= archive.imageEntries.length) break;
        if (thumbnails.has(i)) continue;

        const imageUrl = await extractImage(archive, i);
        if (imageUrl) {
          const thumbnail = await generateThumbnail(imageUrl);
          setThumbnails(prev => new Map(prev).set(i, thumbnail));
          URL.revokeObjectURL(imageUrl);
        }
      }
    };

    if (isOpen) {
      loadVisibleThumbnails();
    }
  }, [visibleRange, isOpen, archive]);

  // スクロール時に可視範囲を更新
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = 200; // サムネイル高さ + マージン
    const visibleCount = Math.ceil(container.clientHeight / itemHeight);

    const start = Math.floor(scrollTop / itemHeight);
    const end = start + visibleCount + 5; // バッファ

    setVisibleRange({ start, end });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="thumbnail-panel">
      <div className="panel-header">
        <h3>サムネイル一覧</h3>
        <button onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <div
        className="thumbnail-grid"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {archive.imageEntries.map((_, index) => (
          <ThumbnailItem
            key={index}
            index={index}
            thumbnail={thumbnails.get(index)}
            isCurrentPage={index === currentPage}
            onClick={() => onPageSelect(index)}
          />
        ))}
      </div>
    </div>
  );
};

const ThumbnailItem: React.FC<{
  index: number;
  thumbnail?: string;
  isCurrentPage: boolean;
  onClick: () => void;
}> = ({ index, thumbnail, isCurrentPage, onClick }) => {
  return (
    <div
      className={`thumbnail-item ${isCurrentPage ? 'current' : ''}`}
      onClick={onClick}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={`Page ${index + 1}`} />
      ) : (
        <div className="thumbnail-loading">
          <Skeleton variant="rectangular" width={120} height={180} />
        </div>
      )}
      <div className="thumbnail-number">{index + 1}</div>
    </div>
  );
};
```

**スタイル:**

```css
.thumbnail-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: var(--bg-paper);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--divider);
}

.thumbnail-grid {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.thumbnail-item {
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.2s;
}

.thumbnail-item:hover {
  border-color: var(--primary-main);
  transform: scale(1.05);
}

.thumbnail-item.current {
  border-color: var(--primary-main);
  box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.2);
}

.thumbnail-number {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
}
```

---

## 10. しおり機能

### 10.1 しおり管理

```typescript
interface Bookmark {
  fileId: number;
  page: number;
  timestamp: number;
  totalPages: number;
  progress: number; // 0-100
}

const useBookmark = (fileId: number, totalPages: number) => {
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);

  // 読み込み
  useEffect(() => {
    const loadBookmark = async () => {
      const saved = await window.electronAPI.getBookmark(fileId);
      if (saved) {
        setBookmark(saved);
      }
    };
    loadBookmark();
  }, [fileId]);

  // 保存
  const saveBookmark = useCallback(async (page: number) => {
    const progress = Math.round((page / totalPages) * 100);
    const newBookmark: Bookmark = {
      fileId,
      page,
      timestamp: Date.now(),
      totalPages,
      progress,
    };

    await window.electronAPI.saveBookmark(newBookmark);
    setBookmark(newBookmark);
  }, [fileId, totalPages]);

  // 削除
  const removeBookmark = useCallback(async () => {
    await window.electronAPI.deleteBookmark(fileId);
    setBookmark(null);
  }, [fileId]);

  return { bookmark, saveBookmark, removeBookmark };
};
```

### 10.2 自動保存

```typescript
const useAutoSaveBookmark = (
  fileId: number,
  currentPage: number,
  totalPages: number,
  saveBookmark: (page: number) => void
) => {
  const saveTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // 5秒ごとに自動保存
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveBookmark(currentPage);
    }, 5000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [currentPage, saveBookmark]);

  // ビューワーを閉じる時に保存
  useEffect(() => {
    return () => {
      saveBookmark(currentPage);
    };
  }, [currentPage, saveBookmark]);
};
```

### 10.3 しおり復帰確認

```typescript
const BookmarkResume: React.FC<{
  bookmark: Bookmark;
  onResume: () => void;
  onStartOver: () => void;
}> = ({ bookmark, onResume, onStartOver }) => {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div className="bookmark-resume-dialog">
      <div className="dialog-content">
        <BookmarkIcon size={48} />
        <h3>前回の続きから読みますか？</h3>
        <p>
          ページ {bookmark.page + 1} / {bookmark.totalPages}
          <span className="progress">（{bookmark.progress}%）</span>
        </p>
        <div className="dialog-actions">
          <button onClick={() => {
            onStartOver();
            setShow(false);
          }}>
            最初から
          </button>
          <button className="primary" onClick={() => {
            onResume();
            setShow(false);
          }}>
            続きから
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 11. 設定メニュー

### 11.1 ビューワー設定

```typescript
interface ViewerSettings {
  // 表示設定
  defaultViewMode: ViewMode;
  defaultReadingDirection: 'rtl' | 'ltr';
  defaultFitMode: FitMode;

  // ページめくり
  pageTransitionAnimation: boolean;
  animationType: 'slide' | 'fade' | 'none';

  // プリロード
  preloadForward: number;
  preloadBackward: number;

  // 自動非表示
  autoHideUI: boolean;
  autoHideDelay: number;

  // その他
  rememberPosition: boolean;
  clickToPage: boolean;
  wheelZoom: boolean;

  // 背景
  backgroundColor: string;
}

const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  defaultViewMode: 'spread',
  defaultReadingDirection: 'rtl',
  defaultFitMode: 'fit-page',
  pageTransitionAnimation: true,
  animationType: 'fade',
  preloadForward: 3,
  preloadBackward: 1,
  autoHideUI: true,
  autoHideDelay: 3000,
  rememberPosition: true,
  clickToPage: true,
  wheelZoom: true,
  backgroundColor: '#1a1a1a',
};
```

### 11.2 設定パネルUI

```typescript
const SettingsPanel: React.FC<{
  settings: ViewerSettings;
  onSettingsChange: (settings: ViewerSettings) => void;
  onClose: () => void;
}> = ({ settings, onSettingsChange, onClose }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = <K extends keyof ViewerSettings>(
    key: K,
    value: ViewerSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h3>ビューワー設定</h3>
        <button onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <div className="settings-content">
        {/* 表示設定 */}
        <section className="settings-section">
          <h4>表示設定</h4>

          <div className="setting-item">
            <label>デフォルト表示モード</label>
            <select
              value={localSettings.defaultViewMode}
              onChange={(e) => handleChange('defaultViewMode', e.target.value as ViewMode)}
            >
              <option value="single">単ページ</option>
              <option value="spread">見開き</option>
              <option value="continuous">連続スクロール</option>
            </select>
          </div>

          <div className="setting-item">
            <label>読み方向</label>
            <select
              value={localSettings.defaultReadingDirection}
              onChange={(e) => handleChange('defaultReadingDirection', e.target.value as 'rtl' | 'ltr')}
            >
              <option value="rtl">右綴じ（漫画）</option>
              <option value="ltr">左綴じ（洋書）</option>
            </select>
          </div>

          <div className="setting-item">
            <label>フィットモード</label>
            <select
              value={localSettings.defaultFitMode}
              onChange={(e) => handleChange('defaultFitMode', e.target.value as FitMode)}
            >
              <option value="fit-width">幅に合わせる</option>
              <option value="fit-height">高さに合わせる</option>
              <option value="fit-page">ページ全体</option>
              <option value="original">原寸</option>
            </select>
          </div>

          <div className="setting-item">
            <label>背景色</label>
            <input
              type="color"
              value={localSettings.backgroundColor}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
            />
          </div>
        </section>

        {/* アニメーション */}
        <section className="settings-section">
          <h4>アニメーション</h4>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={localSettings.pageTransitionAnimation}
                onChange={(e) => handleChange('pageTransitionAnimation', e.target.checked)}
              />
              ページめくりアニメーション
            </label>
          </div>

          {localSettings.pageTransitionAnimation && (
            <div className="setting-item">
              <label>アニメーション種類</label>
              <select
                value={localSettings.animationType}
                onChange={(e) => handleChange('animationType', e.target.value as 'slide' | 'fade' | 'none')}
              >
                <option value="slide">スライド</option>
                <option value="fade">フェード</option>
                <option value="none">なし</option>
              </select>
            </div>
          )}
        </section>

        {/* プリロード */}
        <section className="settings-section">
          <h4>プリロード設定</h4>

          <div className="setting-item">
            <label>前方プリロード: {localSettings.preloadForward}ページ</label>
            <input
              type="range"
              min="1"
              max="10"
              value={localSettings.preloadForward}
              onChange={(e) => handleChange('preloadForward', parseInt(e.target.value))}
            />
          </div>

          <div className="setting-item">
            <label>後方プリロード: {localSettings.preloadBackward}ページ</label>
            <input
              type="range"
              min="0"
              max="5"
              value={localSettings.preloadBackward}
              onChange={(e) => handleChange('preloadBackward', parseInt(e.target.value))}
            />
          </div>
        </section>

        {/* UI設定 */}
        <section className="settings-section">
          <h4>UI設定</h4>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={localSettings.autoHideUI}
                onChange={(e) => handleChange('autoHideUI', e.target.checked)}
              />
              UIを自動非表示
            </label>
          </div>

          {localSettings.autoHideUI && (
            <div className="setting-item">
              <label>非表示までの時間: {localSettings.autoHideDelay / 1000}秒</label>
              <input
                type="range"
                min="1000"
                max="10000"
                step="1000"
                value={localSettings.autoHideDelay}
                onChange={(e) => handleChange('autoHideDelay', parseInt(e.target.value))}
              />
            </div>
          )}
        </section>

        {/* その他 */}
        <section className="settings-section">
          <h4>その他</h4>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={localSettings.rememberPosition}
                onChange={(e) => handleChange('rememberPosition', e.target.checked)}
              />
              読書位置を記憶
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={localSettings.clickToPage}
                onChange={(e) => handleChange('clickToPage', e.target.checked)}
              />
              クリックでページ移動
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={localSettings.wheelZoom}
                onChange={(e) => handleChange('wheelZoom', e.target.checked)}
              />
              Ctrl+ホイールでズーム
            </label>
          </div>
        </section>
      </div>

      <div className="panel-footer">
        <button onClick={onClose}>キャンセル</button>
        <button className="primary" onClick={handleSave}>保存</button>
      </div>
    </div>
  );
};
```

---

## 12. スライドショー機能

### 12.1 スライドショー制御

```typescript
interface SlideshowState {
  isPlaying: boolean;
  interval: number; // ミリ秒
  loop: boolean;
}

const useSlideshow = (
  navigation: ReturnType<typeof usePageNavigation>,
  totalPages: number
) => {
  const [state, setState] = useState<SlideshowState>({
    isPlaying: false,
    interval: 3000,
    loop: true,
  });

  const timerRef = useRef<NodeJS.Timeout>();

  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const setInterval = useCallback((interval: number) => {
    setState(prev => ({ ...prev, interval }));
  }, []);

  const toggleLoop = useCallback(() => {
    setState(prev => ({ ...prev, loop: !prev.loop }));
  }, []);

  useEffect(() => {
    if (state.isPlaying) {
      timerRef.current = setTimeout(() => {
        const { currentPage } = navigation;

        if (currentPage >= totalPages - 1) {
          if (state.loop) {
            navigation.goToFirst();
          } else {
            pause();
          }
        } else {
          navigation.nextPage();
        }
      }, state.interval);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state.isPlaying, state.interval, state.loop, navigation, totalPages]);

  return {
    ...state,
    play,
    pause,
    setInterval,
    toggleLoop,
  };
};
```

### 12.2 スライドショーコントロール

```typescript
const SlideshowControls: React.FC<{
  slideshow: ReturnType<typeof useSlideshow>;
}> = ({ slideshow }) => {
  return (
    <div className="slideshow-controls">
      <button onClick={slideshow.isPlaying ? slideshow.pause : slideshow.play}>
        {slideshow.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <select
        value={slideshow.interval}
        onChange={(e) => slideshow.setInterval(parseInt(e.target.value))}
      >
        <option value="1000">1秒</option>
        <option value="2000">2秒</option>
        <option value="3000">3秒</option>
        <option value="5000">5秒</option>
        <option value="10000">10秒</option>
      </select>

      <button
        className={slideshow.loop ? 'active' : ''}
        onClick={slideshow.toggleLoop}
      >
        <RepeatIcon />
      </button>
    </div>
  );
};
```

---

## 13. コンテキストメニュー

```typescript
const ViewerContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
  viewerActions: ViewerActions;
}> = ({ x, y, onClose, viewerActions }) => {
  const menuItems = [
    {
      label: '次のページ',
      icon: <ArrowRightIcon />,
      onClick: viewerActions.nextPage,
      shortcut: '→',
    },
    {
      label: '前のページ',
      icon: <ArrowLeftIcon />,
      onClick: viewerActions.prevPage,
      shortcut: '←',
    },
    { separator: true },
    {
      label: '表示モード',
      icon: <ViewIcon />,
      submenu: [
        {
          label: '単ページ',
          onClick: () => viewerActions.setViewMode('single'),
        },
        {
          label: '見開き',
          onClick: () => viewerActions.setViewMode('spread'),
        },
        {
          label: '連続スクロール',
          onClick: () => viewerActions.setViewMode('continuous'),
        },
      ],
    },
    {
      label: 'フィットモード',
      icon: <FitScreenIcon />,
      submenu: [
        {
          label: '幅に合わせる',
          onClick: () => viewerActions.setFitMode('fit-width'),
          shortcut: '1',
        },
        {
          label: '高さに合わせる',
          onClick: () => viewerActions.setFitMode('fit-height'),
          shortcut: '2',
        },
        {
          label: 'ページ全体',
          onClick: () => viewerActions.setFitMode('fit-page'),
          shortcut: '3',
        },
        {
          label: '原寸',
          onClick: () => viewerActions.setFitMode('original'),
          shortcut: '4',
        },
      ],
    },
    { separator: true },
    {
      label: 'サムネイル一覧',
      icon: <GridIcon />,
      onClick: viewerActions.toggleThumbnails,
      shortcut: 'T',
    },
    {
      label: 'しおりを保存',
      icon: <BookmarkIcon />,
      onClick: viewerActions.saveBookmark,
      shortcut: 'B',
    },
    { separator: true },
    {
      label: '全画面',
      icon: <FullscreenIcon />,
      onClick: viewerActions.toggleFullscreen,
      shortcut: 'F',
    },
    {
      label: '設定',
      icon: <SettingsIcon />,
      onClick: viewerActions.openSettings,
    },
    { separator: true },
    {
      label: 'エクスプローラーで表示',
      icon: <FolderIcon />,
      onClick: viewerActions.showInExplorer,
    },
    {
      label: 'ビューワーを閉じる',
      icon: <CloseIcon />,
      onClick: viewerActions.closeViewer,
      shortcut: 'Esc',
    },
  ];

  return (
    <ContextMenu
      x={x}
      y={y}
      items={menuItems}
      onClose={onClose}
    />
  );
};
```

---

## 14. 統合コンポーネント

### 14.1 メインビューワーコンポーネント

```typescript
const ArchiveViewer: React.FC<{
  file: FileInfo;
  onClose: () => void;
}> = ({ file, onClose }) => {
  // アーカイブ読み込み
  const [archive, setArchive] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ビューワー状態
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentPage: 0,
    totalPages: 0,
    viewMode: 'spread',
    readingDirection: 'rtl',
    zoomLevel: 1.0,
    fitMode: 'fit-page',
    isFullscreen: false,
    isLoading: false,
    preloadedPages: new Set(),
  });

  // UI状態
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // 設定
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);

  // アーカイブ初期化
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await loadArchive(file.file_path);

      if (result.success && result.archive) {
        setArchive(result.archive);
        setViewerState(prev => ({
          ...prev,
          totalPages: result.archive!.imageEntries.length,
        }));
      } else {
        setError(result.error || 'アーカイブの読み込みに失敗しました');
      }

      setLoading(false);
    };

    init();
  }, [file]);

  // ページナビゲーション
  const navigation = usePageNavigation(archive!, viewerState);

  // プリロード
  usePreloader(archive!, viewerState);

  // しおり
  const { bookmark, saveBookmark, removeBookmark } = useBookmark(
    file.id,
    viewerState.totalPages
  );

  useAutoSaveBookmark(
    file.id,
    viewerState.currentPage,
    viewerState.totalPages,
    saveBookmark
  );

  // スライドショー
  const slideshow = useSlideshow(navigation, viewerState.totalPages);

  // ビューワーアクション
  const viewerActions: ViewerActions = {
    nextPage: navigation.nextPage,
    prevPage: navigation.prevPage,
    goToPage: navigation.goToPage,
    goToFirst: navigation.goToFirst,
    goToLast: navigation.goToLast,

    setViewMode: (mode: ViewMode) => {
      setViewerState(prev => ({ ...prev, viewMode: mode }));
    },

    toggleViewMode: () => {
      setViewerState(prev => ({
        ...prev,
        viewMode: prev.viewMode === 'single' ? 'spread' : 'single',
      }));
    },

    setFitMode: (mode: FitMode) => {
      setViewerState(prev => ({ ...prev, fitMode: mode }));
    },

    toggleReadingDirection: () => {
      setViewerState(prev => ({
        ...prev,
        readingDirection: prev.readingDirection === 'rtl' ? 'ltr' : 'rtl',
      }));
    },

    zoomIn: () => {
      setViewerState(prev => ({
        ...prev,
        zoomLevel: Math.min(prev.zoomLevel + 0.1, 5.0),
        fitMode: 'custom',
      }));
    },

    zoomOut: () => {
      setViewerState(prev => ({
        ...prev,
        zoomLevel: Math.max(prev.zoomLevel - 0.1, 0.1),
        fitMode: 'custom',
      }));
    },

    resetZoom: () => {
      setViewerState(prev => ({
        ...prev,
        zoomLevel: 1.0,
        fitMode: 'fit-page',
      }));
    },

    toggleFullscreen: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setViewerState(prev => ({ ...prev, isFullscreen: true }));
      } else {
        document.exitFullscreen();
        setViewerState(prev => ({ ...prev, isFullscreen: false }));
      }
    },

    exitFullscreen: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setViewerState(prev => ({ ...prev, isFullscreen: false }));
      }
    },

    toggleThumbnails: () => {
      setShowThumbnails(prev => !prev);
    },

    saveBookmark: () => saveBookmark(viewerState.currentPage),
    removeBookmark,

    openSettings: () => setShowSettings(true),

    showContextMenu: (x: number, y: number) => {
      setContextMenu({ x, y });
    },

    showInExplorer: () => {
      window.electronAPI.showInExplorer(file.file_path);
    },

    closeViewer: onClose,

    isFullscreen: viewerState.isFullscreen,
  };

  // キーボード・マウス操作
  const containerRef = useRef<HTMLDivElement>(null);
  useViewerKeyboard(navigation, viewerActions);
  useViewerMouse(containerRef, navigation, viewerActions);

  // UIの自動非表示
  const { visible: uiVisible, showHeader } = useAutoHide();

  // ローディング
  if (loading) {
    return (
      <div className="viewer-loading">
        <Spinner size={64} />
        <p>アーカイブを読み込んでいます...</p>
      </div>
    );
  }

  // エラー
  if (error || !archive) {
    return (
      <div className="viewer-error">
        <AlertTriangleIcon size={64} />
        <h3>エラーが発生しました</h3>
        <p>{error}</p>
        <button onClick={onClose}>閉じる</button>
      </div>
    );
  }

  // しおり復帰
  const [showBookmarkResume, setShowBookmarkResume] = useState(
    !!bookmark && bookmark.page > 0
  );

  return (
    <div
      className="archive-viewer"
      ref={containerRef}
      style={{ backgroundColor: settings.backgroundColor }}
      onMouseMove={showHeader}
    >
      {/* ヘッダー */}
      <ViewerHeader
        visible={uiVisible && !viewerState.isFullscreen}
        archive={archive}
        currentPage={viewerState.currentPage}
        totalPages={viewerState.totalPages}
        viewMode={viewerState.viewMode}
        onViewModeChange={viewerActions.setViewMode}
        onPrevFile={() => {/* 前のファイル */}}
        onNextFile={() => {/* 次のファイル */}}
        onToggleThumbnails={viewerActions.toggleThumbnails}
        onOpenSettings={viewerActions.openSettings}
        onClose={onClose}
      />

      {/* 画像表示エリア */}
      <div className="viewer-content">
        {viewerState.viewMode === 'single' && (
          <SinglePageView
            archive={archive}
            currentPage={viewerState.currentPage}
            fitMode={viewerState.fitMode}
            zoomLevel={viewerState.zoomLevel}
          />
        )}

        {viewerState.viewMode === 'spread' && (
          <SpreadView
            archive={archive}
            currentPage={viewerState.currentPage}
            totalPages={viewerState.totalPages}
            readingDirection={viewerState.readingDirection}
            fitMode={viewerState.fitMode}
          />
        )}

        {viewerState.viewMode === 'continuous' && (
          <ContinuousScrollView
            archive={archive}
            fitMode={viewerState.fitMode}
          />
        )}
      </div>

      {/* フッター */}
      <ViewerFooter
        visible={uiVisible && !viewerState.isFullscreen}
        currentPage={viewerState.currentPage}
        totalPages={viewerState.totalPages}
        onPageChange={navigation.goToPage}
        fitMode={viewerState.fitMode}
        onFitModeChange={viewerActions.setFitMode}
        zoomLevel={viewerState.zoomLevel}
        slideshow={slideshow}
      />

      {/* サムネイルパネル */}
      <ThumbnailPanel
        archive={archive}
        currentPage={viewerState.currentPage}
        onPageSelect={navigation.goToPage}
        isOpen={showThumbnails}
        onClose={() => setShowThumbnails(false)}
      />

      {/* 設定パネル */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={(newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ViewerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          viewerActions={viewerActions}
        />
      )}

      {/* しおり復帰ダイアログ */}
      {showBookmarkResume && bookmark && (
        <BookmarkResume
          bookmark={bookmark}
          onResume={() => {
            navigation.goToPage(bookmark.page);
            setShowBookmarkResume(false);
          }}
          onStartOver={() => {
            navigation.goToFirst();
            setShowBookmarkResume(false);
          }}
        />
      )}
    </div>
  );
};

export default ArchiveViewer;
```

---

## 15. 型定義まとめ

```typescript
// types.ts
export interface ViewerActions {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setFitMode: (mode: FitMode) => void;
  toggleReadingDirection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  toggleThumbnails: () => void;
  saveBookmark: () => void;
  removeBookmark: () => void;
  openSettings: () => void;
  showContextMenu: (x: number, y: number) => void;
  showInExplorer: () => void;
  closeViewer: () => void;
  isFullscreen: boolean;
}
```

---
