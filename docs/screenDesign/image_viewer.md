# パート1: 画像ビューワー

## 1. 画像ビューワー概要

### 1.1 目的

単体画像ファイルを快適に閲覧・管理できる統合画像ビューワー。

### 1.2 主要機能

- **多形式対応**: JPEG, PNG, WebP, GIF, SVG, BMP
- **高速表示**: ネイティブImage API使用
- **ズーム・パン**: スムーズな拡大縮小・移動
- **回転機能**: 90度単位の回転
- **EXIF情報表示**: 撮影情報・メタデータ
- **比較モード**: 2枚並べて比較
- **スライドショー**: 自動切替表示
- **簡易編集**: トリミング・回転・反転

### 1.3 対応形式

```typescript
const SUPPORTED_IMAGE_FORMATS = {
  jpg: ['image/jpeg', '.jpg', '.jpeg'],
  png: ['image/png', '.png'],
  webp: ['image/webp', '.webp'],
  gif: ['image/gif', '.gif'],
  svg: ['image/svg+xml', '.svg'],
  bmp: ['image/bmp', '.bmp'],
  // Phase 2
  tiff: ['image/tiff', '.tiff', '.tif'],
  ico: ['image/x-icon', '.ico'],
  heif: ['image/heif', '.heif', '.heic'],
  avif: ['image/avif', '.avif'],
};
```

---

## 2. 画像画面構成

### 2.1 全体レイアウト

```txt
┌──────────────────────────────────────────────────────────────┐
│ ヘッダー (高さ: 56px, 自動非表示)                             │
│ [◀] photo_001.jpg (5/12) [比較] [情報] [⚙] [×]              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                       画像表示エリア                          │
│                      (可変サイズ)                            │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ツールバー (高さ: 56px, 自動非表示)                           │
│ [100%▾] [フィット] [1:1] [回転↻] [反転↔] [▶スライド]         │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 ヘッダー詳細

```txt
┌──────────────────────────────────────────────────────────────┐
│ [◀][▶] photo_001.jpg (5/12) [比較] [ℹ️] [⚙] [─][□][×]      │
└──────────────────────────────────────────────────────────────┘
```

**要素:**

| 要素 | 説明 | サイズ |
|-----|------|-------|
| `[◀][▶]` | 前/次の画像 | 40x40px × 2 |
| ファイル名 | 現在の画像ファイル名 | 可変 |
| `(5/12)` | リスト内位置 | 60px |
| `[比較]` | 比較モード切替 | 80px |
| `[ℹ️]` | EXIF情報パネル | 40x40px |
| `[⚙]` | 設定 | 40x40px |

### 2.3 ツールバー

```txt
┌──────────────────────────────────────────────────────────────┐
│ [100%▾] [フィット] [1:1] [↻] [↺] [↔] [↕] [▶] [📁]           │
└──────────────────────────────────────────────────────────────┘
```

**機能:**

- ズームレベル選択（ドロップダウン）
- フィット（幅・高さ・全体）
- 原寸表示（1:1）
- 回転（時計回り/反時計回り）
- 反転（左右/上下）
- スライドショー開始
- エクスプローラーで表示

---

## 3. 画像処理

### 3.1 画像読み込み

```typescript
interface ImageLoadResult {
  success: boolean;
  image: ImageInfo | null;
  error?: string;
}

interface ImageInfo {
  path: string;
  name: string;
  width: number;
  height: number;
  size: number;
  format: string;
  exif?: EXIFData;
  colorSpace?: string;
  hasAlpha: boolean;
}

