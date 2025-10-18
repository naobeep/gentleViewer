# Gentle Viewer 要件定義書 v3.0

## 変更履歴

- v3.0 (2025-10-02): アーキテクチャ設計、セキュリティ、拡張性を大幅強化
- v2.0: 統合ビューワー機能追加
- v1.0: 初版

## プロジェクト名

**Gentle Viewer** - 全世界の紳士に捧げる
紳士的なファイルを、紳士的にタグ付けして、紳士的に閲覧する統合的ビューワー

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [アーキテクチャ設計](#2-アーキテクチャ設計)
3. [機能要件](#3-機能要件)
4. [統合ビューワー機能](#4-統合ビューワー機能)
5. [ファイル監視機能](#5-ファイル監視機能)
6. [データベース設計](#6-データベース設計)
7. [エラーハンドリング・ロギング](#7-エラーハンドリングロギング)
8. [パフォーマンス最適化](#8-パフォーマンス最適化)
9. [セキュリティ・プライバシー](#9-セキュリティプライバシー)
10. [アップデート機能](#10-アップデート機能)
11. [アクセシビリティ](#11-アクセシビリティ)
12. [国際化](#12-国際化phase-2)
13. [テスト戦略](#13-テスト戦略)
14. [ビルド・デプロイ](#14-ビルドデプロイ)
15. [ドキュメント](#15-ドキュメント)
16. [開発スケジュール](#16-開発スケジュール修正版)
17. [成功指標](#17-成功指標kpi)
18. [リスク管理](#18-リスク管理)
19. [参考アプリケーション](#19-参考アプリケーション)
20. [今後の展望](#20-今後の展望phase-3以降)
21. [付録A: プロジェクト構造](#21-付録aプロジェクト構造)
22. [付録B: 開発環境セットアップ](#22-付録b開発環境セットアップ)

---

## 1. プロジェクト概要

### 1.1 目的

デスクトップ環境でファイルやフォルダにタグを付与し、タグベースで効率的にファイルを管理・抽出できるツールを開発する。とくにアーカイブ化された画像フォルダ（漫画等）を解凍せずに閲覧できる機能と、タグで抽出したさまざまな形式のファイルを統合ビューワーで連続閲覧できる機能を提供する。

### 1.2 対象ユーザー

- 大量の画像アーカイブファイルを管理するWindowsデスクトップユーザー
- 漫画やイラスト集などの画像コレクションを整理したいユーザー
- 動画、PDF、音声など多様なメディアファイルを一元管理したいユーザー
- プロジェクトや用途別にファイルを整理したいユーザー
- 従来のフォルダ階層だけでは管理しきれないユーザー

### 1.3 対象環境

- **OS**: Windows 10/11 (64bit)
- **最小システム要件**:
  - RAM: 4GB以上（推奨: 8GB以上）
  - ストレージ: 500MB以上の空き容量
  - CPU: Intel Core i3相当以上
- **想定ファイル数**: 最大100,000件
- **想定アーカイブサイズ**: 1ファイルあたり最大2GB

### 1.4 コアコンセプト

「**タグで抽出して、形式を問わず連続閲覧**」

Gentle Viewerは、ファイル形式の違いを気にせず、タグで整理したコンテンツを快適に閲覧できる「やさしい」ビューワーです。

- タグで目的のファイル群を抽出
- ファイル形式に応じて最適なビューワーで表示
- 前/次ボタンで異なる形式のファイルもシームレスに閲覧

---

## 2. アーキテクチャ設計

### 2.1 技術スタック

#### 2.1.1 フレームワーク

- **Electron** v28以降 + React 18 + TypeScript 5.0
  - **メインプロセス**: Node.js環境、ファイルシステムアクセス、DBアクセス
  - **レンダラープロセス**: Chromium環境、UI表示、メディア再生
  - **プリロードスクリプト**: セキュアなIPC通信のブリッジ

#### 2.1.2 UI/スタイリング

- **Material-UI (MUI) v5**: コンポーネントライブラリ
- **Emotion**: CSS-in-JS
- **React Window**: 仮想スクロール実装

#### 2.1.3 状態管理

- **Zustand**: 軽量グローバル状態管理
- **React Query**: サーバー状態管理・キャッシング

#### 2.1.4 データベース

- **better-sqlite3**: SQLiteラッパー（同期API、高速）
- **kysely**: TypeScript対応クエリビルダー

#### 2.1.5 ファイル処理

- **JSZip**: ZIP展開（ストリーム処理対応）
- **chokidar**: ファイル監視
- **file-type**: ファイル形式判定（マジックバイト）
- **sharp**: サムネイル生成（高速）

#### 2.1.6 メディア処理

- **HTML5 Video/Audio API**: ネイティブ再生
- **PDF.js**: PDF描画
- **fluent-ffmpeg**: 動画メタデータ取得

#### 2.1.7 その他

- **electron-log**: ログ管理
- **electron-updater**: 自動アップデート
- **Sentry**: エラートラッキング（オプション）

### 2.2 プロセス構成

#### 2.2.1 メインプロセス（Node.js環境）

**役割:**

- アプリケーションライフサイクル管理
- ウィンドウ管理
- データベース操作
- ファイルシステムアクセス
- ファイル監視
- 自動アップデート

**主要モジュール:**

```txt
main/
├── index.ts              # エントリーポイント
├── database/
│   ├── connection.ts     # DB接続管理
│   ├── migrations/       # スキーママイグレーション
│   └── repositories/     # データアクセス層
├── file-system/
│   ├── scanner.ts        # ファイルスキャン
│   ├── watcher.ts        # ファイル監視
│   └── analyzer.ts       # ファイル解析
├── ipc/
│   └── handlers.ts       # IPCハンドラー
└── services/
    ├── cache.ts          # キャッシュ管理
    └── thumbnail.ts      # サムネイル生成
```

#### 2.2.2 レンダラープロセス（Chromium環境）

**役割:**

- UI描画
- ユーザー入力処理
- メディア再生
- アーカイブビューワー
- 検索・フィルタリングUI

**主要コンポーネント:**

```txt
renderer/
├── App.tsx
├── pages/
│   ├── MainPage.tsx      # ファイル一覧
│   └── ViewerPage.tsx    # 統合ビューワー
├── components/
│   ├── FileList/
│   ├── TagManager/
│   ├── SearchBar/
│   └── Viewers/
│       ├── ArchiveViewer/
│       ├── VideoViewer/
│       ├── PDFViewer/
│       ├── ImageViewer/
│       └── AudioPlayer/
├── stores/               # Zustand stores
└── hooks/                # カスタムフック
```

#### 2.2.3 プリロードスクリプト

**役割:**

- レンダラーとメインプロセス間の安全な通信ブリッジ
- `contextBridge`によるAPIの公開

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ファイル操作
  scanFiles: (paths: string[]) => ipcRenderer.invoke('scan-files', paths),
  readArchive: (path: string) => ipcRenderer.invoke('read-archive', path),

  // データベース操作
  getTags: () => ipcRenderer.invoke('get-tags'),
  searchFiles: (query: SearchQuery) => ipcRenderer.invoke('search-files', query),

  // ファイル監視
  onFileChanged: (callback: (event: FileChangeEvent) => void) => {
    ipcRenderer.on('file-changed', (_, event) => callback(event));
  }
});
```

### 2.3 セキュリティ設計

#### 2.3.1 Electronセキュリティ設定

```typescript
// BrowserWindow設定
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // Node.js APIを無効化
    contextIsolation: true,           // コンテキスト分離
    sandbox: true,                    // サンドボックス有効化
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,
    allowRunningInsecureContent: false
  }
});
```

#### 2.3.2 Content Security Policy

```typescript
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "connect-src 'self'"
      ].join('; ')
    }
  });
});
```

#### 2.3.3 データ保護

- **データベース暗号化**: SQLCipher検討（機密性の高いタグ情報向け）
- **ログファイル**: 個人情報のマスキング
- **キャッシュファイル**: 一時ディレクトリへの安全な保存

### 2.4 データストレージ構成

#### 2.4.1 配置場所

```txt
%APPDATA%/GentleViewer/
├── config/
│   └── settings.json         # アプリ設定
├── database/
│   ├── main.db              # メインDB
│   └── backups/             # 自動バックアップ
├── cache/
│   ├── thumbnails/          # サムネイルキャッシュ
│   └── archives/            # アーカイブ展開キャッシュ
└── logs/
    └── app.log              # アプリログ
```

#### 2.4.2 キャッシュ戦略

**サムネイルキャッシュ:**

- **保存先**: ディスク (`%APPDATA%/cache/thumbnails/`)
- **サイズ上限**: 1GB
- **ファイル名**: `${fileId}_${mtime}.jpg` (変更検知用）
- **破棄戦略**: LRU（最長未使用）
- **フォーマット**: JPEG 200x300px

**アーカイブ展開キャッシュ:**

- **保存先**: ディスク (`%APPDATA%/cache/archives/`)
- **サイズ上限**: 2GB
- **ファイル名**: `${fileId}_${pageNumber}.jpg`
- **破棄戦略**: ビューワー終了時にクリーンアップ
- **プリロード**: 現在ページの前後3ページ

**メモリキャッシュ:**

- **React Query**: 検索結果・タグ一覧（5分間）
- **画像プリロード**: 最大50MB

---

## 3. 機能要件

### 3.1 ファイル・フォルダ登録

#### 3.1.1 基本登録機能

- **ドラッグ&ドロップ登録**
  - メインウィンドウへのファイル/フォルダドロップ
  - 複数選択対応
- **ファイル選択ダイアログ**
  - 複数ファイル選択
  - フォルダ選択
- **フォルダ再帰スキャン**
  - サブフォルダを含む全ファイル登録
  - 進捗表示（現在のファイル数/推定残り時間）
  - キャンセル機能

#### 3.1.2 スキャン設定

**拡張子フィルター:**

```json
{
  "archive": [".zip"],
  "video": [".mp4", ".webm", ".ogv", ".mkv", ".avi"],
  "pdf": [".pdf"],
  "image": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"],
  "audio": [".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac"]
}
```

**除外設定:**

- 除外フォルダ: `node_modules`, `.git`, `$RECYCLE.BIN`, `System Volume Information`
- 除外パターン: `.*` （隠しファイル）
- 最小ファイルサイズ: 1KB（設定可能）

#### 3.1.3 ファイル解析

**基本情報:**

- ファイルパス、名前、拡張子、サイズ、作成日時、更新日時

**形式固有情報:**

**ZIPアーカイブ:**

- 内包画像数（.jpg, .png, .webp, .gif のみカウント）
- 最初の画像（サムネイル用）
- 総サイズ
- 暗号化の有無

**動画ファイル:**

- デュレーション（秒）
- 解像度（幅x高さ）
- コーデック情報
- ビットレート
- フレームレート

**音声ファイル:**

- デュレーション（秒）
- ビットレート
- サンプリングレート
- アルバムアート（あれば抽出）

**PDFファイル:**

- ページ数
- 作成者、タイトル（メタデータ）
- 最初のページ（サムネイル用）

**画像ファイル:**

- 解像度（幅x高さ）
- カラースペース
- EXIF情報（撮影日時、カメラ情報等）

#### 3.1.4 ファイル形式判定

**判定フロー:**

1. **拡張子チェック**: 初期判定
2. **マジックバイト検証**: ファイルヘッダーから実際の形式を判定
3. **コーデック検証**: 動画/音声の再生可能性チェック

**マジックバイト例:**

```typescript
const MAGIC_BYTES = {
  ZIP: [0x50, 0x4B, 0x03, 0x04],
  PDF: [0x25, 0x50, 0x44, 0x46],
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47],
  MP4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]
};
```

**非対応形式の処理:**

- 警告表示: 「このファイルは再生できない可能性があります」
- 外部アプリ起動オプション提供
- ログに記録

#### 3.1.5 重複チェック

- **判定基準**: 絶対パス
- **動作**: すでに登録済みの場合はスキップ（メタデータは更新）
- **通知**: 重複ファイル数を表示

#### 3.1.6 バックグラウンド処理

- **Web Worker**: ファイル解析処理
- **IPC非同期通信**: UIブロックなし
- **進捗通知**: 10ファイルごとに進捗更新

### 3.2 タグ管理

#### 3.2.1 タグ作成・編集

- タグ名入力（最大50文字）
- カラーピッカーによる色選択（16色パレット + カスタム）
- 説明文入力（最大200文字、オプション）
- アイコン選択（絵文字、オプション）

#### 3.2.2 タグ階層化

**親子関係:**

- 親タグ選択（ドロップダウン）
- 最大階層: 3レベル
- 循環参照防止: リアルタイムバリデーション

**親タグ削除時の動作:**

- **デフォルト**: 子タグを親なし（ルートレベル）に移動
- **オプション**: 子タグも一緒に削除（確認ダイアログ）

**階層的検索:**

- 親タグで検索 → 子タグが付いたファイルも含む
- 設定で無効化可能

#### 3.2.3 タグ検索機能

**部分一致検索:**

- インクリメンタルサーチ
- FTS5による高速全文検索
- ひらがな・カタカナの自動正規化
- 検索候補の即座表示（最大20件）

**検索例:**

```txt
入力: "いらす"
候補: イラスト, イラスト集, 背景イラスト
```

#### 3.2.4 タグ管理機能

- **お気に入り登録**: よく使うタグをピン留め
- **使用頻度表示**: タグ名の横に使用ファイル数
- **未使用タグの検出**: 0件のタグをハイライト
- **タグマージ**: 2つのタグを統合
- **一括リネーム**: 正規表現による一括変更

### 3.3 タグ付与

#### 3.3.1 単体ファイルへのタグ付与

- タグ選択ダイアログ
- インクリメンタルサーチ
- 複数タグ選択（チェックボックス）
- 新規タグの即座作成

#### 3.3.2 一括タグ付与

- 複数ファイル選択（Ctrl/Shift + クリック）
- タグ一括追加/削除
- プレビュー機能（影響するファイル数表示）

#### 3.3.3 ドラッグ&ドロップタグ付与

- ファイルをタグにドロップ
- タグをファイルにドロップ
- 複数同時ドロップ対応

#### 3.3.4 クイックタグ付与

**キーボードショートカット:**

- `1`~`9`: お気に入りタグ1~9を付与
- `Ctrl + T`: タグダイアログを開く
- `Ctrl + Shift + T`: 最近使ったタグを表示

#### 3.3.5 自動タグ付け（Phase 2）

**ルールベース:**

```json
{
  "rules": [
    {
      "condition": { "filename": "*.manga.*" },
      "tags": ["漫画"]
    },
    {
      "condition": { "folder": "**/イラスト/**" },
      "tags": ["イラスト"]
    },
    {
      "condition": { "extension": ".mp4", "duration": ">3600" },
      "tags": ["長編動画"]
    }
  ]
}
```

### 3.4 ファイル検索・抽出

#### 3.4.1 タグ検索

**検索モード:**

- **AND検索**: すべてのタグを含む
- **OR検索**: いずれかのタグを含む
- **NOT検索**: 特定のタグを除外
- **複合検索**: `(タグA AND タグB) OR (タグC NOT タグD)`

**検索UI:**

- タグチップ表示
- ドラッグで並び替え
- 演算子ボタン（AND/OR/NOT切替）

#### 3.4.2 詳細フィルター

**ファイル属性:**

- ファイル名（部分一致、正規表現）
- 作成日時範囲
- 更新日時範囲
- ファイルサイズ範囲

**ファイル形式:**

- アーカイブ/動画/PDF/画像/音声
- 拡張子（複数選択）

**形式固有フィルター:**

- アーカイブ: 画像枚数範囲（例: 20~50枚）
- 動画/音声: デュレーション範囲（例: 10分~30分）
- 画像: 解像度範囲（例: 1920x1080以上）
- PDF: ページ数範囲

#### 3.4.3 検索条件の保存

**スマート検索（保存済み検索）:**

- 検索条件に名前を付けて保存
- サイドバーにお気に入り表示
- ワンクリックで再検索
- 動的条件（例: 「過去7日間に追加」）

**エクスポート:**

- JSON形式で保存
- 他のユーザーと共有可能

### 3.5 検索結果表示

#### 3.5.1 表示モード

**リスト表示:**

- ファイル名、形式アイコン、サイズ、更新日時、タグ
- ソート: 名前/日付/サイズ/形式/画像枚数/長さ
- 仮想スクロール（10,000件でも高速）

**グリッド表示（サムネイル）:**

- サムネイル + ファイル名
- サムネイルサイズ: 小/中/大（スライダー）
- アーカイブ: 最初の画像
- 動画: 最初のフレーム
- PDF: 最初のページ
- 音声: アルバムアートまたはデフォルトアイコン

**詳細表示:**

- 選択したファイルの全情報を右パネルに表示
- タグ一覧、メタデータ、プレビュー

#### 3.5.2 ソート・グループ化

**ソート:**

- 昇順/降順切替
- 複数キーソート（第1キー、第2キー）

**グループ化:**

- ファイル形式別
- タグ別
- 日付別（年/月/日）
- フォルダ別

#### 3.5.3 クイックアクション

- ダブルクリック: ビューワーで開く
- 右クリック: コンテキストメニュー
  - ビューワーで開く
  - エクスプローラーで表示
  - ファイルパスをコピー
  - タグを編集
  - 外部アプリで開く
  - 削除（DBから登録解除）

---

## 4. 統合ビューワー機能

### 4.1 統合ビューワーの概念

**設計思想:**

- **ファイル形式透過**: ユーザーはファイル形式を意識せず連続閲覧
- **自動切替**: 拡張子とマジックバイトで形式判定 → 最適なビューワーを表示
- **統一ナビゲーション**: すべてのビューワーで共通の前/次ボタン

**ウィンドウ管理:**

- **単一ウィンドウモード**: メインウィンドウ内にビューワーを表示
- **別ウィンドウモード**: 独立したビューワーウィンドウ（デフォルト）
- **複数同時表示**: 設定で有効化（メモリ消費増加に注意）

### 4.2 対応ファイル形式一覧

| カテゴリ | 拡張子 | ビューワー | 備考 |
|---------|--------|-----------|------|
| アーカイブ | .zip | 画像アーカイブ | 漫画閲覧に最適 |
| 動画 | .mp4, .webm, .ogv, .mkv | 動画 | H.264/H.265/VP8/VP9 |
| PDF | .pdf | PDF | PDF.js使用 |
| 画像 | .jpg, .png, .webp, .gif, .svg, .bmp | 画像 | 単体表示 |
| 音声 | .mp3, .wav, .ogg, .aac, .m4a, .flac | 音声 | バックグラウンド再生 |

**Phase 2で追加予定:**

- アーカイブ: .rar, .7z, .cbz, .cbr
- 動画: .avi, .mov, .wmv
- 画像: .tiff, .ico
- テキスト: .txt, .md, .log
- コード: .js, .ts, .py, .html, .css

### 4.3 ビューワー共通UI

#### 4.3.1 ヘッダー

```txt
┌──────────────────────────────────────────────────────────────┐
│ [◀️] [▶️] 📚 manga_vol1.zip (3/15) [≡] [⚙️] [─] [□] [×]      │
└──────────────────────────────────────────────────────────────┘
```

**要素:**

- `[◀️]`: 前のファイル
- `[▶️]`: 次のファイル
- `📚`: ファイル形式アイコン
- ファイル名: 現在表示中のファイル
- `(3/15)`: 検索結果内の位置
- `[≡]`: ファイルリストパネル開閉
- `[⚙️]`: 設定メニュー
- `[─]`: 最小化
- `[□]`: 最大化
- `[×]`: 閉じる

#### 4.3.2 キーボードショートカット（共通）

| キー | 動作 |
|-----|------|
| `N` / `→` | 次のファイル |
| `P` / `←` | 前のファイル |
| `Home` | 最初のファイル |
| `End` | 最後のファイル |
| `F11` / `F` | フルスクリーン |
| `L` | ファイルリストパネル切替 |
| `Esc` | ビューワーを閉じる |
| `Ctrl + W` | ビューワーを閉じる |

---

## 5. ファイル監視機能

### 5.1 監視対象

- 登録済みファイルの実体
- 登録済みフォルダ内の変更

### 5.2 検知イベント

**ファイル変更:**

- 作成: 新規ファイル追加時に自動登録（設定で有効化）
- 更新: メタデータを再取得
- 削除: `is_available = 0` に設定、通知表示
- リネーム: パスを更新
- 移動: パスを更新

### 5.3 実装

```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch(watchedPaths, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

watcher
  .on('change', path => handleFileChange(path))
  .on('unlink', path => handleFileDelete(path))
  .on('add', path => handleFileAdd(path));
```

### 5.4 通知

**システム通知:**

- 「3件のファイルが削除されました」
- 「新しいファイルが5件追加されました」

**アクション:**

- クリックで該当ファイルリストを表示
- 削除されたファイルを一括解除

---

## 6. データベース設計

### 6.1 スキーマ定義

#### 6.1.1 files テーブル

```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,

    -- アーカイブ固有
    is_archive INTEGER DEFAULT 0,
    image_count INTEGER DEFAULT 0,
    first_image_path TEXT,
    is_encrypted INTEGER DEFAULT 0,

    -- メディア固有
    duration INTEGER,
    width INTEGER,
    height INTEGER,
    codec_video TEXT,
    codec_audio TEXT,
    bitrate INTEGER,
    framerate REAL,

    -- PDF固有
    page_count INTEGER,

    -- メタデータ
    title TEXT,
    artist TEXT,
    album TEXT,

    -- ファイル状態
    is_available INTEGER DEFAULT 1,
    last_checked TEXT,

    -- タイムスタンプ
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    registered_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_extension ON files(file_extension);
CREATE INDEX idx_files_available ON files(is_available);
CREATE INDEX idx_files_registered ON files(registered_at);
CREATE INDEX idx_files_size ON files(file_size);
CREATE INDEX idx_files_duration ON files(duration);
CREATE INDEX idx_files_image_count ON files(image_count);

-- 全文検索
CREATE VIRTUAL TABLE files_fts USING fts5(
    file_name,
    title,
    artist,
    content=files,
    content_rowid=id
);
```

#### 6.1.2 tags テーブル

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT DEFAULT '#1976d2',
    icon TEXT,
    parent_id INTEGER,
    description TEXT,
    is_favorite INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL,
    CHECK (parent_id != id)
);

-- インデックス
CREATE INDEX idx_tags_parent ON tags(parent_id);
CREATE INDEX idx_tags_favorite ON tags(is_favorite);

-- 全文検索
CREATE VIRTUAL TABLE tags_fts USING fts5(
    tag_name,
    description,
    content=tags,
    content_rowid=id,
    tokenize='unicode61 remove_diacritics 1'
);
```

#### 6.1.3 file_tags テーブル

```sql
CREATE TABLE file_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(file_id, tag_id)
);

-- インデックス
CREATE INDEX idx_file_tags_file ON file_tags(file_id);
CREATE INDEX idx_file_tags_tag ON file_tags(tag_id);
CREATE INDEX idx_file_tags_composite ON file_tags(tag_id, file_id);
```

#### 6.1.4 bookmarks テーブル

```sql
CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL UNIQUE,
    page_number INTEGER DEFAULT 0,
    time_position REAL DEFAULT 0,
    total_pages INTEGER,
    total_duration REAL,
    zoom_level REAL DEFAULT 1.0,
    view_mode TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

#### 6.1.5 viewer_settings テーブル

```sql
CREATE TABLE viewer_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,
    viewer_type TEXT NOT NULL,
    zoom_level REAL DEFAULT 1.0,
    fit_mode TEXT DEFAULT 'fit',
    view_mode TEXT DEFAULT 'spread',
    reading_direction TEXT DEFAULT 'rtl',
    preload_pages INTEGER DEFAULT 3,
    playback_speed REAL DEFAULT 1.0,
    volume REAL DEFAULT 1.0,
    muted INTEGER DEFAULT 0,
    auto_play INTEGER DEFAULT 0,
    scroll_mode TEXT DEFAULT 'vertical',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(file_id, viewer_type)
);
```

#### 6.1.6 saved_searches テーブル

```sql
CREATE TABLE saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    search_query TEXT NOT NULL,
    is_favorite INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.7 settings テーブル

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.1.8 schema_version テーブル

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema v3.0');
```

### 6.2 マイグレーション戦略

```typescript
// migrations/001_initial.ts
export const up = (db: Database) => {
  db.exec(`
    CREATE TABLE files (...);
    CREATE TABLE tags (...);
    -- ...
  `);
};

export const down = (db: Database) => {
  db.exec(`
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS tags;
  `);
};
```

---

## 7. エラーハンドリング・ロギング

### 7.1 エラー分類

#### 7.1.1 ファイルシステムエラー

- ファイルが見つからない（`ENOENT`）
- アクセス権限がない（`EACCES`）
- ディスクフル（`ENOSPC`）

**処理:**

- ユーザーに分かりやすいメッセージ表示
- ログに詳細記録
- リトライ可能な場合は再試行オプション提供

#### 7.1.2 データベースエラー

- 接続失敗
- ロック競合
- 整合性制約違反

**処理:**

- トランザクションロールバック
- エラー内容をログ記録
- 必要に応じてデータベース修復ツール提案

#### 7.1.3 メディアファイルエラー

- 破損したアーカイブ
- 非対応コーデック
- メモリ不足

**処理:**

- エラーアイコン表示
- 詳細情報をツールチップで表示
- 外部アプリで開くオプション提供

### 7.2 ロギング戦略

```typescript
import log from 'electron-log';

// 本番環境
log.transports.file.level = 'info';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';

// 開発環境
log.transports.console.level = 'debug';
```

### 7.3 クラッシュレポート

```typescript
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);

  const crashReport = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack
    },
    systemInfo: {
      platform: os.platform(),
      arch: os.arch(),
      memory: os.totalmem(),
      version: app.getVersion()
    }
  };

  fs.writeFileSync(
    path.join(app.getPath('userData'), 'logs', 'crash.json'),
    JSON.stringify(crashReport, null, 2)
  );
});
```

---

## 8. パフォーマンス最適化

### 8.1 ファイルスキャン最適化

```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // 同時10ファイルまで処理

const scanFiles = async (filePaths: string[]) => {
  const promises = filePaths.map(path =>
    limit(() => analyzeFile(path))
  );

  return Promise.all(promises);
};
```

### 8.2 検索最適化

```typescript
// React Query設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5分間キャッシュ
      cacheTime: 10 * 60 * 1000, // 10分間保持
    }
  }
});
```

### 8.3 UI最適化

```typescript
// 仮想スクロール
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={files.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <FileListItem file={files[index]} style={style} />
  )}
