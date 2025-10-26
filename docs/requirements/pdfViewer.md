# PDF ビューワー設計書（簡易実装）

目的

- PDF ファイルをアプリ内で表示する。最初は閲覧（ページ移動・拡大縮小・回転・印刷）のみを実装。

受け入れ条件

- ローカルの PDF ファイルを開けること（Renderer から main 経由で安全に取得）。
- ページナビ（前/次/ジャンプ）、ズーム（%指定）、回転が可能。
- 印刷ダイアログを起動して印刷できること。
- テキスト選択ができる（可能な範囲で実装、まずは表示重視）。

セキュリティ

- ファイル読み取りは main プロセスで行い、preload を通じて限定 API のみを公開する。
- Renderer に直接 node:fs を露出しない。

アーキテクチャ（簡易）

- main: IPC ハンドラ 'pdf.getData' を追加 -> 指定パスのファイルを Buffer で返す。
- preload: contextBridge で pdf API を公開（getData(filePath)）。
- renderer: React コンポーネント PDFViewer.tsx を追加。pdfjs-dist を使い ArrayBuffer を元に表示。

ライブラリ

- pdfjs-dist

実装手順（短期）

1. 依存追加: npm install pdfjs-dist
2. main 側 IPC ハンドラ追加（pdf.getData）
3. preload に pdf API 追加
4. renderer に PDFViewer コンポーネント追加（canvas ベース、ページ移動・ズーム・回転・印刷）
5. テスト: 数ファイルで表示・印刷・操作確認

簡易見積

- 設計/セットアップ: 0.5日
- 実装（基本機能）: 1日
- テスト/調整: 0.5日

拡張案（将来）

- サムネイル連携、複数ページサムネイル、ページサムネイル生成キャッシュ、テキスト検索・ハイライト、連続スクロール表示。
