# パート2: 音声プレイヤー

## 6. 音声プレイヤー概要

### 6.1 目的

音声ファイルを快適に再生・管理できる統合音声プレイヤー。

### 6.2 主要機能

- **多形式対応**: MP3, WAV, OGG, AAC, M4A, FLAC
- **プレイリスト**: 連続再生・シャッフル・リピート
- **イコライザー**: 音質調整
- **波形表示**: ビジュアライザー
- **A-Bリピート**: 部分リピート
- **ブックマーク**: 位置記憶
- **歌詞表示**: LRCファイル対応（Phase 2）

### 6.3 対応形式

```typescript
const SUPPORTED_AUDIO_FORMATS = {
  mp3: ['audio/mpeg', '.mp3'],
  wav: ['audio/wav', '.wav'],
  ogg: ['audio/ogg', '.ogg'],
  aac: ['audio/aac', '.aac'],
  m4a: ['audio/mp4', '.m4a'],
  flac: ['audio/flac', '.flac'],
  // Phase 2
  opus: ['audio/opus', '.opus'],
  wma: ['audio/x-ms-wma', '.wma'],
};
```

---

## 7. 音声画面構成

### 7.1 全体レイアウト

```txt
┌──────────────────────────────────────────────────────────────┐
│ ヘッダー (高さ: 56px)                                         │
│ [◀] song_001.mp3 (5/12) [プレイリスト] [イコライザー] [×]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                   アルバムアート                              │
│                   (300x300px)                                │
│                                                              │
│                 曲名・アーティスト情報                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ 波形表示 (高さ: 100px)                                        │
│ [▬▬▬▬▬▬▬◆▬▬▬▬▬▬▬▬▬▬▬]                                        │
├──────────────────────────────────────────────────────────────┤
│ 再生コントロール (高さ: 80px)                                 │
│ [◀◀] [▶/⏸] [▶▶] 01:23 / 03:45 [🔊] [🔀] [🔁]              │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 アルバムアート表示

```typescript
const AlbumArt: React.FC<{
  audioPath: string;
  metadata: AudioMetadata;
}> = ({ audioPath, metadata }) => {
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadArtwork = async () => {
      // メタデータからアートワーク取得
      if (metadata.picture) {
        const blob = new Blob([metadata.picture.data], { type: metadata.picture.format });
        const url = URL.createObjectURL(blob);
        setArtworkUrl(url);

        return () => URL.revokeObjectURL(url);
      }
    };

    loadArtwork();
  }, [metadata]);

  return (
    <div className="album-art">
      {artworkUrl ? (
        <img src={artworkUrl} alt="アルバムアート" />
      ) : (
        <div className="default-artwork">
          <MusicIcon size={100} />
        </div>
      )}
    </div>
  );
};
```

---

## 8. 音声処理

### 8.1 音声読み込み

```typescript
interface AudioLoadResult {
  success: boolean;
  audio: AudioInfo | null;
  error?: string;
}

interface AudioInfo {
  path: string;
  name: string;
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  format: string;
  metadata: AudioMetadata;
}

interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  track?: number;
  picture?: {
    data: Uint8Array;
    format: string;
  };
}
```

#### 8.1.1 メタデータ取得（メインプロセス）

```typescript
// main/services/audio-metadata.ts
import musicMetadata from 'music-metadata';