</FixedSizeList>
```

### 8.4 メモリ管理

```typescript
// LRUキャッシュ実装
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  set(key: K, value: V) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
}
```

---

## 9. セキュリティ・プライバシー

### 9.1 データ保護

#### 9.1.1 データベース暗号化（標準機能）

**実装:**

```typescript
import SQLCipher from 'better-sqlite3-sqlcipher';

// 初回起動時にマスターパスワード設定
const setupDatabase = (masterPassword: string) => {
  const key = crypto.pbkdf2Sync(
    masterPassword,
    'gentle-viewer-salt',
    100000,
    32,
    'sha256'
  );

  const db = new SQLCipher('database.db', {
    key: key.toString('hex')
  });

  return db;
};
```

**機能:**

- 初回起動時にマスターパスワード設定（必須）
- データベース全体をAES-256で暗号化
- パスワード変更機能
- パスワードリセット（データ全削除警告あり）

#### 9.1.2 アプリロック機能

**起動時認証:**

- アプリ起動時にパスワード入力画面表示
- 3回失敗でアプリ終了
- バイオメトリクス認証対応（Windows Hello）

**設定:**

- 起動時認証の有効/無効
- 自動ロック時間設定（5分/10分/30分/無効）
- 最小化時に自動ロック

#### 9.1.3 クイックロック機能

**ショートカット:**

- `Ctrl + L`: 即座にロック画面へ
- `Ctrl + Shift + H`: アプリを最小化してロック

**ロック画面:**

```txt
┌──────────────────────────────────┐
│                                  │
│         🔒 Locked                │
│                                  │
│    [パスワード入力フィールド]      │
│                                  │
│         [Unlock]                 │
│                                  │
└──────────────────────────────────┘
```

**復帰:**

- パスワード入力でロック解除
- ビューワーは前回の位置から再開

### 9.2 「ボスが来た！」機能 【重要機能】

#### 9.2.1 緊急非表示機能

**トリガー:**

- `Ctrl + Shift + B`: ボスキー（カスタマイズ可能）
- タスクトレイアイコンの「緊急非表示」メニュー

**動作:**

1. **即座に別画面に切替**（0.1秒以内）
2. ビューワーウィンドウを完全非表示
3. タスクバーから消去
4. システムトレイに格納

**カバー画面オプション:**

- **オプションA**: 空のウィンドウ（真っ白）
- **オプションB**: Excel風のダミー画面
- **オプションC**: Visual Studio Code風のダミー画面
- **オプションD**: ブラウザ風のダミー画面（ニュースサイト）
- **オプションE**: エクスプローラー風画面
- **カスタム**: ユーザーが画像を指定可能

**カバー画面の特徴:**

- 実際に操作可能（ダミーデータ表示）
- Alt+Tabで表示されない設定も可能
- ウィンドウサイズ・位置を記憶

#### 9.2.2 実装詳細

```typescript
// ボスキー押下時の処理
const activateBossKey = () => {
  // 1. 現在の状態を保存（0.05秒）
  saveCurrentState();

  // 2. メインウィンドウを非表示（0.02秒）
  mainWindow.hide();
  taskbarIcon.hide();

  // 3. カバーウィンドウを表示（0.03秒）
  showCoverWindow();

  // 総時間: 0.1秒以内
};

