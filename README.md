# gentleViewer

開発・ビルド手順（Windows）

セットアップ:

1. Node.js (推奨 18+) をインストール
2. プロジェクトルートで:
   npm install

開発モード:

- フル開発（main と renderer 同時起動）:
  npm run dev
- renderer 単体:
  npm run dev:renderer
- main (TypeScript watch):
  npm run dev:main

ビルド:

- フルビルド:
  npm run build
- main ビルド:
  npm run build:main
- renderer ビルド:
  npm run build:renderer

クリーン:

- dist を削除:
  npm run clean

CI:

- GitHub Actions を用意済み（.github/workflows/ci.yml）

注意 / よくある確認点

- preload は tsconfig.main.json の include に入っています。main をビルドして dist/preload/*.js が生成されていることを必ず確認してください。
- アプリのヘッダーは `src/renderer/components/Header.tsx` で、ロゴは `src/icon/512.png` を使用します。
- 新しいレイアウトコンポーネント `src/renderer/layouts/MainLayout.tsx` を導入しています。既存の `App.tsx` は MainLayout でラップする形に差し替え済みです。
- 共通スタイルは `src/renderer/styles/main.css`。ダークベース（--bg: #333）とキーカラー（--primary-main: gold）を採用しています。

サムネイル関連のトラブルシューティング

- サムネイルが出ない場合、まずファイル一覧を読み込んでサムネイル情報が入っているか確認してください（DevTools のコンソールにデバッグ出力を出すロジックを App.tsx に追加済み）。
- Renderer からサムネイル生成を明示的に要求するためのボタンを UI（ツールバー）に追加しています。実行時は DevTools のログを確認してください。
- サポートしている IPC 名（preload/main 側の実装に依存）:
  - generateThumbnails(paths)（preload が便利 API を公開している場合）
  - generateThumbs(paths)
  - invoke('generate-thumbnails', { paths })
- サムネイル生成の進行は `thumbnail-progress` イベント（または preload が別名で公開している場合あり）で受け取ります。イベント購読は App.tsx に実装済み（購読ハンドラはコンソールログを出します）。
- それでも動かない場合は、main/preload 側で以下を確認してください:
  - preload が contextBridge 経由で generateThumbnails / openViewer / reindexFTS 等をエクスポートしているか
  - main 側でサムネイル生成処理が正常に実行されているか（ファイルパスの権限、パスの正当性）
  - thumbnail-progress / reindex-done 等のイベントが送出されているか

重要実装ポイント

- Viewer への遷移は簡易ハッシュルーティング（#viewer?path=...）でも動作します。preload が openViewer を提供していれば直接呼び出します。
- FTS 再インデックス実行ハンドラ（reindex）は App.tsx にあり、preload の reindexFTS / invoke('reindex-ft') にフォールバックする実装があります。

その他

- 画面デザイン（ヘッダー、サイドバー、ツールバー、ステータスバー）は `src/renderer/layouts/MainLayout.tsx` と `src/renderer/styles/main.css` にまとめています。レイアウトや配色の微調整は styles/main.css を編集してください。

問題が続く場合

- DevTools コンソール出力（loadFiles の debug 出力、ensureThumbnails の結果、thumbnail-progress イベントログ）を貼ってください。preload/main 側の該当コード（contextBridge.exposeInMainWorld / ipc handlers）がわかれば合わせて添付してください。