interface EXIFData {
  make?: string;           // カメラメーカー
  model?: string;          // カメラモデル
  dateTime?: Date;         // 撮影日時
  orientation?: number;    // 向き
  exposureTime?: string;   // 露出時間
  fNumber?: number;        // F値
  iso?: number;            // ISO感度
  focalLength?: number;    // 焦点距離
  flash?: string;          // フラッシュ
  gps?: {
    latitude: number;
    longitude: number;
  };
}
```

#### 3.1.1 画像読み込み処理

```typescript
const loadImage = async (filePath: string): Promise<ImageLoadResult> => {
  try {
    // 1. ファイル存在確認
    const exists = await window.electronAPI.fileExists(filePath);
    if (!exists) {
      return { success: false, image: null, error: 'ファイルが見つかりません' };
    }

    // 2. 基本情報取得
    const stats = await window.electronAPI.getFileStats(filePath);
    const buffer = await window.electronAPI.readFile(filePath);

    // 3. 画像をロード
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = url;
    });

    // 4. EXIF情報取得（メインプロセスで処理）
    const exif = await window.electronAPI.getImageExif(filePath);

    const imageInfo: ImageInfo = {
      path: filePath,
      name: path.basename(filePath),
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: stats.size,
      format: path.extname(filePath).slice(1).toUpperCase(),
      exif,
      hasAlpha: await checkAlphaChannel(img),
    };

    return { success: true, image: imageInfo };

  } catch (error) {
    console.error('Image load error:', error);
    return {
      success: false,
      image: null,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};
```

#### 3.1.2 EXIF処理（メインプロセス）

```typescript
// main/services/image-metadata.ts
import ExifParser from 'exif-parser';

export const getImageExif = async (filePath: string): Promise<EXIFData | undefined> => {
  try {
    const buffer = await fs.promises.readFile(filePath);

    // EXIF対応形式のみ処理
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.tiff', '.tif'].includes(ext)) {
      return undefined;
    }

    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    if (!result.tags) return undefined;

    const tags = result.tags;

    return {
      make: tags.Make,
      model: tags.Model,
      dateTime: tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000) : undefined,
      orientation: tags.Orientation,
      exposureTime: tags.ExposureTime ? `1/${Math.round(1 / tags.ExposureTime)}` : undefined,
      fNumber: tags.FNumber,
      iso: tags.ISO,
      focalLength: tags.FocalLength,
      flash: tags.Flash ? 'On' : 'Off',
      gps: tags.GPSLatitude && tags.GPSLongitude ? {
        latitude: tags.GPSLatitude,
        longitude: tags.GPSLongitude,
      } : undefined,
    };

  } catch (error) {
    console.error('Failed to read EXIF:', error);
    return undefined;
  }
};
```

### 3.2 画像表示コンポーネント

```typescript
const ImageDisplay: React.FC<{
  imagePath: string;
  fitMode: FitMode;
  zoom: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}> = ({ imagePath, fitMode, zoom, rotation, flipH, flipV }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 画像読み込み
  useEffect(() => {
    const loadImageFile = async () => {
      const buffer = await window.electronAPI.readFile(imagePath);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      return () => URL.revokeObjectURL(url);
    };

    loadImageFile();
  }, [imagePath]);

  // 自然サイズ取得
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // 表示スケール計算
  const displayScale = useMemo(() => {
    if (!containerRef.current || !naturalSize.width) return 1;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 回転を考慮したサイズ
    const isRotated = rotation === 90 || rotation === 270;
    const imgWidth = isRotated ? naturalSize.height : naturalSize.width;
    const imgHeight = isRotated ? naturalSize.width : naturalSize.height;

    switch (fitMode) {
      case 'fit-width':
        return containerWidth / imgWidth;
      case 'fit-height':
        return containerHeight / imgHeight;
      case 'fit-both':
        return Math.min(
          containerWidth / imgWidth,
          containerHeight / imgHeight
        );
      case 'original':
        return 1.0;
      case 'custom':
        return zoom;
      default:
        return 1.0;
    }
  }, [fitMode, zoom, rotation, naturalSize, containerRef.current]);

  // Transform CSS
  const imageStyle: React.CSSProperties = {
    transform: `
      rotate(${rotation}deg)
      scaleX(${flipH ? -1 : 1})
      scaleY(${flipV ? -1 : 1})
      scale(${displayScale})
    `,
    transformOrigin: 'center center',
    transition: 'transform 0.3s ease',
    maxWidth: 'none',
    maxHeight: 'none',
  };

  return (
    <div className="image-display" ref={containerRef}>
      {imageUrl ? (
        <img
          ref={imageRef}
          src={imageUrl}
          alt="表示中の画像"
          onLoad={handleImageLoad}
          style={imageStyle}
          draggable={false}
        />
      ) : (
        <div className="image-loading">
          <Spinner />
          <p>画像を読み込んでいます...</p>
        </div>
      )}
    </div>
  );
};
```

---

## 4. 画像表示制御

### 4.1 ズーム・パン

```typescript
const useImageZoomPan = () => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.25, 10.0));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.25, 0.1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.1, Math.min(prev + delta, 10.0)));
    }
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 0 && zoom > 1.0) {
      setIsDragging(true);
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;

      setPan(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));

      lastPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    zoom,
    pan,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