// カバーウィンドウ
const createCoverWindow = () => {
  const coverWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: getCoverTitle(), // "四半期レポート.xlsx" 等
    icon: getCoverIcon(),   // Excel/VSCode等のアイコン
    skipTaskbar: false,     // タスクバーに表示
    alwaysOnTop: false
  });

  coverWindow.loadFile(getCoverHTML());

  return coverWindow;
};
```

#### 9.2.3 カバー画面テンプレート

**Excel風:**

```html
<!-- ダミーのスプレッドシート -->
<div class="excel-container">
  <div class="toolbar">...</div>
  <div class="spreadsheet">
    <table>
      <tr><td>A1</td><td>売上</td><td>予算</td></tr>
      <tr><td>1月</td><td>1,250,000</td><td>1,200,000</td></tr>
      <!-- ダミーデータ -->
    </table>
  </div>
</div>
```

**設定項目:**

- カバー画面の種類選択
- カバー画面のウィンドウタイトル
- カバー画面の内容（テンプレートまたはカスタム）
- ボスキーのカスタマイズ
- 復帰用のキー設定（デフォルト: 同じキー再押下）

#### 9.2.4 復帰方法

**復帰トリガー:**

- ボスキーを再度押下
- システムトレイアイコンをダブルクリック
- 設定した復帰パスワード入力

**復帰動作:**

1. カバーウィンドウを閉じる
2. パスワード入力画面表示（設定で省略可）
3. メインウィンドウを復元
4. 前回の表示位置から再開

#### 9.2.5 高度な設定

**プロセス名偽装（オプション）:**

- タスクマネージャーでの表示名を変更
- "GentleViewer.exe" → "Excel.exe" 風に表示
- ※ セキュリティソフトに誤検知される可能性あり

**音声ミュート連動:**

- ボスキー押下時に自動的にシステム音量ミュート
- 復帰時に元の音量に戻す

**履歴クリア:**

- ボスキー押下時に最近使ったファイル履歴をクリア（オプション）

### 9.3 隠しタグ機能

#### 9.3.1 タグの可視性制御

**タグ設定:**

```typescript
interface Tag {
  id: number;
  name: string;
  color: string;
  isHidden: boolean;      // 非表示フラグ
  requireAuth: boolean;   // 表示時に認証要求
}
```

**機能:**

- 特定のタグを「隠しタグ」に設定
- 隠しタグが付いたファイルは検索結果に表示されない
- ショートカットキーで一時的に表示

#### 9.3.2 隠しタグの表示切替

**ショートカット:**

- `Ctrl + Shift + H`: 隠しタグ付きファイルの表示/非表示切替
- 切替時にパスワード入力（設定で有効化）

**UI表示:**

```txt
┌─────────────────────────────┐
│ タグ一覧                     │
├─────────────────────────────┤
│ ☑ イラスト (125)            │
│ ☑ 漫画 (87)                 │
│ ☑ 写真集 (43)               │
│ ─────────────────────       │
│ 👁 隠しタグを表示 (Ctrl+H) │
└─────────────────────────────┘

