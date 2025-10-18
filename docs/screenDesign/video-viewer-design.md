# 動画ビューワー 詳細設計書

## 概要・画面構成・動画処理

---

## 1. ビューワー概要

### 1.1 目的

さまざまな形式の動画ファイルを快適に再生・管理できる統合動画ビューワー。

### 1.2 主要機能

- **多形式対応**: MP4, WebM, OGV, MKV, AVI対応
- **プレイリスト再生**: タグで抽出した動画を連続再生
- **再生制御**: 再生/一時停止、シーク、速度変更
- **字幕対応**: 外部字幕ファイル（SRT, VTT）
- **スナップショット**: 任意のフレームをキャプチャ
- **ピクチャーインピクチャー**: デスクトップ上に常に表示
- **チャプター管理**: シーンマーカー設定
- **視聴履歴**: 再生位置の自動記憶

### 1.3 対応形式

**動画コンテナ:**

- MP4 (.mp4)
- WebM (.webm)
- OGV (.ogv)
- MKV (.mkv) (Phase 1 - 基本対応）
- AVI (.avi) (Phase 2)

**コーデック:**

- 映像: H.264, H.265/HEVC, VP8, VP9, AV1
- 音声: AAC, MP3, Opus, Vorbis

**字幕:**

- SubRip (.srt)
- WebVTT (.vtt)
- ASS/SSA (.ass, .ssa) (Phase 2)

---

## 2. 画面構成

### 2.1 全体レイアウト

```txt
┌──────────────────────────────────────────────────────────────┐
│ ヘッダー (高さ: 56px, 自動非表示)                             │
│ [◀️] video_001.mp4 (5/12) [📋] [⚙️] [─] [□] [×]              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                       動画表示エリア                          │
│                    (16:9 アスペクト比)                       │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ コントロールバー (高さ: 80px, 自動非表示)                     │
│ [▶️] [⏮️] [⏭️] [━━━●━━━━━━━] 12:34 / 45:67 [🔊] [⚙️] [⛶]   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 ヘッダー詳細

```txt
┌──────────────────────────────────────────────────────────────┐
│ [◀️] video_001.mp4 (5/12) [📋] [⚙️] [─] [□] [×]              │
└──────────────────────────────────────────────────────────────┘
```

**要素:**

| 要素 | 説明 | サイズ |
|-----|------|-------|
| `[◀️]` | 前の動画 | 40x40px |
| ファイル名 | 現在の動画ファイル名 | 可変 |
| `(5/12)` | プレイリスト内位置 | 80px |
| `[📋]` | プレイリストパネル切替 | 40x40px |
| `[⚙️]` | 設定メニュー | 40x40px |
| `[─]` `[□]` `[×]` | ウィンドウ操作 | 40x40px × 3 |

### 2.3 コントロールバー詳細

```txt
┌──────────────────────────────────────────────────────────────┐
│ 再生コントロール                                              │
│ [▶️] [⏮️] [⏭️] [━━━●━━━━━━━] 12:34 / 45:67 [🔊] [⚙️] [⛶]   │
│                                                              │
│ 追加コントロール（展開時）                                    │
│ [字幕] [速度: 1.0x] [画質] [📷] [🔖]                         │
└──────────────────────────────────────────────────────────────┘
```

**基本コントロール:**

| 要素 | 説明 |
|-----|------|
| `[▶️]` / `[⏸️]` | 再生/一時停止 |
| `[⏮️]` | 前の動画 |
| `[⏭️]` | 次の動画 |
| シークバー | 再生位置スライダー |
| 時間表示 | 現在時刻 / 総時間 |
| `[🔊]` | 音量コントロール |
| `[⚙️]` | 設定メニュー展開 |
| `[⛶]` | 全画面切替 |

**拡張コントロール:**

| 要素 | 説明 |
|-----|------|
| `[字幕]` | 字幕ON/OFF・選択 |
| `[速度]` | 再生速度変更 |
| `[画質]` | 品質設定 |
| `[📷]` | スナップショット |
| `[🔖]` | チャプターマーク追加 |

---

## 3. 動画処理

### 3.1 動画読み込み

#### 3.1.1 型定義

```typescript
interface VideoLoadResult {
  success: boolean;
  video: VideoInfo | null;
  error?: string;
}

interface VideoInfo {
  path: string;
  name: string;
  duration: number;        // 秒
  width: number;
  height: number;
  aspectRatio: number;
  codec_video: string;
  codec_audio: string;
  bitrate: number;         // kbps
  framerate: number;
  size: number;            // バイト
  hasAudio: boolean;
  hasVideo: boolean;
  thumbnailPath?: string;
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrack[];
}

interface SubtitleTrack {
  id: number;
  language: string;
  label: string;
  format: 'srt' | 'vtt' | 'ass';
  path?: string;           // 外部字幕ファイル
  isEmbedded: boolean;     // 埋め込み字幕
}

interface AudioTrack {
  id: number;
  language: string;
  label: string;
  channels: number;
  codec: string;
}
```

#### 3.1.2 読み込みフロー

```typescript
const loadVideo = async (filePath: string): Promise<VideoLoadResult> => {
  try {
    // 1. ファイル存在確認
    const exists = await window.electronAPI.fileExists(filePath);
    if (!exists) {
      return { success: false, video: null, error: 'ファイルが見つかりません' };
    }

    // 2. メタデータ取得（ffprobe使用）
    const metadata = await window.electronAPI.getVideoMetadata(filePath);

    // 3. コーデック対応チェック
    const isSupported = checkCodecSupport(
      metadata.codec_video,
      metadata.codec_audio
    );

    if (!isSupported) {
      return {
        success: false,
        video: null,
        error: `非対応のコーデック: ${metadata.codec_video}/${metadata.codec_audio}`
      };
    }

    // 4. 字幕トラック検出
    const subtitleTracks = await detectSubtitleTracks(filePath, metadata);

    // 5. 音声トラック検出
    const audioTracks = metadata.audioStreams.map((stream, index) => ({
      id: index,
      language: stream.language || 'unknown',
      label: stream.title || `Audio ${index + 1}`,
      channels: stream.channels,
      codec: stream.codec,
    }));

    // 6. サムネイル生成
    const thumbnailPath = await generateVideoThumbnail(filePath);

    const video: VideoInfo = {
      path: filePath,
      name: path.basename(filePath),
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.width / metadata.height,
      codec_video: metadata.codec_video,
      codec_audio: metadata.codec_audio,
      bitrate: metadata.bitrate,
      framerate: metadata.framerate,
      size: metadata.size,
      hasAudio: audioTracks.length > 0,
      hasVideo: !!metadata.videoStream,
      thumbnailPath,
      subtitleTracks,
      audioTracks,
    };

    return { success: true, video };

  } catch (error) {
    console.error('Video load error:', error);
    return {
      success: false,
      video: null,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};
```

### 3.2 コーデック対応チェック

```typescript
const SUPPORTED_VIDEO_CODECS = [
  'h264', 'avc1',           // H.264
  'h265', 'hevc', 'hvc1',   // H.265
  'vp8',                    // VP8
  'vp9',                    // VP9
  'av1', 'av01',            // AV1
];

const SUPPORTED_AUDIO_CODECS = [
  'aac', 'mp4a',            // AAC
  'mp3',                    // MP3
  'opus',                   // Opus
  'vorbis',                 // Vorbis
];

const checkCodecSupport = (
  videoCodec: string,
  audioCodec: string
): boolean => {
  const videoSupported = SUPPORTED_VIDEO_CODECS.some(codec =>
    videoCodec.toLowerCase().includes(codec)
  );

  const audioSupported = !audioCodec || SUPPORTED_AUDIO_CODECS.some(codec =>
    audioCodec.toLowerCase().includes(codec)
  );

  return videoSupported && audioSupported;
};

// ブラウザのネイティブサポート確認
const canPlayNatively = (mimeType: string, codecs?: string): boolean => {
  const video = document.createElement('video');
  const fullType = codecs ? `${mimeType}; codecs="${codecs}"` : mimeType;

  const support = video.canPlayType(fullType);
  return support === 'probably' || support === 'maybe';
};
```

### 3.3 メタデータ取得

**メインプロセス (fluent-ffmpeg使用):**

```typescript
// main/services/video-metadata.ts
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

interface FFprobeResult {
  format: {
    duration: number;
    bit_rate: number;
    size: number;
  };
  streams: Array<{
    codec_type: 'video' | 'audio' | 'subtitle';
    codec_name: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
    channels?: number;
    channel_layout?: string;
    tags?: {
      language?: string;
      title?: string;
    };
  }>;
}

export const getVideoMetadata = async (filePath: string): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data: FFprobeResult) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = data.streams.find(s => s.codec_type === 'video');
      const audioStreams = data.streams.filter(s => s.codec_type === 'audio');
      const subtitleStreams = data.streams.filter(s => s.codec_type === 'subtitle');

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      // フレームレート計算
      const framerateParts = videoStream.r_frame_rate?.split('/') || ['30', '1'];
      const framerate = parseInt(framerateParts[0]) / parseInt(framerateParts[1]);

      resolve({
        duration: data.format.duration,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec_video: videoStream.codec_name,
        codec_audio: audioStreams[0]?.codec_name || '',
        bitrate: Math.round(data.format.bit_rate / 1000), // kbps
        framerate,
        size: parseInt(data.format.size),
        videoStream,
        audioStreams,
        subtitleStreams,
      });
    });
  });
};
```

### 3.4 サムネイル生成

```typescript
// main/services/thumbnail.ts
export const generateVideoThumbnail = async (
  videoPath: string,
  options: {
    timestamp?: number; // 秒
    width?: number;
    height?: number;
  } = {}
): Promise<string> => {
  const { timestamp = 5, width = 320, height = 180 } = options;

  const thumbnailDir = path.join(app.getPath('userData'), 'cache', 'thumbnails');
  await fs.promises.mkdir(thumbnailDir, { recursive: true });

  const outputPath = path.join(
    thumbnailDir,
    `${createHash('md5').update(videoPath).digest('hex')}_${timestamp}.jpg`
  );

  // すでに存在する場合はスキップ
  if (await fileExists(outputPath)) {
    return outputPath;
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: thumbnailDir,
        size: `${width}x${height}`,
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
};
```

### 3.5 字幕検出

```typescript
const detectSubtitleTracks = async (
  videoPath: string,
  metadata: VideoMetadata
): Promise<SubtitleTrack[]> => {
  const tracks: SubtitleTrack[] = [];

  // 1. 埋め込み字幕
  metadata.subtitleStreams.forEach((stream, index) => {
    tracks.push({
      id: index,
      language: stream.tags?.language || 'unknown',
      label: stream.tags?.title || `Subtitle ${index + 1}`,
      format: 'vtt', // 変換が必要
      isEmbedded: true,
    });
  });

  // 2. 外部字幕ファイル検出
  const videoDir = path.dirname(videoPath);
  const videoName = path.basename(videoPath, path.extname(videoPath));

  const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];

  for (const ext of subtitleExtensions) {
    const subtitlePath = path.join(videoDir, videoName + ext);

    if (await fileExists(subtitlePath)) {
      tracks.push({
        id: tracks.length,
        language: 'unknown', // ファイル名から推測可能
        label: path.basename(subtitlePath),
        format: ext.slice(1) as 'srt' | 'vtt' | 'ass',
        path: subtitlePath,
        isEmbedded: false,
      });
    }
  }

  return tracks;
};
```

---

## 4. 動画再生制御

### 4.1 Video要素の管理

```typescript
const VideoPlayer: React.FC<{
  video: VideoInfo;
  onEnded: () => void;
  onError: (error: Error) => void;
}> = ({ video, onEnded, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // 動画読み込み
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.src = `file://${video.path}`;
    videoElement.load();
  }, [video.path]);

  // イベントハンドラー
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded();
    };

    const handleError = () => {
      onError(new Error('Video playback error'));
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('error', handleError);
    };
  }, [onEnded, onError]);

  // 再生/一時停止
  const togglePlay = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // シーク
  const seek = useCallback((time: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  // 音量変更
  const changeVolume = useCallback((newVolume: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    videoElement.volume = clampedVolume;
    setVolume(clampedVolume);
  }, []);

  // ミュート切替
  const toggleMute = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  // 再生速度変更
  const changePlaybackRate = useCallback((rate: number) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        preload="metadata"
      />
      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        onPlayPause={togglePlay}
        onSeek={seek}
        onVolumeChange={changeVolume}
        onMuteToggle={toggleMute}
        onPlaybackRateChange={changePlaybackRate}
      />
    </div>
  );
};
```

---

## UIコンポーネント・字幕・プレイリスト

---

## 5. コントロールバーUI

### 5.1 再生コントロール

```typescript
const PlaybackControls: React.FC<{
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}> = ({ isPlaying, onPlayPause, onPrevious, onNext, hasPrevious, hasNext }) => {
  return (
    <div className="playback-controls">
      <button
        className="control-button previous"
        onClick={onPrevious}
        disabled={!hasPrevious}
        aria-label="前の動画"
      >
        <SkipBackIcon size={24} />
      </button>

      <button
        className="control-button play-pause"
        onClick={onPlayPause}
        aria-label={isPlaying ? '一時停止' : '再生'}
      >
        {isPlaying ? <PauseIcon size={32} /> : <PlayIcon size={32} />}
      </button>

      <button
        className="control-button next"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="次の動画"
      >
        <SkipForwardIcon size={24} />
      </button>
    </div>
  );
};
```

### 5.2 シークバー

```typescript
const SeekBar: React.FC<{
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  onSeek: (time: number) => void;
  chapters?: Chapter[];
}> = ({ currentTime, duration, buffered, onSeek, chapters = [] }) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // シーク処理
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar) return;

    const rect = bar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const time = position * duration;

    onSeek(time);
  }, [duration, onSeek]);

  // ドラッグシーク
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsSeeking(true);
    handleSeek(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isSeeking) {
      const bar = barRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setSeekPosition(position);
    }
  };

  const handleMouseUp = () => {
    if (isSeeking) {
      onSeek(seekPosition * duration);
      setIsSeeking(false);
    }
  };

  useEffect(() => {
    if (isSeeking) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSeeking, seekPosition]);

  // ホバー時のプレビュー時間表示
  const handleMouseHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar) return;

    const rect = bar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const time = position * duration;

    setHoverTime(time);
  };

  const progress = (currentTime / duration) * 100;

  // バッファ済み範囲の計算
  const getBufferedRanges = (): Array<{ start: number; end: number }> => {
    if (!buffered) return [];

    const ranges: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: (buffered.start(i) / duration) * 100,
        end: (buffered.end(i) / duration) * 100,
      });
    }
    return ranges;
  };

  return (
    <div className="seek-bar-container">
      <div
        ref={barRef}
        className="seek-bar"
        onMouseDown={handleSeek}
        onMouseMove={handleMouseHover}
        onMouseLeave={() => setHoverTime(null)}
      >
        {/* バッファ済み範囲 */}
        {getBufferedRanges().map((range, index) => (
          <div
            key={index}
            className="buffered-range"
            style={{
              left: `${range.start}%`,
              width: `${range.end - range.start}%`,
            }}
          />
        ))}

        {/* 再生済み範囲 */}
        <div className="progress-bar" style={{ width: `${progress}%` }} />

        {/* チャプターマーカー */}
        {chapters.map((chapter, index) => (
          <div
            key={index}
            className="chapter-marker"
            style={{ left: `${(chapter.time / duration) * 100}%` }}
            title={chapter.title}
          />
        ))}

        {/* シークハンドル */}
        <div
          className="seek-handle"
          style={{ left: `${progress}%` }}
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* ホバー時のツールチップ */}
      {hoverTime !== null && (
        <div className="seek-tooltip" style={{ left: `${(hoverTime / duration) * 100}%` }}>
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
};
```

### 5.3 時間表示

```typescript
const TimeDisplay: React.FC<{
  currentTime: number;
  duration: number;
}> = ({ currentTime, duration }) => {
  return (
    <div className="time-display">
      <span className="current-time">{formatTime(currentTime)}</span>
      <span className="separator">/</span>
      <span className="duration">{formatTime(duration)}</span>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
```

### 5.4 音量コントロール

```typescript
const VolumeControl: React.FC<{
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}> = ({ volume, muted, onVolumeChange, onMuteToggle }) => {
  const [showSlider, setShowSlider] = useState(false);

  const getVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeXIcon size={20} />;
    if (volume < 0.5) return <Volume1Icon size={20} />;
    return <Volume2Icon size={20} />;
  };

  return (
    <div
      className="volume-control"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        className="volume-button"
        onClick={onMuteToggle}
        aria-label={muted ? 'ミュート解除' : 'ミュート'}
      >
        {getVolumeIcon()}
      </button>

      {showSlider && (
        <div className="volume-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="volume-slider"
            aria-label="音量"
          />
        </div>
      )}
    </div>
  );
};
```

### 5.5 再生速度コントロール

```typescript
const PlaybackRateControl: React.FC<{
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}> = ({ playbackRate, onPlaybackRateChange }) => {
  const [showMenu, setShowMenu] = useState(false);

  const rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  return (
    <div className="playback-rate-control">
      <button
        className="rate-button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="再生速度"
      >
        {playbackRate}x
      </button>

      {showMenu && (
        <div className="rate-menu">
          {rates.map(rate => (
            <button
              key={rate}
              className={`rate-option ${rate === playbackRate ? 'active' : ''}`}
              onClick={() => {
                onPlaybackRateChange(rate);
                setShowMenu(false);
              }}
            >
              {rate}x {rate === 1.0 && '(標準)'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 6. 字幕機能

### 6.1 字幕パーサー

#### 6.1.1 SRT形式

```typescript
interface SubtitleCue {
  id: number;
  startTime: number;  // 秒
  endTime: number;    // 秒
  text: string;
}

const parseSRT = (content: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const id = parseInt(lines[0]);
    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(2).join('\n');

    cues.push({ id, startTime, endTime, text });
  }

  return cues;
};
```

#### 6.1.2 WebVTT形式

```typescript
const parseVTT = (content: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const lines = content.split('\n');

  let currentCue: Partial<SubtitleCue> | null = null;
  let id = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // WEBVTT ヘッダーをスキップ
    if (line.startsWith('WEBVTT')) continue;
    if (line.startsWith('NOTE')) continue;

    // タイムスタンプ行
    const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

    if (timeMatch) {
      if (currentCue && currentCue.text) {
        cues.push(currentCue as SubtitleCue);
      }

      const startTime =
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000;

      const endTime =
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000;

      currentCue = { id: id++, startTime, endTime, text: '' };
    } else if (line && currentCue) {
      // テキスト行
      currentCue.text = currentCue.text ? `${currentCue.text}\n${line}` : line;
    }
  }

  // 最後のキュー
  if (currentCue && currentCue.text) {
    cues.push(currentCue as SubtitleCue);
  }

  return cues;
};
```

### 6.2 字幕表示コンポーネント

```typescript
const SubtitleDisplay: React.FC<{
  cues: SubtitleCue[];
  currentTime: number;
  enabled: boolean;
  fontSize: number;
  position: 'top' | 'bottom';
  backgroundColor: string;
  textColor: string;
}> = ({ cues, currentTime, enabled, fontSize, position, backgroundColor, textColor }) => {
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrentCue(null);
      return;
    }

    // 現在時刻に対応する字幕を検索
    const cue = cues.find(c =>
      currentTime >= c.startTime && currentTime <= c.endTime
    );

    setCurrentCue(cue || null);
  }, [currentTime, cues, enabled]);

  if (!currentCue) return null;

  return (
    <div
      className={`subtitle-display ${position}`}
      style={{
        fontSize: `${fontSize}px`,
        backgroundColor,
        color: textColor,
      }}
    >
      {currentCue.text.split('\n').map((line, index) => (
        <div key={index} className="subtitle-line">
          {line}
        </div>
      ))}
    </div>
  );
};
```

### 6.3 字幕選択メニュー

```typescript
const SubtitleMenu: React.FC<{
  tracks: SubtitleTrack[];
  currentTrack: number | null;
  onTrackSelect: (trackId: number | null) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}> = ({ tracks, currentTrack, onTrackSelect, fontSize, onFontSizeChange }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="subtitle-menu">
      <button
        className="subtitle-button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="字幕設定"
      >
        <SubtitlesIcon size={20} />
      </button>

      {showMenu && (
        <div className="subtitle-dropdown">
          <div className="menu-section">
            <h4>字幕トラック</h4>
            <button
              className={`track-option ${currentTrack === null ? 'active' : ''}`}
              onClick={() => {
                onTrackSelect(null);
                setShowMenu(false);
              }}
            >
              字幕なし
            </button>
            {tracks.map(track => (
              <button
                key={track.id}
                className={`track-option ${currentTrack === track.id ? 'active' : ''}`}
                onClick={() => {
                  onTrackSelect(track.id);
                  setShowMenu(false);
                }}
              >
                {track.label} {track.language && `(${track.language})`}
                {track.isEmbedded && <span className="badge">埋込</span>}
              </button>
            ))}
          </div>

          <div className="menu-section">
            <h4>フォントサイズ</h4>
            <input
              type="range"
              min="12"
              max="48"
              value={fontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
            />
            <span>{fontSize}px</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 6.4 字幕読み込み

```typescript
const useSubtitles = (video: VideoInfo) => {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<number | null>(null);
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  useEffect(() => {
    setTracks(video.subtitleTracks);
  }, [video]);

  const loadSubtitleTrack = async (trackId: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    try {
      let content: string;

      if (track.isEmbedded) {
        // 埋め込み字幕の抽出（ffmpegで変換）
        content = await window.electronAPI.extractEmbeddedSubtitle(
          video.path,
          trackId
        );
      } else if (track.path) {
        // 外部字幕ファイル読み込み
        content = await window.electronAPI.readFile(track.path, { encoding: 'utf8' });
      } else {
        return;
      }

      // フォーマットに応じてパース
      const parsedCues = track.format === 'vtt'
        ? parseVTT(content)
        : parseSRT(content);

      setCues(parsedCues);
      setCurrentTrack(trackId);
    } catch (error) {
      console.error('Failed to load subtitle:', error);
    }
  };

  const selectTrack = (trackId: number | null) => {
    if (trackId === null) {
      setCurrentTrack(null);
      setCues([]);
    } else {
      loadSubtitleTrack(trackId);
    }
  };

  return {
    tracks,
    currentTrack,
    cues,
    selectTrack,
  };
};
```

---

## 7. プレイリスト機能

### 7.1 プレイリスト管理

```typescript
interface Playlist {
  id: string;
  name: string;
  videos: VideoInfo[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}

const usePlaylist = (initialVideos: VideoInfo[]) => {
  const [playlist, setPlaylist] = useState<Playlist>({
    id: generateId(),
    name: 'Default Playlist',
    videos: initialVideos,
    currentIndex: 0,
    shuffle: false,
    repeat: 'none',
  });

  const [playbackHistory, setPlaybackHistory] = useState<number[]>([]);

  // 現在の動画
  const currentVideo = playlist.videos[playlist.currentIndex];

  // 次の動画へ
  const next = useCallback(() => {
    const { videos, currentIndex, shuffle, repeat } = playlist;

    if (shuffle) {
      // シャッフル時はランダムに選択（履歴を避ける）
      const availableIndices = videos
        .map((_, i) => i)
        .filter(i => !playbackHistory.includes(i));

      if (availableIndices.length === 0) {
        // すべて再生済みの場合
        if (repeat === 'all') {
          setPlaybackHistory([]);
          const randomIndex = Math.floor(Math.random() * videos.length);
          setPlaylist(prev => ({ ...prev, currentIndex: randomIndex }));
        }
        return;
      }

      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      setPlaybackHistory(prev => [...prev, randomIndex]);
      setPlaylist(prev => ({ ...prev, currentIndex: randomIndex }));
    } else {
      // 通常再生
      if (currentIndex < videos.length - 1) {
        setPlaylist(prev => ({ ...prev, currentIndex: currentIndex + 1 }));
      } else if (repeat === 'all') {
        setPlaylist(prev => ({ ...prev, currentIndex: 0 }));
      }
    }
  }, [playlist, playbackHistory]);

  // 前の動画へ
  const previous = useCallback(() => {
    const { currentIndex, shuffle, repeat } = playlist;

    if (shuffle && playbackHistory.length > 0) {
      // シャッフル時は履歴から戻る
      const prevIndex = playbackHistory[playbackHistory.length - 1];
      setPlaybackHistory(prev => prev.slice(0, -1));
      setPlaylist(prev => ({ ...prev, currentIndex: prevIndex }));
    } else {
      // 通常再生
      if (currentIndex > 0) {
        setPlaylist(prev => ({ ...prev, currentIndex: currentIndex - 1 }));
      } else if (repeat === 'all') {
        setPlaylist(prev => ({ ...prev, currentIndex: playlist.videos.length - 1 }));
      }
    }
  }, [playlist, playbackHistory]);

  // 特定の動画を選択
  const selectVideo = useCallback((index: number) => {
    if (index >= 0 && index < playlist.videos.length) {
      setPlaylist(prev => ({ ...prev, currentIndex: index }));
      setPlaybackHistory([]);
    }
  }, [playlist.videos.length]);

  // シャッフル切替
  const toggleShuffle = useCallback(() => {
    setPlaylist(prev => ({ ...prev, shuffle: !prev.shuffle }));
    setPlaybackHistory([]);
  }, []);

  // リピートモード切替
  const cycleRepeat = useCallback(() => {
    setPlaylist(prev => {
      const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
      const currentIndex = modes.indexOf(prev.repeat);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { ...prev, repeat: nextMode };
    });
  }, []);

  // プレイリストに動画追加
  const addVideo = useCallback((video: VideoInfo) => {
    setPlaylist(prev => ({
      ...prev,
      videos: [...prev.videos, video],
    }));
  }, []);

  // プレイリストから動画削除
  const removeVideo = useCallback((index: number) => {
    setPlaylist(prev => {
      const newVideos = prev.videos.filter((_, i) => i !== index);
      const newIndex = index <= prev.currentIndex
        ? Math.max(0, prev.currentIndex - 1)
        : prev.currentIndex;

      return {
        ...prev,
        videos: newVideos,
        currentIndex: newIndex,
      };
    });
  }, []);

  return {
    playlist,
    currentVideo,
    next,
    previous,
    selectVideo,
    toggleShuffle,
    cycleRepeat,
    addVideo,
    removeVideo,
    hasNext: playlist.currentIndex < playlist.videos.length - 1 || playlist.repeat === 'all',
    hasPrevious: playlist.currentIndex > 0 || playlist.repeat === 'all',
  };
};
```

### 7.2 プレイリストパネルUI

```typescript
const PlaylistPanel: React.FC<{
  playlist: Playlist;
  currentIndex: number;
  onVideoSelect: (index: number) => void;
  onVideoRemove: (index: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({
  playlist,
  currentIndex,
  onVideoSelect,
  onVideoRemove,
  onShuffle,
  onRepeat,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const getRepeatIcon = () => {
    switch (playlist.repeat) {
      case 'one': return <Repeat1Icon size={20} />;
      case 'all': return <RepeatIcon size={20} />;
      default: return <RepeatIcon size={20} className="inactive" />;
    }
  };

  return (
    <div className="playlist-panel">
      <div className="panel-header">
        <h3>プレイリスト ({playlist.videos.length}件)</h3>
        <div className="header-controls">
          <button
            className={`control-button ${playlist.shuffle ? 'active' : ''}`}
            onClick={onShuffle}
            title="シャッフル"
          >
            <ShuffleIcon size={20} />
          </button>
          <button
            className={`control-button ${playlist.repeat !== 'none' ? 'active' : ''}`}
            onClick={onRepeat}
            title="リピート"
          >
            {getRepeatIcon()}
          </button>
          <button onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>
      </div>

      <div className="playlist-items">
        {playlist.videos.map((video, index) => (
          <PlaylistItem
            key={video.path}
            video={video}
            index={index}
            isPlaying={index === currentIndex}
            onSelect={() => onVideoSelect(index)}
            onRemove={() => onVideoRemove(index)}
          />
        ))}
      </div>
    </div>
  );
};

const PlaylistItem: React.FC<{
  video: VideoInfo;
  index: number;
  isPlaying: boolean;
  onSelect: () => void;
  onRemove: () => void;
}> = ({ video, index, isPlaying, onSelect, onRemove }) => {
  return (
    <div
      className={`playlist-item ${isPlaying ? 'playing' : ''}`}
      onClick={onSelect}
    >
      <div className="item-thumbnail">
        {video.thumbnailPath ? (
          <img src={`file://${video.thumbnailPath}`} alt={video.name} />
        ) : (
          <div className="thumbnail-placeholder">
            <VideoIcon size={32} />
          </div>
        )}
        {isPlaying && (
          <div className="playing-indicator">
            <PlayIcon size={16} />
          </div>
        )}
      </div>

      <div className="item-info">
        <div className="item-title">{video.name}</div>
        <div className="item-meta">
          <span>{formatTime(video.duration)}</span>
          <span className="separator">•</span>
          <span>{video.width}x{video.height}</span>
        </div>
      </div>

      <button
        className="item-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="削除"
      >
        <TrashIcon size={16} />
      </button>
    </div>
  );
};
```

---

## 高度な機能・キーボード操作・統合

---

## 9. 高度な機能

### 9.1 スナップショット機能

```typescript
const useSnapshot = (videoRef: RefObject<HTMLVideoElement>) => {
  const takeSnapshot = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 現在のフレームを描画
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // PNG として保存
      const dataUrl = canvas.toDataURL('image/png');

      // メインプロセスで保存
      const timestamp = Date.now();
      const filename = `snapshot_${timestamp}.png`;
      const savePath = await window.electronAPI.saveSnapshot(dataUrl, filename);

      return savePath;

    } catch (error) {
      console.error('Failed to take snapshot:', error);
      return null;
    }
  }, [videoRef]);

  return { takeSnapshot };
};
```

**メインプロセス:**

```typescript
// main/ipc/handlers.ts
ipcMain.handle('save-snapshot', async (event, dataUrl: string, filename: string) => {
  const picturesPath = app.getPath('pictures');
  const snapshotsDir = path.join(picturesPath, 'GentleViewer', 'Snapshots');

  await fs.promises.mkdir(snapshotsDir, { recursive: true });

  const savePath = path.join(snapshotsDir, filename);

  // Data URLをバッファに変換
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  await fs.promises.writeFile(savePath, buffer);

  return savePath;
});
```

### 9.2 チャプター機能

```typescript
interface Chapter {
  id: string;
  time: number;      // 秒
  title: string;
  description?: string;
}

const useChapters = (fileId: number) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // チャプター読み込み
  useEffect(() => {
    const loadChapters = async () => {
      const saved = await window.electronAPI.getChapters(fileId);
      setChapters(saved || []);
    };
    loadChapters();
  }, [fileId]);

  // チャプター追加
  const addChapter = useCallback(async (time: number, title: string) => {
    const newChapter: Chapter = {
      id: generateId(),
      time,
      title,
    };

    const updated = [...chapters, newChapter].sort((a, b) => a.time - b.time);
    setChapters(updated);

    await window.electronAPI.saveChapters(fileId, updated);
  }, [fileId, chapters]);

  // チャプター削除
  const removeChapter = useCallback(async (chapterId: string) => {
    const updated = chapters.filter(c => c.id !== chapterId);
    setChapters(updated);

    await window.electronAPI.saveChapters(fileId, updated);
  }, [fileId, chapters]);

  // チャプター編集
  const updateChapter = useCallback(async (
    chapterId: string,
    updates: Partial<Chapter>
  ) => {
    const updated = chapters.map(c =>
      c.id === chapterId ? { ...c, ...updates } : c
    );
    setChapters(updated);

    await window.electronAPI.saveChapters(fileId, updated);
  }, [fileId, chapters]);

  return {
    chapters,
    addChapter,
    removeChapter,
    updateChapter,
  };
};
```

**チャプターリスト表示:**

```typescript
const ChapterList: React.FC<{
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
  onEdit: (chapter: Chapter) => void;
  onDelete: (chapterId: string) => void;
}> = ({ chapters, currentTime, onSeek, onEdit, onDelete }) => {
  return (
    <div className="chapter-list">
      <div className="chapter-list-header">
        <h4>チャプター ({chapters.length})</h4>
      </div>

      <div className="chapter-items">
        {chapters.map(chapter => {
          const isActive =
            currentTime >= chapter.time &&
            (chapters[chapters.indexOf(chapter) + 1]?.time > currentTime ||
             !chapters[chapters.indexOf(chapter) + 1]);

          return (
            <div
              key={chapter.id}
              className={`chapter-item ${isActive ? 'active' : ''}`}
              onClick={() => onSeek(chapter.time)}
            >
              <div className="chapter-time">
                {formatTime(chapter.time)}
              </div>
              <div className="chapter-title">
                {chapter.title}
              </div>
              <div className="chapter-actions">
                <button onClick={(e) => {
                  e.stopPropagation();
                  onEdit(chapter);
                }}>
                  <EditIcon size={16} />
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chapter.id);
                }}>
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### 9.3 ピクチャーインピクチャー

```typescript
const usePictureInPicture = (videoRef: RefObject<HTMLVideoElement>) => {
  const [isPiP, setIsPiP] = useState(false);

  const enterPiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    try {
      await video.requestPictureInPicture();
      setIsPiP(true);
    } catch (error) {
      console.error('Failed to enter PiP:', error);
    }
  }, [videoRef]);

  const exitPiP = useCallback(async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPiP(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);

  return { isPiP, enterPiP, exitPiP };
};
```

### 9.4 A-Bリピート

```typescript
interface ABRepeat {
  pointA: number | null;
  pointB: number | null;
}

const useABRepeat = (
  videoRef: RefObject<HTMLVideoElement>,
  currentTime: number
) => {
  const [abRepeat, setABRepeat] = useState<ABRepeat>({
    pointA: null,
    pointB: null,
  });

  // A地点設定
  const setPointA = useCallback(() => {
    setABRepeat({ pointA: currentTime, pointB: null });
  }, [currentTime]);

  // B地点設定
  const setPointB = useCallback(() => {
    if (abRepeat.pointA === null) return;

    if (currentTime > abRepeat.pointA) {
      setABRepeat(prev => ({ ...prev, pointB: currentTime }));
    }
  }, [currentTime, abRepeat.pointA]);

  // クリア
  const clearABRepeat = useCallback(() => {
    setABRepeat({ pointA: null, pointB: null });
  }, []);

  // リピート処理
  useEffect(() => {
    const video = videoRef.current;
    if (!video || abRepeat.pointA === null || abRepeat.pointB === null) return;

    if (currentTime >= abRepeat.pointB) {
      video.currentTime = abRepeat.pointA;
    }
  }, [currentTime, abRepeat, videoRef]);

  return {
    abRepeat,
    setPointA,
    setPointB,
    clearABRepeat,
  };
};
```

---

## 10. キーボード・マウス操作

### 10.1 キーボードショートカット

```typescript
const useVideoKeyboard = (
  videoRef: RefObject<HTMLVideoElement>,
  actions: VideoActions
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        // 再生/一時停止
        case ' ':
        case 'k':
          e.preventDefault();
          actions.togglePlay();
          break;

        // シーク
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            actions.seek(video.currentTime - 10); // 10秒戻る
          } else {
            actions.seek(video.currentTime - 5);  // 5秒戻る
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            actions.seek(video.currentTime + 10); // 10秒進む
          } else {
            actions.seek(video.currentTime + 5);  // 5秒進む
          }
          break;

        case 'j':
          e.preventDefault();
          actions.seek(video.currentTime - 10);
          break;

        case 'l':
          e.preventDefault();
          actions.seek(video.currentTime + 10);
          break;

        case 'Home':
          e.preventDefault();
          actions.seek(0);
          break;

        case 'End':
          e.preventDefault();
          actions.seek(video.duration);
          break;

        // 音量
        case 'ArrowUp':
          e.preventDefault();
          actions.changeVolume(Math.min(video.volume + 0.05, 1));
          break;

        case 'ArrowDown':
          e.preventDefault();
          actions.changeVolume(Math.max(video.volume - 0.05, 0));
          break;

        case 'm':
          e.preventDefault();
          actions.toggleMute();
          break;

        // 再生速度
        case '<':
        case ',':
          e.preventDefault();
          actions.changePlaybackRate(Math.max(video.playbackRate - 0.25, 0.25));
          break;

        case '>':
        case '.':
          e.preventDefault();
          actions.changePlaybackRate(Math.min(video.playbackRate + 0.25, 2.0));
          break;

        case '0':
          e.preventDefault();
          actions.changePlaybackRate(1.0);
          break;

        // プレイリスト
        case 'n':
        case 'N':
          e.preventDefault();
          actions.nextVideo();
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          actions.previousVideo();
          break;

        // 全画面
        case 'f':
        case 'F11':
          e.preventDefault();
          actions.toggleFullscreen();
          break;

        // ピクチャーインピクチャー
        case 'i':
          e.preventDefault();
          actions.togglePiP();
          break;

        // 字幕
        case 'c':
          e.preventDefault();
          actions.toggleSubtitles();
          break;

        // スナップショット
        case 's':
          e.preventDefault();
          actions.takeSnapshot();
          break;

        // チャプター
        case 'b':
          e.preventDefault();
          actions.addChapterMark();
          break;

        // A-Bリピート
        case 'a':
          e.preventDefault();
          actions.setPointA();
          break;

        case 'Shift + A':
          if (e.shiftKey && e.key === 'A') {
            e.preventDefault();
            actions.setPointB();
          }
          break;

        // プレイリストパネル
        case 'l':
          if (e.ctrlKey) {
            e.preventDefault();
            actions.togglePlaylist();
          }
          break;

        // 設定
        case ',':
          if (e.ctrlKey) {
            e.preventDefault();
            actions.openSettings();
          }
          break;

        // 閉じる
        case 'Escape':
          if (actions.isFullscreen) {
            actions.exitFullscreen();
          } else {
            actions.closeViewer();
          }
          break;

        case 'q':
          e.preventDefault();
          actions.closeViewer();
          break;

        // 数字キー: 特定位置へシーク
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          actions.seek((video.duration * percent) / 100);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoRef, actions]);
};
```

### 10.2 マウス操作

```typescript
const useVideoMouse = (
  containerRef: RefObject<HTMLDivElement>,
  videoRef: RefObject<HTMLVideoElement>,
  actions: VideoActions
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // クリックで再生/一時停止
    const handleClick = (e: MouseEvent) => {
      // コントロールバー上でのクリックは無視
      if ((e.target as HTMLElement).closest('.controls-bar')) {
        return;
      }

      actions.togglePlay();
    };

    // ダブルクリックで全画面切替
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      actions.toggleFullscreen();
    };

    // 右クリックでコンテキストメニュー
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      actions.showContextMenu(e.clientX, e.clientY);
    };

    // ホイールで音量調整
    const handleWheel = (e: WheelEvent) => {
      const video = videoRef.current;
      if (!video) return;

      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      actions.changeVolume(Math.max(0, Math.min(1, video.volume + delta)));
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('dblclick', handleDoubleClick);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('dblclick', handleDoubleClick);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, videoRef, actions]);
};
```

---

## 11. コンテキストメニュー

```typescript
const VideoContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
  actions: VideoActions;
  currentTime: number;
}> = ({ x, y, onClose, actions, currentTime }) => {
  const menuItems = [
    {
      label: '再生/一時停止',
      icon: <PlayIcon />,
      onClick: actions.togglePlay,
      shortcut: 'Space',
    },
    { separator: true },
    {
      label: '10秒戻る',
      icon: <Rewind10Icon />,
      onClick: () => actions.seek(currentTime - 10),
      shortcut: 'J',
    },
    {
      label: '10秒進む',
      icon: <Forward10Icon />,
      onClick: () => actions.seek(currentTime + 10),
      shortcut: 'L',
    },
    { separator: true },
    {
      label: '再生速度',
      icon: <SpeedIcon />,
      submenu: [
        { label: '0.25x', onClick: () => actions.changePlaybackRate(0.25) },
        { label: '0.5x', onClick: () => actions.changePlaybackRate(0.5) },
        { label: '0.75x', onClick: () => actions.changePlaybackRate(0.75) },
        { label: '1.0x (標準)', onClick: () => actions.changePlaybackRate(1.0) },
        { label: '1.25x', onClick: () => actions.changePlaybackRate(1.25) },
        { label: '1.5x', onClick: () => actions.changePlaybackRate(1.5) },
        { label: '2.0x', onClick: () => actions.changePlaybackRate(2.0) },
      ],
    },
    {
      label: '字幕',
      icon: <SubtitlesIcon />,
      onClick: actions.toggleSubtitles,
      shortcut: 'C',
    },
    { separator: true },
    {
      label: 'スナップショット',
      icon: <CameraIcon />,
      onClick: actions.takeSnapshot,
      shortcut: 'S',
    },
    {
      label: 'チャプターマーク追加',
      icon: <BookmarkIcon />,
      onClick: actions.addChapterMark,
      shortcut: 'B',
    },
    { separator: true },
    {
      label: 'A-Bリピート',
      icon: <RepeatIcon />,
      submenu: [
        { label: 'A地点を設定', onClick: actions.setPointA, shortcut: 'A' },
        { label: 'B地点を設定', onClick: actions.setPointB, shortcut: 'Shift+A' },
        { label: 'クリア', onClick: actions.clearABRepeat },
      ],
    },
    { separator: true },
    {
      label: 'ピクチャーインピクチャー',
      icon: <PipIcon />,
      onClick: actions.togglePiP,
      shortcut: 'I',
    },
    {
      label: '全画面',
      icon: <FullscreenIcon />,
      onClick: actions.toggleFullscreen,
      shortcut: 'F',
    },
    { separator: true },
    {
      label: 'エクスプローラーで表示',
      icon: <FolderIcon />,
      onClick: actions.showInExplorer,
    },
    {
      label: '設定',
      icon: <SettingsIcon />,
      onClick: actions.openSettings,
      shortcut: 'Ctrl+,',
    },
    { separator: true },
    {
      label: 'ビューワーを閉じる',
      icon: <CloseIcon />,
      onClick: actions.closeViewer,
      shortcut: 'Q',
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

## 12. 設定パネル

```typescript
interface VideoViewerSettings {
  // 再生
  autoPlay: boolean;
  defaultVolume: number;
  defaultPlaybackRate: number;
  rememberPosition: boolean;

  // 字幕
  defaultSubtitleLanguage: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBackgroundColor: string;
  subtitleOutline: boolean;

  // UI
  autoHideControls: boolean;
  autoHideDelay: number;
  showThumbnailPreview: boolean;

  // プレイリスト
  autoPlayNext: boolean;
  defaultRepeatMode: 'none' | 'one' | 'all';

  // パフォーマンス
  hardwareAcceleration: boolean;
  preloadAmount: number; // 秒
}

const DEFAULT_VIDEO_SETTINGS: VideoViewerSettings = {
  autoPlay: false,
  defaultVolume: 1.0,
  defaultPlaybackRate: 1.0,
  rememberPosition: true,
  defaultSubtitleLanguage: 'ja',
  subtitleFontSize: 24,
  subtitleColor: '#ffffff',
  subtitleBackgroundColor: 'rgba(0, 0, 0, 0.7)',
  subtitleOutline: true,
  autoHideControls: true,
  autoHideDelay: 3000,
  showThumbnailPreview: true,
  autoPlayNext: true,
  defaultRepeatMode: 'none',
  hardwareAcceleration: true,
  preloadAmount: 30,
};
```

---

## 13. 統合コンポーネント

### 13.1 メインビューワーコンポーネント

```typescript
const VideoViewer: React.FC<{
  videos: VideoInfo[];
  initialIndex?: number;
  onClose: () => void;
}> = ({ videos, initialIndex = 0, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // プレイリスト
  const {
    playlist,
    currentVideo,
    hasPrevious,
    hasNext,
    next,
    previous,
    goTo,
    toggleShuffle,
    toggleRepeat,
  } = usePlaylist(videos);

  // 動画情報
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 再生状態
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);

  // UI状態
  const [showControls, setShowControls] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 設定
  const [settings, setSettings] = useState<VideoViewerSettings>(DEFAULT_VIDEO_SETTINGS);

  // 字幕
  const {
    subtitles,
    activeCues,
    activeSubtitle,
    setActiveSubtitle,
  } = useSubtitles(currentVideo);

  // 視聴履歴
  const { history, saveHistory, autoSave } = useWatchHistory(
    currentVideo.id,
    duration
  );

  // チャプター
  const {
    chapters,
    addChapter,
    removeChapter,
    updateChapter,
  } = useChapters(currentVideo.id);

  // スナップショット
  const { takeSnapshot } = useSnapshot(videoRef);

  // ピクチャーインピクチャー
  const { isPiP, enterPiP, exitPiP } = usePictureInPicture(videoRef);

  // A-Bリピート
  const {
    abRepeat,
    setPointA,
    setPointB,
    clearABRepeat,
  } = useABRepeat(videoRef, currentTime);

  // 動画読み込み
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const result = await loadVideo(currentVideo.path);

      if (result.success && result.video) {
        setVideoInfo(result.video);
      } else {
        setError(result.error || '動画の読み込みに失敗しました');
      }

      setLoading(false);
    };

    init();
  }, [currentVideo]);

  // 視聴履歴の自動保存
  useEffect(() => {
    if (settings.rememberPosition && currentTime > 0) {
      autoSave(currentTime);
    }
  }, [currentTime, settings.rememberPosition, autoSave]);

  // 動画終了時の処理
  const handleVideoEnded = useCallback(() => {
    if (playlist.repeat === 'one') {
      videoRef.current?.play();
    } else if (settings.autoPlayNext && hasNext) {
      next();
    } else {
      setIsPlaying(false);
    }
  }, [playlist.repeat, settings.autoPlayNext, hasNext, next]);

  // ビューワーアクション
  const actions: VideoActions = {
    togglePlay: () => {
      const video = videoRef.current;
      if (!video) return;

      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    },

    seek: (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(0, Math.min(time, duration));
    },

    changeVolume: (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = Math.max(0, Math.min(1, newVolume));
      setVolume(newVolume);
    },

    toggleMute: () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !muted;
      setMuted(!muted);
    },

    changePlaybackRate: (rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      setPlaybackRate(rate);
    },

    nextVideo: next,
    previousVideo: previous,

    toggleFullscreen: () => {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
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

    toggleSubtitles: () => {
      if (activeSubtitle !== null) {
        setActiveSubtitle(null);
      } else if (subtitles.size > 0) {
        setActiveSubtitle(Array.from(subtitles.keys())[0]);
      }
    },

    takeSnapshot: async () => {
      const path = await takeSnapshot();
      if (path) {
        // 成功通知
        showNotification({
          type: 'success',
          message: `スナップショットを保存しました: ${path}`,
        });
      }
    },

    addChapterMark: () => {
      const title = prompt('チャプター名を入力してください');
      if (title) {
        addChapter(currentTime, title);
      }
    },

    setPointA: () => setPointA(),
    setPointB: () => setPointB(),
    clearABRepeat: () => clearABRepeat(),

    togglePiP: () => {
      if (isPiP) {
        exitPiP();
      } else {
        enterPiP();
      }
    },

    togglePlaylist: () => setShowPlaylist(!showPlaylist),
    openSettings: () => setShowSettings(true),

    showContextMenu: (x: number, y: number) => {
      setContextMenu({ x, y });
    },

    showInExplorer: () => {
      window.electronAPI.showInExplorer(currentVideo.path);
    },

    closeViewer: () => {
      saveHistory(currentTime);
      onClose();
    },

    isFullscreen,
  };

  // キーボード・マウス操作
  useVideoKeyboard(videoRef, actions);
  useVideoMouse(containerRef, videoRef, actions);

  // コントロールバーの自動非表示
  const { visible: controlsVisible } = useAutoHide({
    enabled: settings.autoHideControls && !isPiP,
    delay: settings.autoHideDelay,
  });

  // ローディング
  if (loading) {
    return (
      <div className="viewer-loading">
        <Spinner size={64} />
        <p>動画を読み込んでいます...</p>
      </div>
    );
  }

  // エラー
  if (error || !videoInfo) {
    return (
      <div className="viewer-error">
        <AlertTriangleIcon size={64} />
        <h3>エラーが発生しました</h3>
        <p>{error}</p>
        <button onClick={onClose}>閉じる</button>
      </div>
    );
  }

  // 視聴履歴復帰
  const [showHistoryResume, setShowHistoryResume] = useState(
    !!history && history.lastPosition > 30 && !history.completed
  );

  return (
    <div
      className="video-viewer"
      ref={containerRef}
      data-fullscreen={isFullscreen}
    >
      {/* ヘッダー */}
      {!isFullscreen && (
        <ViewerHeader
          visible={controlsVisible}
          videoInfo={videoInfo}
          playlistPosition={`${playlist.currentIndex + 1}/${playlist.videos.length}`}
          onPrevious={hasPrevious ? previous : undefined}
          onNext={hasNext ? next : undefined}
          onTogglePlaylist={() => setShowPlaylist(!showPlaylist)}
          onOpenSettings={() => setShowSettings(true)}
          onClose={onClose}
        />
      )}

      {/* 動画プレイヤー */}
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          src={`file://${videoInfo.path}`}
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onProgress={(e) => setBuffered(e.currentTarget.buffered)}
          onEnded={handleVideoEnded}
        />

        {/* 字幕表示 */}
        {activeCues && (
          <SubtitleDisplay
            cues={activeCues}
            currentTime={currentTime}
            style={{
              fontSize: settings.subtitleFontSize,
              color: settings.subtitleColor,
              backgroundColor: settings.subtitleBackgroundColor,
              fontFamily: 'sans-serif',
              outline: settings.subtitleOutline,
            }}
          />
        )}

        {/* A-Bリピート表示 */}
        {(abRepeat.pointA !== null || abRepeat.pointB !== null) && (
          <div className="ab-repeat-indicator">
            A: {abRepeat.pointA !== null ? formatTime(abRepeat.pointA) : '--:--'}
            {' | '}
            B: {abRepeat.pointB !== null ? formatTime(abRepeat.pointB) : '--:--'}
          </div>
        )}
      </div>

      {/* コントロールバー */}
      <ControlsBar
        visible={controlsVisible && !isPiP}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        chapters={chapters}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPlayPause={actions.togglePlay}
        onPrevious={previous}
        onNext={next}
        onSeek={actions.seek}
        onVolumeChange={actions.changeVolume}
        onMuteToggle={actions.toggleMute}
        onPlaybackRateChange={actions.changePlaybackRate}
        onToggleFullscreen={actions.toggleFullscreen}
        onTakeSnapshot={actions.takeSnapshot}
        onAddChapter={actions.addChapterMark}
      />

      {/* プレイリストパネル */}
      <PlaylistPanel
        playlist={playlist}
        onSelect={goTo}
        onClose={() => setShowPlaylist(false)}
        isOpen={showPlaylist}
      />

      {/* 設定パネル */}
      {showSettings && (
        <VideoSettingsPanel
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
        <VideoContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={actions}
          currentTime={currentTime}
        />
      )}

      {/* 視聴履歴復帰 */}
      {showHistoryResume && history && (
        <WatchHistoryResume
          history={history}
          onResume={() => {
            actions.seek(history.lastPosition);
            setShowHistoryResume(false);
          }}
          onStartOver={() => {
            actions.seek(0);
            setShowHistoryResume(false);
          }}
        />
      )}
    </div>
  );
};

export default VideoViewer;
```

---

## 14. 型定義まとめ

```typescript
// types.ts
export interface VideoActions {
  togglePlay: () => void;
  seek: (time: number) => void;
  changeVolume: (volume: number) => void;
  toggleMute: () => void;
  changePlaybackRate: (rate: number) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  toggleSubtitles: () => void;
  takeSnapshot: () => Promise<void>;
  addChapterMark: () => void;
  setPointA: () => void;
  setPointB: () => void;
  clearABRepeat: () => void;
  togglePiP: () => void;
  togglePlaylist: () => void;
  openSettings: () => void;
  showContextMenu: (x: number, y: number) => void;
  showInExplorer: () => void;
  closeViewer: () => void;
  isFullscreen: boolean;
}
```

---
