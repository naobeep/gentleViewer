# PDFビューワー 詳細設計書

## 目次

1. [ビューワー概要](#1-ビューワー概要)
2. [画面構成](#2-画面構成)
3. [PDF処理](#3-pdf処理)
4. [ページナビゲーション](#4-ページナビゲーション)
5. [表示モード](#5-表示モード)
6. [ズーム・スクロール](#6-ズームスクロール)
7. [テキスト機能](#7-テキスト機能)
8. [しおり機能](#8-しおり機能)
9. [印刷機能](#9-印刷機能)
10. [キーボード操作](#10-キーボード操作)
11. [統合コンポーネント](#11-統合コンポーネント)

---

## 1. ビューワー概要

### 1.1 目的

PDFファイルを快適に閲覧・管理できる統合PDFビューワー。

### 1.2 主要機能

- **PDF.js統合**: Mozillaのオープンソースライブラリ使用
- **ページナビゲーション**: 高速ページめくり
- **表示モード**: 単ページ・見開き・連続スクロール
- **ズーム機能**: フィット・カスタムズーム
- **テキスト選択**: コピー・検索
- **しおり機能**: 読書位置記憶
- **印刷機能**: ページ範囲指定印刷
- **アウトライン表示**: 目次ナビゲーション

### 1.3 技術スタック

- **PDF.js**: v3.x以降
- **React**: 18.x
- **TypeScript**: 5.x
- **Canvas API**: レンダリング

---

## 2. 画面構成

### 2.1 全体レイアウト

```txt
┌──────────────────────────────────────────────────────────────┐
│ ヘッダー (高さ: 56px, 自動非表示)                             │
│ [◀] document.pdf (15/120) [見開き▾] [検索] [⚙] [×]          │
├───────────┬──────────────────────────────────────────────────┤
│           │ ツールバー (高さ: 48px)                           │
│ アウトライン│ [単ページ] [見開き] [連続] [100%▾] [回転] [印刷] │
│           │ ┌──────────────────────────────────────────────┐│
│ (240px)   │ │                                              ││
│ 折りたたみ │ │ PDFページ表示エリア                          ││
│ 可能      │ │ (Canvas)                                     ││
│           │ │                                              ││
│           │ └──────────────────────────────────────────────┘│
├───────────┴──────────────────────────────────────────────────┤
│ ステータスバー (高さ: 32px)                                   │
│ ページ 15/120 | 100% | "検索中..." 3件見つかりました          │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 ヘッダー詳細

```txt
┌──────────────────────────────────────────────────────────────┐
│ [◀] document.pdf (15/120) [≡] [見開き▾] [🔍] [⚙] [─][□][×] │
└──────────────────────────────────────────────────────────────┘
```

**要素:**

| 要素 | 説明 | サイズ |
|-----|------|-------|
| `[◀]` | 前のファイル | 40x40px |
| ファイル名 | 現在のPDFファイル名 | 可変 |
| `(15/120)` | 現在ページ/総ページ数 | 80px |
| `[≡]` | アウトライン切替 | 40x40px |
| `[見開き▾]` | 表示モード | 100px |
| `[🔍]` | 検索パネル | 40x40px |
| `[⚙]` | 設定 | 40x40px |

### 2.3 ツールバー

```txt
┌──────────────────────────────────────────────────────────────┐
│ [単ページ] [見開き] [連続] [100%▾] [↻] [↺] [🖨]              │
└──────────────────────────────────────────────────────────────┘
```

**機能:**

- 表示モード切替（単ページ/見開き/連続スクロール）
- ズームコントロール（ドロップダウン + ボタン）
- 回転（時計回り/反時計回り）
- 印刷

---

## 3. PDF処理

### 3.1 PDF読み込み

#### 3.1.1 型定義

```typescript
interface PDFLoadResult {
  success: boolean;
  pdf: PDFDocument | null;
  error?: string;
}

interface PDFDocument {
  path: string;
  name: string;
  numPages: number;
  info: PDFInfo;
  outline: PDFOutlineNode[];
  fingerprint: string;
}

interface PDFInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pdfVersion?: string;
}

interface PDFOutlineNode {
  title: string;
  dest: string | number;
  items: PDFOutlineNode[];
}
```

#### 3.1.2 PDF.js初期化

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Workerの設定
pdfjsLib.GlobalWorkerOptions.workerSrc = `pdfjs-dist/build/pdf.worker.js`;

const loadPDF = async (filePath: string): Promise<PDFLoadResult> => {
  try {
    // 1. ファイル存在確認
    const exists = await window.electronAPI.fileExists(filePath);
    if (!exists) {
      return { success: false, pdf: null, error: 'ファイルが見つかりません' };
    }

    // 2. ファイル読み込み
    const arrayBuffer = await window.electronAPI.readFile(filePath);

    // 3. PDF.jsでロード
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'pdfjs-dist/cmaps/',
      cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;

    // 4. メタデータ取得
    const metadata = await pdfDoc.getMetadata();
    const info: PDFInfo = {
      title: metadata.info.Title,
      author: metadata.info.Author,
      subject: metadata.info.Subject,
      keywords: metadata.info.Keywords,
      creator: metadata.info.Creator,
      producer: metadata.info.Producer,
      creationDate: metadata.info.CreationDate ? new Date(metadata.info.CreationDate) : undefined,
      modificationDate: metadata.info.ModDate ? new Date(metadata.info.ModDate) : undefined,
      pdfVersion: metadata.info.PDFFormatVersion,
    };

    // 5. アウトライン取得
    const outline = await pdfDoc.getOutline();
    const outlineTree = outline ? buildOutlineTree(outline) : [];

    const pdf: PDFDocument = {
      path: filePath,
      name: path.basename(filePath),
      numPages: pdfDoc.numPages,
      info,
      outline: outlineTree,
      fingerprint: pdfDoc.fingerprint,
    };

    return { success: true, pdf };

  } catch (error) {
    console.error('PDF load error:', error);
    return {
      success: false,
      pdf: null,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};

// アウトライン階層構築
const buildOutlineTree = (outline: any[]): PDFOutlineNode[] => {
  return outline.map(item => ({
    title: item.title,
    dest: item.dest,
    items: item.items ? buildOutlineTree(item.items) : [],
  }));
};
```

### 3.2 ページレンダリング

```typescript
interface RenderOptions {
  scale: number;
  rotation: number;
  viewport?: any;
}

const usePDFPage = (pdfDoc: any, pageNumber: number) => {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      if (!pdfDoc) return;

      setLoading(true);
      try {
        const pdfPage = await pdfDoc.getPage(pageNumber);
        setPage(pdfPage);
      } catch (error) {
        console.error('Failed to load page:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [pdfDoc, pageNumber]);

  return { page, loading };
};

const PDFPageCanvas: React.FC<{
  page: any;
  scale: number;
  rotation: number;
}> = ({ page, scale, rotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!page || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // ビューポート計算
    const viewport = page.getViewport({ scale, rotation });

    // Canvas サイズ設定
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // レンダリング
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    const renderTask = page.render(renderContext);

    renderTask.promise.then(
      () => {
        console.log('Page rendered successfully');
      },
      (error: any) => {
        console.error('Rendering error:', error);
      }
    );

    // クリーンアップ
    return () => {
      renderTask.cancel();
    };
  }, [page, scale, rotation]);

  return (
    <canvas
      ref={canvasRef}
      className="pdf-page-canvas"
    />
  );
};
```

### 3.3 テキストレイヤー

```typescript
const PDFTextLayer: React.FC<{
  page: any;
  viewport: any;
}> = ({ page, viewport }) => {
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!page || !textLayerRef.current) return;

    const loadTextContent = async () => {
      const textContent = await page.getTextContent();
      const textLayer = textLayerRef.current;
      if (!textLayer) return;

      // 既存のテキストレイヤーをクリア
      textLayer.innerHTML = '';

      // PDF.jsのテキストレイヤーレンダラー使用
      pdfjsLib.renderTextLayer({
        textContent,
        container: textLayer,
        viewport,
        textDivs: [],
      });
    };

    loadTextContent();
  }, [page, viewport]);

  return (
    <div
      ref={textLayerRef}
      className="pdf-text-layer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        opacity: 0.2,
        lineHeight: 1,
      }}
    />
  );
};
```

---

## 4. ページナビゲーション

### 4.1 ページ管理

```typescript
interface PDFViewerState {
  currentPage: number;
  numPages: number;
  scale: number;
  rotation: number;
  viewMode: 'single' | 'double' | 'continuous';
  fitMode: 'page' | 'width' | 'auto' | 'custom';
}

const usePageNavigation = (numPages: number) => {
  const [currentPage, setCurrentPage] = useState(1);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, numPages)));
  }, [numPages]);

  const goToFirst = () => goToPage(1);
  const goToLast = () => goToPage(numPages);

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

### 4.2 ページサムネイル

```typescript
const PDFThumbnail: React.FC<{
  page: any;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ page, pageNumber, isActive, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!page || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale: 0.2 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({
      canvasContext: context,
      viewport: viewport,
    });
  }, [page]);

  return (
    <div
      className={`pdf-thumbnail ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} />
      <div className="thumbnail-number">{pageNumber}</div>
    </div>
  );
};
```

---

## 5. 表示モード

### 5.1 単ページ表示

```typescript
const SinglePageView: React.FC<{
  pdfDoc: any;
  currentPage: number;
  scale: number;
  rotation: number;
}> = ({ pdfDoc, currentPage, scale, rotation }) => {
  const { page, loading } = usePDFPage(pdfDoc, currentPage);

  if (loading) {
    return <div className="page-loading"><Spinner /></div>;
  }

  return (
    <div className="single-page-view">
      <PDFPageCanvas
        page={page}
        scale={scale}
        rotation={rotation}
      />
    </div>
  );
};
```

### 5.2 見開き表示

```typescript
const DoublePageView: React.FC<{
  pdfDoc: any;
  currentPage: number;
  scale: number;
  rotation: number;
}> = ({ pdfDoc, currentPage, scale, rotation }) => {
  const { page: leftPage } = usePDFPage(pdfDoc, currentPage);
  const { page: rightPage } = usePDFPage(pdfDoc, currentPage + 1);

  return (
    <div className="double-page-view">
      <div className="page-container left">
        {leftPage && (
          <PDFPageCanvas
            page={leftPage}
            scale={scale}
            rotation={rotation}
          />
        )}
      </div>
      <div className="page-container right">
        {rightPage && (
          <PDFPageCanvas
            page={rightPage}
            scale={scale}
            rotation={rotation}
          />
        )}
      </div>
    </div>
  );
};
```

### 5.3 連続スクロール表示

```typescript
const ContinuousScrollView: React.FC<{
  pdfDoc: any;
  numPages: number;
  scale: number;
  rotation: number;
}> = ({ pdfDoc, numPages, scale, rotation }) => {
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer で可視ページを追跡
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '1');

          if (entry.isIntersecting) {
            setVisiblePages(prev => new Set(prev).add(pageNum));
          } else {
            setVisiblePages(prev => {
              const next = new Set(prev);
              next.delete(pageNum);
              return next;
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    const pages = containerRef.current?.querySelectorAll('.pdf-page-wrapper');
    pages?.forEach(page => observer.observe(page));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="continuous-scroll-view" ref={containerRef}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
        <ContinuousPage
          key={pageNum}
          pdfDoc={pdfDoc}
          pageNumber={pageNum}
          scale={scale}
          rotation={rotation}
          isVisible={visiblePages.has(pageNum)}
        />
      ))}
    </div>
  );
};

const ContinuousPage: React.FC<{
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
  isVisible: boolean;
}> = ({ pdfDoc, pageNumber, scale, rotation, isVisible }) => {
  const { page, loading } = usePDFPage(pdfDoc, pageNumber);

  return (
    <div className="pdf-page-wrapper" data-page={pageNumber}>
      {isVisible && !loading && page ? (
        <PDFPageCanvas
          page={page}
          scale={scale}
          rotation={rotation}
        />
      ) : (
        <div className="page-placeholder">
          <Skeleton variant="rectangular" width={600} height={800} />
        </div>
      )}
    </div>
  );
};
```

---

## 6. ズーム・スクロール

### 6.1 ズーム制御

```typescript
const useZoom = (fitMode: FitMode) => {
  const [scale, setScale] = useState(1.0);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 5.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    setScale(Math.max(0.1, Math.min(level, 5.0)));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // フィットモード計算
  const calculateFitScale = useCallback((
    pageWidth: number,
    pageHeight: number,
    containerWidth: number,
    containerHeight: number
  ) => {
    switch (fitMode) {
      case 'width':
        return containerWidth / pageWidth;
      case 'page':
        return Math.min(
          containerWidth / pageWidth,
          containerHeight / pageHeight
        );
      case 'auto':
        // ページ向きに応じて自動選択
        return pageWidth > pageHeight
          ? containerWidth / pageWidth
          : Math.min(containerWidth / pageWidth, containerHeight / pageHeight);
      default:
        return scale;
    }
  }, [fitMode, scale]);

  return {
    scale,
    zoomIn,
    zoomOut,
    setZoomLevel,
    resetZoom,
    calculateFitScale,
  };
};
```

### 6.2 ズームコントロールUI

```typescript
const ZoomControls: React.FC<{
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (scale: number) => void;
  fitMode: FitMode;
  onFitModeChange: (mode: FitMode) => void;
}> = ({ scale, onZoomIn, onZoomOut, onZoomChange, fitMode, onFitModeChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const presetZooms = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

  return (
    <div className="zoom-controls">
      <button onClick={onZoomOut} aria-label="ズームアウト">
        <ZoomOutIcon size={20} />
      </button>

      <div className="zoom-level-selector">
        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          {Math.round(scale * 100)}%
        </button>

        {isDropdownOpen && (
          <div className="zoom-dropdown">
            <button onClick={() => {
              onFitModeChange('page');
              setIsDropdownOpen(false);
            }}>
              ページに合わせる
            </button>
            <button onClick={() => {
              onFitModeChange('width');
              setIsDropdownOpen(false);
            }}>
              幅に合わせる
            </button>
            <div className="dropdown-divider" />
            {presetZooms.map(zoom => (
              <button
                key={zoom}
                onClick={() => {
                  onZoomChange(zoom);
                  setIsDropdownOpen(false);
                }}
              >
                {zoom * 100}%
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onZoomIn} aria-label="ズームイン">
        <ZoomInIcon size={20} />
      </button>
    </div>
  );
};
```

---

## テキスト・検索・しおり・印刷・統合

---

## 7. テキスト機能

### 7.1 テキスト選択

```typescript
const PDFPageWithText: React.FC<{
  page: any;
  scale: number;
  rotation: number;
}> = ({ page, scale, rotation }) => {
  const [viewport, setViewport] = useState<any>(null);

  useEffect(() => {
    if (page) {
      const vp = page.getViewport({ scale, rotation });
      setViewport(vp);
    }
  }, [page, scale, rotation]);

  return (
    <div className="pdf-page-with-text" style={{ position: 'relative' }}>
      {/* Canvas レイヤー */}
      <PDFPageCanvas page={page} scale={scale} rotation={rotation} />

      {/* テキストレイヤー */}
      {viewport && (
        <PDFTextLayer page={page} viewport={viewport} />
      )}
    </div>
  );
};
```

### 7.2 テキスト検索

```typescript
interface SearchResult {
  pageNumber: number;
  matches: TextMatch[];
}

interface TextMatch {
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const usePDFSearch = (pdfDoc: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (term: string) => {
    if (!pdfDoc || !term) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchTerm(term);

    const allResults: SearchResult[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      // 大文字小文字を区別しない検索
      const regex = new RegExp(term, 'gi');
      let match;
      const matches: TextMatch[] = [];

      while ((match = regex.exec(pageText)) !== null) {
        // マッチ位置を計算（簡易版）
        matches.push({
          text: match[0],
          position: {
            x: 0,
            y: 0,
            width: 100,
            height: 20,
          },
        });
      }

      if (matches.length > 0) {
        allResults.push({
          pageNumber: pageNum,
          matches,
        });
      }
    }

    setResults(allResults);
    setCurrentMatch(0);
    setIsSearching(false);
  }, [pdfDoc]);

  const nextMatch = useCallback(() => {
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    setCurrentMatch(prev => (prev + 1) % totalMatches);
  }, [results]);

  const prevMatch = useCallback(() => {
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    setCurrentMatch(prev => (prev - 1 + totalMatches) % totalMatches);
  }, [results]);

  return {
    searchTerm,
    results,
    currentMatch,
    isSearching,
    search,
    nextMatch,
    prevMatch,
  };
};
```

### 7.3 検索パネルUI

```typescript
const SearchPanel: React.FC<{
  onSearch: (term: string) => void;
  results: SearchResult[];
  currentMatch: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  isSearching: boolean;
  onClose: () => void;
}> = ({ onSearch, results, currentMatch, onNextMatch, onPrevMatch, isSearching, onClose }) => {
  const [searchInput, setSearchInput] = useState('');
  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div className="search-panel">
      <div className="search-header">
        <h4>検索</h4>
        <button onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="テキストを検索..."
          autoFocus
        />
        <button type="submit" disabled={isSearching}>
          <SearchIcon size={16} />
        </button>
      </form>

      {isSearching && (
        <div className="search-status">検索中...</div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            <span>{currentMatch + 1} / {totalMatches} 件</span>
            <div className="navigation-buttons">
              <button onClick={onPrevMatch} aria-label="前へ">
                <ChevronUpIcon size={16} />
              </button>
              <button onClick={onNextMatch} aria-label="次へ">
                <ChevronDownIcon size={16} />
              </button>
            </div>
          </div>

          <div className="results-list">
            {results.map(result => (
              <div key={result.pageNumber} className="result-item">
                <div className="result-page">ページ {result.pageNumber}</div>
                <div className="result-matches">
                  {result.matches.length} 件のマッチ
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSearching && searchInput && results.length === 0 && (
        <div className="no-results">
          "{searchInput}" は見つかりませんでした
        </div>
      )}
    </div>
  );
};
```

### 7.4 テキストコピー

```typescript
const useTextSelection = () => {
  const handleCopy = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) return;

    const text = selection.toString();
    navigator.clipboard.writeText(text).then(
      () => {
        // 成功通知
        showNotification({
          type: 'success',
          message: 'テキストをコピーしました',
        });
      },
      (err) => {
        console.error('Failed to copy text:', err);
      }
    );
  }, []);

  useEffect(() => {
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy]);

  return { handleCopy };
};
```

---

## 8. しおり機能

### 8.1 しおり管理

```typescript
interface PDFBookmark {
  fileId: number;
  page: number;
  scrollPosition: number;
  zoom: number;
  timestamp: number;
}

const useBookmark = (fileId: number) => {
  const [bookmark, setBookmark] = useState<PDFBookmark | null>(null);

  // 読み込み
  useEffect(() => {
    const loadBookmark = async () => {
      const saved = await window.electronAPI.getPDFBookmark(fileId);
      if (saved) {
        setBookmark(saved);
      }
    };
    loadBookmark();
  }, [fileId]);

  // 保存
  const saveBookmark = useCallback(async (
    page: number,
    scrollPosition: number,
    zoom: number
  ) => {
    const newBookmark: PDFBookmark = {
      fileId,
      page,
      scrollPosition,
      zoom,
      timestamp: Date.now(),
    };

    await window.electronAPI.savePDFBookmark(newBookmark);
    setBookmark(newBookmark);
  }, [fileId]);

  // 自動保存（デバウンス）
  const autoSave = useCallback(
    debounce((page: number, scrollPosition: number, zoom: number) => {
      saveBookmark(page, scrollPosition, zoom);
    }, 3000),
    [saveBookmark]
  );

  return { bookmark, saveBookmark, autoSave };
};
```

### 8.2 アウトラインパネル

```typescript
const OutlinePanel: React.FC<{
  outline: PDFOutlineNode[];
  onNavigate: (dest: string | number) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ outline, onNavigate, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="outline-panel">
      <div className="panel-header">
        <h3>目次</h3>
        <button onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="outline-content">
        {outline.length > 0 ? (
          <OutlineTree nodes={outline} onNavigate={onNavigate} />
        ) : (
          <div className="no-outline">
            このPDFには目次がありません
          </div>
        )}
      </div>
    </div>
  );
};

const OutlineTree: React.FC<{
  nodes: PDFOutlineNode[];
  onNavigate: (dest: string | number) => void;
  level?: number;
}> = ({ nodes, onNavigate, level = 0 }) => {
  return (
    <ul className={`outline-tree level-${level}`}>
      {nodes.map((node, index) => (
        <OutlineItem
          key={index}
          node={node}
          onNavigate={onNavigate}
          level={level}
        />
      ))}
    </ul>
  );
};

const OutlineItem: React.FC<{
  node: PDFOutlineNode;
  onNavigate: (dest: string | number) => void;
  level: number;
}> = ({ node, onNavigate, level }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const hasChildren = node.items && node.items.length > 0;

  return (
    <li className="outline-item">
      <div className="outline-title">
        {hasChildren && (
          <button
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </button>
        )}
        <button
          className="title-button"
          onClick={() => onNavigate(node.dest)}
        >
          {node.title}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <OutlineTree
          nodes={node.items}
          onNavigate={onNavigate}
          level={level + 1}
        />
      )}
    </li>
  );
};
```

---

## 9. 印刷機能

### 9.1 印刷ダイアログ

```typescript
interface PrintOptions {
  pages: 'all' | 'current' | 'range';
  pageRange?: string;  // "1-5, 8, 11-13"
  copies: number;
  orientation: 'portrait' | 'landscape';
}

const PrintDialog: React.FC<{
  numPages: number;
  currentPage: number;
  onPrint: (options: PrintOptions) => void;
  onClose: () => void;
}> = ({ numPages, currentPage, onPrint, onClose }) => {
  const [options, setOptions] = useState<PrintOptions>({
    pages: 'all',
    pageRange: '',
    copies: 1,
    orientation: 'portrait',
  });

  const [rangeError, setRangeError] = useState<string | null>(null);

  const validatePageRange = (range: string): boolean => {
    if (!range) return true;

    const parts = range.split(',');
    for (const part of parts) {
      const trimmed = part.trim();

      if (trimmed.includes('-')) {
        // 範囲指定
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        if (isNaN(start) || isNaN(end) || start < 1 || end > numPages || start > end) {
          return false;
        }
      } else {
        // 単一ページ
        const page = parseInt(trimmed);
        if (isNaN(page) || page < 1 || page > numPages) {
          return false;
        }
      }
    }

    return true;
  };

  const handlePrint = () => {
    if (options.pages === 'range') {
      if (!options.pageRange || !validatePageRange(options.pageRange)) {
        setRangeError('有効なページ範囲を入力してください');
        return;
      }
    }

    onPrint(options);
    onClose();
  };

  return (
    <div className="print-dialog">
      <div className="dialog-header">
        <h3>印刷</h3>
        <button onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="dialog-content">
        {/* ページ選択 */}
        <div className="print-section">
          <h4>ページ</h4>

          <label className="radio-option">
            <input
              type="radio"
              checked={options.pages === 'all'}
              onChange={() => setOptions(prev => ({ ...prev, pages: 'all' }))}
            />
            すべて (1-{numPages})
          </label>

          <label className="radio-option">
            <input
              type="radio"
              checked={options.pages === 'current'}
              onChange={() => setOptions(prev => ({ ...prev, pages: 'current' }))}
            />
            現在のページ ({currentPage})
          </label>

          <label className="radio-option">
            <input
              type="radio"
              checked={options.pages === 'range'}
              onChange={() => setOptions(prev => ({ ...prev, pages: 'range' }))}
            />
            ページ指定
          </label>

          {options.pages === 'range' && (
            <div className="page-range-input">
              <input
                type="text"
                value={options.pageRange}
                onChange={(e) => {
                  setOptions(prev => ({ ...prev, pageRange: e.target.value }));
                  setRangeError(null);
                }}
                placeholder="例: 1-5, 8, 11-13"
              />
              {rangeError && (
                <div className="error-message">{rangeError}</div>
              )}
            </div>
          )}
        </div>

        {/* 部数 */}
        <div className="print-section">
          <h4>部数</h4>
          <input
            type="number"
            min="1"
            max="99"
            value={options.copies}
            onChange={(e) => setOptions(prev => ({ ...prev, copies: parseInt(e.target.value) }))}
          />
        </div>

        {/* 向き */}
        <div className="print-section">
          <h4>向き</h4>
          <label className="radio-option">
            <input
              type="radio"
              checked={options.orientation === 'portrait'}
              onChange={() => setOptions(prev => ({ ...prev, orientation: 'portrait' }))}
            />
            縦
          </label>
          <label className="radio-option">
            <input
              type="radio"
              checked={options.orientation === 'landscape'}
              onChange={() => setOptions(prev => ({ ...prev, orientation: 'landscape' }))}
            />
            横
          </label>
        </div>
      </div>

      <div className="dialog-footer">
        <button onClick={onClose}>キャンセル</button>
        <button className="primary" onClick={handlePrint}>印刷</button>
      </div>
    </div>
  );
};
```

### 9.2 印刷実行

```typescript
const usePrint = (pdfDoc: any) => {
  const printPDF = useCallback(async (options: PrintOptions) => {
    if (!pdfDoc) return;

    // ページ範囲を解析
    let pagesToPrint: number[] = [];

    if (options.pages === 'all') {
      pagesToPrint = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    } else if (options.pages === 'current') {
      pagesToPrint = [options.currentPage];
    } else if (options.pages === 'range' && options.pageRange) {
      pagesToPrint = parsePageRange(options.pageRange);
    }

    // 印刷用のウィンドウを作成
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window');
      return;
    }

    printWindow.document.write('<html><head><title>印刷</title></head><body>');

    // 各ページをレンダリング
    for (const pageNum of pagesToPrint) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) continue;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Canvas を画像として追加
      const imgData = canvas.toDataURL('image/png');
      printWindow.document.write(`<img src="${imgData}" style="page-break-after: always;" />`);
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();

    // 印刷ダイアログを表示
    printWindow.focus();
    printWindow.print();

  }, [pdfDoc]);

  return { printPDF };
};

// ページ範囲のパース
const parsePageRange = (range: string): number[] => {
  const pages: number[] = [];
  const parts = range.split(',');

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    } else {
      pages.push(parseInt(trimmed));
    }
  }

  return [...new Set(pages)].sort((a, b) => a - b);
};
```

---

## 10. キーボード操作

```typescript
const usePDFKeyboard = (
  navigation: ReturnType<typeof usePageNavigation>,
  actions: PDFViewerActions
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 修飾キーチェック
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            actions.openSearch();
            break;
          case 'p':
            e.preventDefault();
            actions.openPrint();
            break;
          case '+':
          case '=':
            e.preventDefault();
            actions.zoomIn();
            break;
          case '-':
            e.preventDefault();
            actions.zoomOut();
            break;
          case '0':
            e.preventDefault();
            actions.resetZoom();
            break;
        }
        return;
      }

      switch (e.key) {
        // ページナビゲーション
        case 'ArrowRight':
        case 'PageDown':
        case 'j':
          e.preventDefault();
          navigation.nextPage();
          break;

        case 'ArrowLeft':
        case 'PageUp':
        case 'k':
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

        // 表示モード
        case '1':
          e.preventDefault();
          actions.setViewMode('single');
          break;

        case '2':
          e.preventDefault();
          actions.setViewMode('double');
          break;

        case '3':
          e.preventDefault();
          actions.setViewMode('continuous');
          break;

        // 回転
        case 'r':
          e.preventDefault();
          actions.rotateClockwise();
          break;

        case 'R':
          if (e.shiftKey) {
            e.preventDefault();
            actions.rotateCounterClockwise();
          }
          break;

        // その他
        case 'f':
          e.preventDefault();
          actions.toggleFullscreen();
          break;

        case 'o':
          e.preventDefault();
          actions.toggleOutline();
          break;

        case 'Escape':
          if (actions.isFullscreen) {
            actions.exitFullscreen();
          } else {
            actions.closeViewer();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, actions]);
};
```

---

## 11. 統合コンポーネント

### 11.1 メインPDFビューワー

```typescript
const PDFViewer: React.FC<{
  file: FileInfo;
  onClose: () => void;
}> = ({ file, onClose }) => {
  // PDF読み込み
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfInfo, setPdfInfo] = useState<PDFDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ビューワー状態
  const [viewerState, setViewerState] = useState<PDFViewerState>({
    currentPage: 1,
    numPages: 0,
    scale: 1.0,
    rotation: 0,
    viewMode: 'single',
    fitMode: 'page',
  });

  // UI状態
  const [showOutline, setShowOutline] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // PDF初期化
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await loadPDF(file.file_path);

      if (result.success && result.pdf) {
        setPdfInfo(result.pdf);

        // PDF.jsドキュメントを取得
        const arrayBuffer = await window.electronAPI.readFile(file.file_path);
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        setPdfDoc(doc);
        setViewerState(prev => ({ ...prev, numPages: doc.numPages }));
      } else {
        setError(result.error || 'PDFの読み込みに失敗しました');
      }

      setLoading(false);
    };

    init();
  }, [file]);

  // ページナビゲーション
  const navigation = usePageNavigation(viewerState.numPages);

  // ズーム
  const zoom = useZoom(viewerState.fitMode);

  // 検索
  const search = usePDFSearch(pdfDoc);

  // しおり
  const { bookmark, saveBookmark, autoSave } = useBookmark(file.id);

  // 印刷
  const { printPDF } = usePrint(pdfDoc);

  // 自動保存
  useEffect(() => {
    autoSave(
      navigation.currentPage,
      window.scrollY,
      zoom.scale
    );
  }, [navigation.currentPage, zoom.scale, autoSave]);

  // ビューワーアクション
  const actions: PDFViewerActions = {
    nextPage: navigation.nextPage,
    prevPage: navigation.prevPage,
    goToPage: navigation.goToPage,
    goToFirst: navigation.goToFirst,
    goToLast: navigation.goToLast,

    zoomIn: zoom.zoomIn,
    zoomOut: zoom.zoomOut,
    resetZoom: zoom.resetZoom,
    setZoomLevel: zoom.setZoomLevel,

    setViewMode: (mode) => {
      setViewerState(prev => ({ ...prev, viewMode: mode }));
    },

    setFitMode: (mode) => {
      setViewerState(prev => ({ ...prev, fitMode: mode }));
    },

    rotateClockwise: () => {
      setViewerState(prev => ({
        ...prev,
        rotation: (prev.rotation + 90) % 360,
      }));
    },

    rotateCounterClockwise: () => {
      setViewerState(prev => ({
        ...prev,
        rotation: (prev.rotation - 90 + 360) % 360,
      }));
    },

    toggleFullscreen: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    },

    exitFullscreen: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    },

    toggleOutline: () => setShowOutline(prev => !prev),
    openSearch: () => setShowSearch(true),
    openPrint: () => setShowPrint(true),

    saveBookmark: () => saveBookmark(
      navigation.currentPage,
      window.scrollY,
      zoom.scale
    ),

    closeViewer: () => {
      saveBookmark(navigation.currentPage, window.scrollY, zoom.scale);
      onClose();
    },

    isFullscreen,
  };

  // キーボード操作
  usePDFKeyboard(navigation, actions);

  // ローディング
  if (loading) {
    return (
      <div className="viewer-loading">
        <Spinner size={64} />
        <p>PDFを読み込んでいます...</p>
      </div>
    );
  }

  // エラー
  if (error || !pdfDoc || !pdfInfo) {
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
  const [showBookmarkResume, setShowBookmarkResume] = useState(!!bookmark);

  return (
    <div className="pdf-viewer" data-fullscreen={isFullscreen}>
      {/* ヘッダー */}
      {!isFullscreen && (
        <ViewerHeader
          fileName={pdfInfo.name}
          currentPage={navigation.currentPage}
          numPages={viewerState.numPages}
          onClose={onClose}
          onToggleOutline={actions.toggleOutline}
          onOpenSearch={actions.openSearch}
        />
      )}

      <div className="viewer-layout">
        {/* アウトラインパネル */}
        {showOutline && (
          <OutlinePanel
            outline={pdfInfo.outline}
            onNavigate={(dest) => {
              if (typeof dest === 'number') {
                navigation.goToPage(dest);
              }
            }}
            isOpen={showOutline}
            onClose={() => setShowOutline(false)}
          />
        )}

        {/* メインコンテンツ */}
        <div className="viewer-main">
          {/* ツールバー */}
          <Toolbar
            viewMode={viewerState.viewMode}
            onViewModeChange={actions.setViewMode}
            scale={zoom.scale}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onZoomChange={zoom.setZoomLevel}
            fitMode={viewerState.fitMode}
            onFitModeChange={actions.setFitMode}
            rotation={viewerState.rotation}
            onRotateClockwise={actions.rotateClockwise}
            onRotateCounterClockwise={actions.rotateCounterClockwise}
            onPrint={actions.openPrint}
          />

          {/* PDF表示エリア */}
          <div className="pdf-content">
            {viewerState.viewMode === 'single' && (
              <SinglePageView
                pdfDoc={pdfDoc}
                currentPage={navigation.currentPage}
                scale={zoom.scale}
                rotation={viewerState.rotation}
              />
            )}

            {viewerState.viewMode === 'double' && (
              <DoublePageView
                pdfDoc={pdfDoc}
                currentPage={navigation.currentPage}
                scale={zoom.scale}
                rotation={viewerState.rotation}
              />
            )}

            {viewerState.viewMode === 'continuous' && (
              <ContinuousScrollView
                pdfDoc={pdfDoc}
                numPages={viewerState.numPages}
                scale={zoom.scale}
                rotation={viewerState.rotation}
              />
            )}
          </div>

          {/* ステータスバー */}
          <StatusBar
            currentPage={navigation.currentPage}
            numPages={viewerState.numPages}
            scale={zoom.scale}
            searchResults={search.results}
          />
        </div>

        {/* 検索パネル */}
        {showSearch && (
          <SearchPanel
            onSearch={search.search}
            results={search.results}
            currentMatch={search.currentMatch}
            onNextMatch={search.nextMatch}
            onPrevMatch={search.prevMatch}
            isSearching={search.isSearching}
            onClose={() => setShowSearch(false)}
          />
        )}
      </div>

      {/* 印刷ダイアログ */}
      {showPrint && (
        <PrintDialog
          numPages={viewerState.numPages}
          currentPage={navigation.currentPage}
          onPrint={printPDF}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* しおり復帰 */}
      {showBookmarkResume && bookmark && (
        <BookmarkResume
          bookmark={bookmark}
          onResume={() => {
            navigation.goToPage(bookmark.page);
            zoom.setZoomLevel(bookmark.zoom);
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

export default PDFViewer;
```

### 11.2 型定義

```typescript
// types.ts
export interface PDFViewerActions {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoomLevel: (level: number) => void;
  setViewMode: (mode: 'single' | 'double' | 'continuous') => void;
  setFitMode: (mode: FitMode) => void;
  rotateClockwise: () => void;
  rotateCounterClockwise: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  toggleOutline: () => void;
  openSearch: () => void;
  openPrint: () => void;
  saveBookmark: () => void;
  closeViewer: () => void;
  isFullscreen: boolean;
}
```

---