[隠しタグ表示時]
┌─────────────────────────────┐
│ タグ一覧                     │
├─────────────────────────────┤
│ ☑ イラスト (125)            │
│ ☑ 漫画 (87)                 │
│ ☑ 写真集 (43)               │
│ ─────────────────────       │
│ 🔒 [隠しタグ] (56)          │
│ 🔒 [秘密のコレクション] (23) │
│ ─────────────────────       │
│ 👁 隠しタグを隠す (Ctrl+H)  │
└─────────────────────────────┘
```

#### 9.3.3 データベース設計への追加

```sql
-- tags テーブルに列追加
ALTER TABLE tags ADD COLUMN is_hidden INTEGER DEFAULT 0;
ALTER TABLE tags ADD COLUMN require_auth INTEGER DEFAULT 0;

-- 隠しタグ用のインデックス
CREATE INDEX idx_tags_hidden ON tags(is_hidden);
```

#### 9.3.4 検索クエリへの影響

```typescript
// 通常検索（隠しタグを除外）
const searchFiles = (query: SearchQuery, showHidden: boolean = false) => {
  let sql = db.selectFrom('files')
    .innerJoin('file_tags', 'files.id', 'file_tags.file_id')
    .innerJoin('tags', 'file_tags.tag_id', 'tags.id');

  if (!showHidden) {
    sql = sql.where('tags.is_hidden', '=', 0);
  }

  return sql.execute();
};
```

### 9.4 プライバシー設定統合

#### 9.4.1 設定画面

```txt
┌─────────────────────────────────────────┐
│ プライバシー設定                         │
├─────────────────────────────────────────┤
│                                         │
│ 【認証】                                 │
│ ☑ 起動時にパスワード要求                 │
│ ☑ 自動ロック: [10分後]                  │
│ ☑ 最小化時にロック                       │
│                                         │
│ 【緊急非表示（ボスキー）】                │
│ ボスキー: [Ctrl+Shift+B] [変更]         │
│ カバー画面: [Excel風] ▼                 │
│ ☑ 音声を自動ミュート                     │
│ ☑ 履歴をクリア                           │
│                                         │
│ 【隠しタグ】                             │
│ ☑ 隠しタグ機能を有効化                   │
│ ☑ 表示切替時にパスワード要求             │
│                                         │
│ 【その他】                               │
│ ☑ 使用統計を送信しない                   │
│ ☑ クラッシュレポートを送信しない         │
│                                         │
└─────────────────────────────────────────┘
```

#### 9.4.2 初回セットアップウィザード

```txt
[Step 1/3] マスターパスワード設定
┌─────────────────────────────────────┐
│ Gentle Viewerへようこそ！            │
│                                     │
│ まず、データを保護するための         │
│ マスターパスワードを設定します。     │
│                                     │
│ パスワード: [**********]            │
│ 確認:       [**********]            │
│                                     │
│ ヒント: [________________]          │
│                                     │
│         [次へ >]                    │
└─────────────────────────────────────┘