export const getAudioMetadata = async (filePath: string): Promise<AudioMetadata> => {
  try {
    const metadata = await musicMetadata.parseFile(filePath);

    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      year: metadata.common.year,
      genre: metadata.common.genre?.[0],
      track: metadata.common.track.no,
      picture: metadata.common.picture?.[0] ? {
        data: metadata.common.picture[0].data,
        format: metadata.common.picture[0].format,
      } : undefined,
    };

  } catch (error) {
    console.error('Failed to read audio metadata:', error);
    return {};
  }
};
```

### 8.2 音声再生コンポーネント

```typescript
const AudioPlayer: React.FC<{
  audioPath: string;
  onEnded: () => void;
}> = ({ audioPath, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // 音声読み込み
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = `file://${audioPath}`;
    audio.load();
  }, [audioPath]);

  // イベントハンドラー
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <AudioControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        playbackRate={playbackRate}
        onPlayPause={togglePlay}
        onSeek={seek}
        onVolumeChange={(v) => {
          setVolume(v);
          if (audioRef.current) audioRef.current.volume = v;
        }}
        onPlaybackRateChange={(r) => {
          setPlaybackRate(r);
          if (audioRef.current) audioRef.current.playbackRate = r;
        }}
      />
    </>
  );
};
```

---

## 9. プレイリスト管理

### 9.1 プレイリストUI

```typescript
const PlaylistPanel: React.FC<{
  playlist: AudioInfo[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ playlist, currentIndex, onSelect, onRemove, isOpen, onClose }) => {
  if (!isOpen) return null;

  const totalDuration = playlist.reduce((sum, audio) => sum + audio.duration, 0);

  return (
    <div className="playlist-panel">
      <div className="panel-header">
        <h3>プレイリスト ({playlist.length}曲)</h3>
        <div className="playlist-info">
          合計: {formatDuration(totalDuration)}
        </div>
        <button onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="playlist-items">
        {playlist.map((audio, index) => (
          <div
            key={audio.path}
            className={`playlist-item ${index === currentIndex ? 'playing' : ''}`}
            onClick={() => onSelect(index)}
          >
            <div className="item-number">{index + 1}</div>

            <div className="item-artwork">
              {audio.metadata.picture ? (
                <img src={URL.createObjectURL(new Blob([audio.metadata.picture.data]))} alt="" />
              ) : (
                <MusicIcon size={32} />
              )}
            </div>

            <div className="item-info">
              <div className="item-title">
                {audio.metadata.title || audio.name}
              </div>
              <div className="item-artist">
                {audio.metadata.artist || '不明なアーティスト'}
              </div>
            </div>

            <div className="item-duration">
              {formatDuration(audio.duration)}
            </div>

            {index === currentIndex && (
              <div className="playing-indicator">
                <PlayIcon size={16} />
              </div>
            )}

            <button
              className="item-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 10. 可視化機能

### 10.1 波形表示

```typescript
const Waveform: React.FC<{
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}> = ({ audioElement, currentTime, duration, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // 波形データ生成
  useEffect(() => {
    if (!audioElement) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const generateWaveform = () => {
      analyser.getByteTimeDomainData(dataArray);
      setWaveformData(Array.from(dataArray));
      requestAnimationFrame(generateWaveform);
    };

    generateWaveform();

    return () => {
      audioContext.close();
    };
  }, [audioElement]);

  // 波形描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // クリア
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // 波形描画
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1976d2';
    ctx.beginPath();

    const sliceWidth = width / waveformData.length;
    let x = 0;

    for (let i = 0; i < waveformData.length; i++) {
      const v = waveformData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // 再生位置インジケーター
    const progressX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

  }, [waveformData, currentTime, duration]);

  // クリックでシーク
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;

    onSeek(time);
  };

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={800}
      height={100}
      onClick={handleClick}
    />
  );
};
```

### 10.2 スペクトラムアナライザー

```typescript
const SpectrumAnalyzer: React.FC<{
  audioElement: HTMLAudioElement | null;
}> = ({ audioElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioElement) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        // グラデーション
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#1976d2');
        gradient.addColorStop(1, '#00bcd4');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      audioContext.close();
    };
  }, [audioElement]);

  return (
    <canvas
      ref={canvasRef}
      className="spectrum-canvas"
      width={800}
      height={200}
    />
  );
};
```

---

## 11. 統合コンポーネント

### 11.1 画像ビューワーメイン

```typescript
const ImageViewer: React.FC<{
  file: FileInfo;
  files: FileInfo[];
  onClose: () => void;
}> = ({ file, files, onClose }) => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(
    files.findIndex(f => f.id === file.id)
  );

  const zoom = useImageZoomPan();
  const transform = useImageTransform();
  const [fitMode, setFitMode] = useState<FitMode>('fit-both');
  const [showExif, setShowExif] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const currentFile = files[currentIndex];

  // 画像読み込み
  useEffect(() => {
    const load = async () => {
      const result = await loadImage(currentFile.file_path);
      if (result.success && result.image) {
        setImageInfo(result.image);
      }
    };
    load();
  }, [currentFile]);

  const actions = {
    next: () => setCurrentIndex(prev => Math.min(prev + 1, files.length - 1)),
    prev: () => setCurrentIndex(prev => Math.max(prev - 1, 0)),
    zoomIn: zoom.zoomIn,
    zoomOut: zoom.zoomOut,
    resetZoom: zoom.resetZoom,
    rotateClockwise: transform.rotateClockwise,
    rotateCounterClockwise: transform.rotateCounterClockwise,
    toggleFlipH: transform.toggleFlipH,
    toggleFlipV: transform.toggleFlipV,
    setFitMode,
    toggleExif: () => setShowExif(prev => !prev),
    toggleComparison: () => setShowComparison(prev => !prev),
  };

  return (
    <div className="image-viewer">
      <ViewerHeader
        fileName={currentFile.file_name}
        currentIndex={currentIndex + 1}
        totalCount={files.length}
        onPrev={actions.prev}
        onNext={actions.next}
        onClose={onClose}
      />

      <div className="viewer-content">
        <ImageDisplay
          imagePath={currentFile.file_path}
          fitMode={fitMode}
          zoom={zoom.zoom}
          rotation={transform.rotation}
          flipH={transform.flipH}
          flipV={transform.flipV}
        />
      </div>

      <Toolbar
        zoom={zoom.zoom}
        fitMode={fitMode}
        onZoomIn={actions.zoomIn}
        onZoomOut={actions.zoomOut}
        onFitModeChange={actions.setFitMode}
        onRotateClockwise={actions.rotateClockwise}
        onRotateCounterClockwise={actions.rotateCounterClockwise}
        onToggleFlipH={actions.toggleFlipH}
        onToggleFlipV={actions.toggleFlipV}
      />

      {showExif && imageInfo && (
        <ExifPanel
          exif={imageInfo.exif}
          imageInfo={imageInfo}
          isOpen={showExif}
          onClose={() => setShowExif(false)}
        />
      )}
    </div>
  );
};
```

### 11.2 音声プレイヤーメイン

```typescript
const AudioPlayerViewer: React.FC<{
  file: FileInfo;
  files: FileInfo[];
  onClose: () => void;
}> = ({ file, files, onClose }) => {
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const playlist = usePlaylist(files);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const currentFile = files[playlist.currentIndex];

  useEffect(() => {
    const load = async () => {
      const metadata = await window.electronAPI.getAudioMetadata(currentFile.file_path);
      // AudioInfo構築
    };
    load();
  }, [currentFile]);

  return (
    <div className="audio-player-viewer">
      <div className="player-main">
        {audioInfo && (
          <>
            <AlbumArt
              audioPath={currentFile.file_path}
              metadata={audioInfo.metadata}
            />

            <div className="track-info">
              <h2>{audioInfo.metadata.title || audioInfo.name}</h2>
              <p>{audioInfo.metadata.artist || '不明なアーティスト'}</p>
            </div>

            <AudioPlayer
              audioPath={currentFile.file_path}
              onEnded={playlist.next}
            />
          </>
        )}
      </div>

      {showPlaylist && (
        <PlaylistPanel
          playlist={files.map(f => ({ ...f } as any))}
          currentIndex={playlist.currentIndex}
          onSelect={playlist.selectTrack}
          onRemove={playlist.removeTrack}
          isOpen={showPlaylist}
          onClose={() => setShowPlaylist(false)}
        />
      )}
    </div>
  );
};
```

---

## 12. キーボードショートカット

### 12.1 画像ビューワー

```typescript
const useImageKeyboard = (actions: ImageViewerActions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          actions.next();
          break;
        case 'ArrowLeft':
        case 'p':
          actions.prev();
          break;
        case '+':
        case '=':
          actions.zoomIn();
          break;
        case '-':
          actions.zoomOut();
          break;
        case '0':
          actions.resetZoom();
          break;
        case 'r':
          actions.rotateClockwise();
          break;
        case 'R':
          if (e.shiftKey) actions.rotateCounterClockwise();
          break;
        case 'h':
          actions.toggleFlipH();
          break;
        case 'v':
          actions.toggleFlipV();
          break;
        case 'i':
          actions.toggleExif();
          break;
        case 'c':
          actions.toggleComparison();
          break;
        case 'f':
        case 'F11':
          actions.toggleFullscreen();
          break;
        case 'Escape':
          actions.closeViewer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};
```

### 12.2 音声プレイヤー

```typescript
const useAudioKeyboard = (actions: AudioPlayerActions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          actions.togglePlay();
          break;
        case 'ArrowRight':
          actions.seekForward(5);
          break;
        case 'ArrowLeft':
          actions.seekBackward(5);
          break;
        case 'n':
          actions.next();
          break;
        case 'p':
          actions.previous();
          break;
        case 'm':
          actions.toggleMute();
          break;
        case 'l':
          actions.togglePlaylist();
          break;
        case 's':
          actions.toggleShuffle();
          break;
        case 'r':
          actions.cycleRepeat();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};
```

---

## 型定義まとめ

```typescript
export type FitMode = 'fit-width' | 'fit-height' | 'fit-both' | 'original' | 'custom';

export interface ImageViewerActions {
  next: () => void;
  prev: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  rotateClockwise: () => void;
  rotateCounterClockwise: () => void;
  toggleFlipH: () => void;
  toggleFlipV: () => void;
  setFitMode: (mode: FitMode) => void;
  toggleExif: () => void;
  toggleComparison: () => void;
  toggleFullscreen: () => void;
  closeViewer: () => void;
}

export interface AudioPlayerActions {
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  togglePlaylist: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  closeViewer: () => void;
}
```