```

### 4.2 回転・反転

```typescript
const useImageTransform = () => {
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  const rotateClockwise = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360);
  }, []);

  const toggleFlipH = useCallback(() => {
    setFlipH(prev => !prev);
  }, []);

  const toggleFlipV = useCallback(() => {
    setFlipV(prev => !prev);
  }, []);

  const reset = useCallback(() => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  }, []);

  return {
    rotation,
    flipH,
    flipV,
    rotateClockwise,
    rotateCounterClockwise,
    toggleFlipH,
    toggleFlipV,
    reset,
  };
};
```

---

## 5. 画像編集機能

### 5.1 EXIF情報パネル

```typescript
const ExifPanel: React.FC<{
  exif: EXIFData | undefined;
  imageInfo: ImageInfo;
  isOpen: boolean;
  onClose: () => void;
}> = ({ exif, imageInfo, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="exif-panel">
      <div className="panel-header">
        <h3>画像情報</h3>
        <button onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="panel-content">
        {/* 基本情報 */}
        <section className="info-section">
          <h4>基本情報</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">ファイル名</span>
              <span className="value">{imageInfo.name}</span>
            </div>
            <div className="info-item">
              <span className="label">形式</span>
              <span className="value">{imageInfo.format}</span>
            </div>
            <div className="info-item">
              <span className="label">サイズ</span>
              <span className="value">
                {imageInfo.width} × {imageInfo.height}
              </span>
            </div>
            <div className="info-item">
              <span className="label">ファイルサイズ</span>
              <span className="value">{formatFileSize(imageInfo.size)}</span>
            </div>
          </div>
        </section>

        {/* EXIF情報 */}
        {exif && (
          <section className="info-section">
            <h4>撮影情報</h4>
            <div className="info-grid">
              {exif.make && (
                <div className="info-item">
                  <span className="label">メーカー</span>
                  <span className="value">{exif.make}</span>
                </div>
              )}
              {exif.model && (
                <div className="info-item">
                  <span className="label">モデル</span>
                  <span className="value">{exif.model}</span>
                </div>
              )}
              {exif.dateTime && (
                <div className="info-item">
                  <span className="label">撮影日時</span>
                  <span className="value">
                    {exif.dateTime.toLocaleString('ja-JP')}
                  </span>
                </div>
              )}
              {exif.exposureTime && (
                <div className="info-item">
                  <span className="label">シャッター速度</span>
                  <span className="value">{exif.exposureTime}秒</span>
                </div>
              )}
              {exif.fNumber && (
                <div className="info-item">
                  <span className="label">絞り</span>
                  <span className="value">F{exif.fNumber}</span>
                </div>
              )}
              {exif.iso && (
                <div className="info-item">
                  <span className="label">ISO感度</span>
                  <span className="value">ISO {exif.iso}</span>
                </div>
              )}
              {exif.focalLength && (
                <div className="info-item">
                  <span className="label">焦点距離</span>
                  <span className="value">{exif.focalLength}mm</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* GPS情報 */}
        {exif?.gps && (
          <section className="info-section">
            <h4>位置情報</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">緯度</span>
                <span className="value">{exif.gps.latitude.toFixed(6)}</span>
              </div>
              <div className="info-item">
                <span className="label">経度</span>
                <span className="value">{exif.gps.longitude.toFixed(6)}</span>
              </div>
            </div>
            <button
              className="map-button"
              onClick={() => {
                const url = `https://www.google.com/maps?q=${exif.gps!.latitude},${exif.gps!.longitude}`;
                window.electronAPI.openExternal(url);
              }}
            >
              地図で表示
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
```

### 5.2 比較モード

```typescript
const ComparisonView: React.FC<{
  leftImage: string;
  rightImage: string;
  onClose: () => void;
}> = ({ leftImage, rightImage, onClose }) => {
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    setSplitPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h3>画像比較</h3>
        <button onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <div
        className="comparison-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* 左画像 */}
        <div className="comparison-left" style={{ width: `${splitPosition}%` }}>
          <img src={`file://${leftImage}`} alt="左画像" />
          <div className="image-label">元の画像</div>
        </div>

        {/* 右画像 */}
        <div className="comparison-right" style={{ width: `${100 - splitPosition}%` }}>
          <img src={`file://${rightImage}`} alt="右画像" />
          <div className="image-label">比較画像</div>
        </div>

        {/* スライダー */}
        <div
          className="comparison-slider"
          style={{ left: `${splitPosition}%` }}
          onMouseDown={handleMouseDown}
        >
          <div className="slider-line" />
          <div className="slider-handle">
            <ChevronLeftIcon size={20} />
            <ChevronRightIcon size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};
```

---