[Step 2/3] プライバシー設定
┌─────────────────────────────────────┐
│ プライバシー保護機能の設定           │
│                                     │
│ ☑ 起動時にパスワード要求             │
│ ☑ ボスキー機能を有効化               │
│   └ ショートカット: Ctrl+Shift+B    │
│ ☑ 隠しタグ機能を有効化               │
│                                     │
│ これらは後で設定から変更できます。   │
│                                     │
│  [< 戻る]         [次へ >]          │
└─────────────────────────────────────┘

[Step 3/3] カバー画面の選択
┌─────────────────────────────────────┐
│ ボスキー使用時の表示を選択           │
│                                     │
│ ○ Excel風（四半期レポート）         │
│ ○ VSCode風（プログラミング）        │
│ ○ ブラウザ風（ニュースサイト）       │
│ ○ エクスプローラー風                 │
│ ○ カスタム画像を指定                 │
│                                     │
│  [< 戻る]         [完了]            │
└─────────────────────────────────────┘
```

### 9.5 セキュリティ上の注意

**実装時の考慮事項:**

1. **メモリダンプ対策**
   - 機密データをメモリに長時間保持しない
   - 使用後は即座にゼロクリア

2. **スワップファイル対策**
   - 重要なデータは `SecureString` 相当の機構で保護
   - ページングを防ぐ（可能な範囲で）

3. **スクリーンショット対策**
   - Windows の PrintScreen でキャプチャされないオプション
   - `SetWindowDisplayAffinity(HWND, WDA_EXCLUDEFROMCAPTURE)`

4. **タスクバープレビュー対策**
   - ビューワーウィンドウのサムネイルを無効化
   - または常に白紙のサムネイルを表示

5. **最近使ったファイル対策**
   - Windowsの最近使ったファイルに記録しない
   - ジャンプリストを無効化

```typescript
// スクリーンショット対策（Windows）
if (process.platform === 'win32') {
  const { setWindowDisplayAffinity } = require('electron');
  setWindowDisplayAffinity(
    mainWindow.getNativeWindowHandle(),
    'exclude-from-capture'
  );
}

// タスクバープレビュー無効化
mainWindow.setThumbarButtons([]);
mainWindow.setThumbnailClip({ x: 0, y: 0, width: 0, height: 0 });

// 最近使ったファイルに追加しない
app.setAppUserModelId('com.gentleviewer.app');
app.clearRecentDocuments();
```

### 9.6 外部通信制限

- 基本機能はすべてオフラインで動作
- アップデート確認のみネットワーク使用
- Content Security Policy による制限

---

## 10. アップデート機能

### 10.1 自動アップデート

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'アップデート準備完了',
    message: `バージョン ${info.version} のインストール準備ができました。`,
    buttons: ['今すぐ再起動', '後で']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

---

## 11. アクセシビリティ

### 11.1 キーボードナビゲーション

#### グローバルショートカット

| キー | 動作 |
|-----|------|
| `Ctrl + F` | 検索フォーカス |
| `Ctrl + T` | タグダイアログ |
| `Ctrl + N` | 新規タグ |
| `Ctrl + O` | ファイル追加 |
| `Ctrl + ,` | 設定 |
| `F5` | 更新 |
| `Esc` | ダイアログ閉じる |

### 11.2 スクリーンリーダー対応

```tsx
<button
  aria-label="次のファイルを表示"
  onClick={handleNext}
>
  <NextIcon />
</button>
```

### 11.3 色覚対応

- カラーピッカーにアクセシブルなパレット
- 重要な情報を色だけで表現しない
- コントラスト比 4.5:1 以上を確保

---

## 12. 国際化（Phase 2）

### 12.1 対応言語

- 日本語（デフォルト）
- 英語
- 中国語（簡体字/繁体字）

### 12.2 実装

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ja: { translation: require('./locales/ja.json') },
      en: { translation: require('./locales/en.json') }
    },
    lng: 'ja',
    fallbackLng: 'en'
  });
```

---

## 13. テスト戦略

### 13.1 ユニットテスト

```typescript
describe('FileScanner', () => {
  it('should detect file type correctly', () => {
    const fileType = detectFileType('test.zip');
    expect(fileType).toBe('archive');
  });
});
```

### 13.2 統合テスト

```typescript
describe('Tag Search', () => {
  it('should return files with all specified tags', async () => {
    const results = await searchFiles({
      tags: { include: [1, 2], exclude: [], any: [] }
    });

    results.forEach(file => {
      expect(file.tags).toContain(1);
      expect(file.tags).toContain(2);
    });
  });
});
```

### 13.3 E2Eテスト

```typescript
import { test, expect } from '@playwright/test';

test('should add file and assign tag', async ({ page }) => {
  await page.goto('app://localhost');
  await page.click('[data-testid="add-file-button"]');
  // ...
});
```

---

## 14. ビルド・デプロイ

### 14.1 ビルド設定

```json
{
  "build": {
    "appId": "com.gentleviewer.app",
    "productName": "Gentle Viewer",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "shortcutName": "Gentle Viewer"
    }
  }
}
```

### 14.2 CI/CD

```yaml
name: Build
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Gentle Viewer
        run: npm run build
      - name: Package
        run: npm run package
```

---

## 15. ドキュメント

### 15.1 ユーザーマニュアル

- インストール手順
- 基本的な使い方
- タグ管理のベストプラクティス
- ビューワーの操作方法
- トラブルシューティング

### 15.2 開発者ドキュメント

- アーキテクチャ概要
- コーディング規約
- API仕様
- プラグイン開発ガイド（Phase 2）

---

## 16. 開発スケジュール（修正版）

### Phase 1: コア機能（4-5か月）

#### Week 1-2: プロジェクトセットアップ

- Electron + React + TypeScript環境構築
- データベーススキーマ設計・実装

#### Week 3-4: 基本UI実装

- メインウィンドウUI
- サイドバー、ファイルリスト

#### Week 5-8: ファイル登録機能

- ドラッグ&ドロップ
- ファイル解析
- サムネイル生成

#### Week 9-12: タグ管理・検索

- タグCRUD
- 部分一致検索（FTS5）
- 検索機能

#### Week 13-22: 統合ビューワー

- ビューワー基盤
- 画像アーカイブビューワー
- 動画ビューワー
- PDFビューワー
- 画像・音声ビューワー

### Phase 2: 拡張機能（2-3か月）

#### Week 23-30: 拡張機能

- ビューワー拡張
- ファイル監視
- 自動化機能
- 統計・分析

### Phase 3: 改善・最適化（1-2か月）

#### Week 31-38: 最適化とリリース

- パフォーマンス最適化
- UI/UX改善
- テスト・デバッグ
- ドキュメント作成

---

## 17. 成功指標（KPI）

### 技術指標

- **登録可能ファイル数**: 100,000件以上
- **ファイル登録速度**: 1,000件/秒以上
- **検索速度**: 1秒以内
- **ビューワーページめくり速度**: 0.3秒以内
- **メモリ使用量**: 500MB以下
- **起動時間**: 3秒以内
- **クラッシュ率**: 0.1%以下

### ユーザー体験指標

- **ユーザー満足度**: 4以上（5段階評価）
- **タスク完了率**: 90%以上
- **学習時間**: 15分以内

---

## 18. リスク管理

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| パフォーマンス低下 | 高 | 中 | 仮想スクロール、遅延読み込み |
| メモリリーク | 高 | 中 | 定期的な監視、キャッシュクリア |
| データベース破損 | 高 | 低 | 定期バックアップ、修復ツール |
| 非対応コーデック | 中 | 高 | 事前チェック、外部プレイヤー連携 |
| **暗号化によるパフォーマンス低下** | 中 | 中 | **キャッシュ最適化、非同期処理** |
| **ボスキー誤爆** | 低 | 中 | **確認ダイアログ（オプション）、カスタマイズ可能** |

---

## 19. 参考アプリケーション

### ファイル管理

- **Eagle**: タグベース管理、優れたUI/UX
- **Everything**: 高速検索
- **TagSpaces**: タグ階層化

### ビューワー

- **Honeyview**: シンプルで高速
- **CDisplayEx**: 漫画ビューワーの定番
- **NeeView**: 見開き表示
- **VLC Media Player**: 多形式対応
- **MPC-HC**: 軽量動画プレイヤー

---

## 20. 今後の展望（Phase 3以降）

### 20.1 追加対応形式

- **アーカイブ**: RAR, 7-Zip, CBZ/CBR
- **動画**: AVI, MOV, WMV
- **画像**: TIFF, HEIF, AVIF
- **テキスト**: TXT, MD, LOG
- **Office**: DOCX, XLSX, PPTX

### 20.2 高度な機能

- **AIタグ付け**: 画像認識による自動タグ
- **重複検出**: パーセプチュアルハッシュ
- **OCR**: テキスト抽出
- **プラグインシステム**: カスタムビューワー開発
- **クラウドバックアップ**: 暗号化されたタグデータの同期
- **マルチデバイス連携**: スマホから閲覧履歴確認
- **VRモード**: VRヘッドセットでの没入型閲覧（Phase 4）

### 20.3 コミュニティ機能

- **タグテンプレート共有**: コミュニティでタグセットを共有
- **プラグインマーケット**: カスタムビューワーの配布
- **テーマ共有**: UIテーマの作成・配布

### 20.4 プラットフォーム拡張

- **macOS対応**: Finderとの統合
- **Linux対応**: GNOME/KDE統合
- **モバイルビューワー**: iOS/Android閲覧専用アプリ

---

## 21. 付録A:プロジェクト構造

```txt
gentle-viewer/
├── src/
│   ├── main/              # メインプロセス
│   ├── renderer/          # レンダラープロセス
│   └── shared/            # 共有型定義
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── resources/             # リソースファイル
├── docs/                  # ドキュメント
├── package.json
├── tsconfig.json
└── README.md
```

---

## 22. 付録B:開発環境セットアップ

### 必要なソフトウェア

```bash
node --version  # v18.0.0以降
npm --version   # 9.0.0以降
git --version
```

### プロジェクト初期化

```bash
mkdir gentle-viewer
cd gentle-viewer
npm init -y

# 依存関係インストール
npm install electron react react-dom
npm install @mui/material @emotion/react
npm install better-sqlite3 kysely
npm install jszip chokidar

# 開発依存関係
npm install -D typescript @types/react @types/node
npm install -D electron-builder vite
npm install -D jest @testing-library/react
```

---

## おわりに

本要件定義書v3.0は、**Gentle Viewer**の開発に必要なすべての情報を網羅しています。

Gentle Viewerという名前には、「ユーザーにやさしく」「ファイル形式にやさしく」「パフォーマンスにやさしく」という3つの意味が込められています。

**次のステップ:**

1. Phase 0: 開発環境セットアップ、技術検証
2. Phase 1: コア機能の実装
3. Phase 2: 拡張機能の実装
4. Phase 3: 改善・最適化
5. リリース: テスト、ドキュメント、公開

**成功のポイント:**

- アジャイル的な開発（2週間スプリント）
- 継続的なテストとリファクタリング
- ユーザーフィードバックの早期取得
- パフォーマンス目標の定期的な測定
- 「やさしさ」を常に意識したUI/UX設計

Gentle Viewerが、ユーザーにとって手放せないツールとなることを期待しています。

---

**Project Name**: Gentle Viewer
**Document Version**: 3.0
**Last Updated**: 2025-10-02
**Status**: Ready for Implementation
