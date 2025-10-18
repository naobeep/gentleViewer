# 優先度別リスト

🔴 最優先（Phase 1で必須）

1. PDFビューワー設計書
2. 画像ビューワー設計書
3. 音声プレイヤー設計書
4. 統合ビューワー切替ロジック
5. ファイル情報ダイアログ
6. タグ編集ダイアログ
7. ファイル追加ダイアログ

🟡 高優先度（Phase 1推奨）

1. 設定画面（アプリ全体）
2. 通知システム
3. エラー表示の統一
4. ローディング表示の統一
5. 初回起動ウィザード

🟢 中優先度（Phase 2）

1. 統計・分析画面
2. キーボードショートカット一覧画面
3. 検索結果ハイライト
4. ドラッグ&ドロップのビジュアルフィードバック詳細
5. ファイルリストの詳細表示モード

🔵 低優先度（Phase 2-3）

1. サムネイル生成進捗
2. 保存済み検索管理UI
3. データベースメンテナンス画面

---

## 更新履歴（v3.0反映）

要件定義書 v3.0 の内容を反映してタスクリストを再編しました。以下はフェーズ別・短期優先度付きの実行可能なタスク一覧です。

## Phase0 — 開発基盤（最優先）

- 環境セットアップ（Node/npm, TypeScript, Electron, Vite, ESLint/Prettier）
- tsconfig / package.json / vite.config の整理（preload を含める）
- CI 設定（Windows runner でのビルドとテスト）
- README に起動手順を明記
目安: 1–3日

## Phase0 — セキュリティ & プリロード（最優先）

- preload のビルド・contextBridge API を確定
- BrowserWindow の webPreferences をセキュア化
- IPC テスト（ping/pong）完了
目安: 1–2日

## Phase1 — コア機能（高優先）

- データベース設計とマイグレーション（files/tags/saved_searches等）
- ファイルスキャン／メタデータ抽出
- サムネイル生成サービス（start/pause/resume/cancel, events）
- 統合ビューワー（image/pdf/video/audio/archive）
- タグ管理と検索（FTS 等）
- 基本 UI（ファイルリスト、サイドバー、ビューワ起動）
目安: 各タスク 3–10日

## Phase2 — 拡張（中優先）

- 自動タグ付け（AI/ルール）
- 重複検出（pHash 等）
- OCR／メタデータ強化
- 設定画面・アクセシビリティ対応
目安: 1–6週（機能により変動）

## Phase3 — 運用・テスト（中〜低優先）

- ロギング／クラッシュレポート（Sentry）
- アップデート統合（electron-updater）
- ユニット / E2E テスト整備（Jest / Playwright）
- パフォーマンスチューニング（仮想スクロール等）
目安: 2–4週

---

## 今週の短期バックログ（推奨優先順・実行目安）

1. preload と IPC の最終確認（A） — 優先 — 1日
   - IPC テストを安定化、dev-stub を削除
2. サムネイル start の dev-simulate 実装（B） — 優先 — 1日
   - テストボタンで進捗を確認できるようにする
3. DB マイグレーション雛形追加（C） — 優先 — 2日
   - saved_searches / files の最小スキーマ
4. Viewer 起動フローの UI 結合（D） — 中 — 2日
   - ファイルリストからダブルクリックで統合ビューワ起動
5. CI の Windows ビルド確認 — 中 — 1日

---

## タスク管理（Issue 化テンプレート）

- タイトル: [領域] 短い説明
- 説明:
  - 目的
  - 受け入条件
  - 実装メモ
  - テスト手順
- ラベル候補: phase0 / phase1 / security / ui / ipc / db

例:

- タイトル: [ipc] preload の contextBridge を確定して dev-stub を削除
- 受け入条件:
  - window.electronAPI がすべての公開メソッドを持つ
  - ipcTestPing が成功する
  - dev-stub を使わない状態で renderer が正常動作する

---

## 次のアクション（選択してください）

- 今週の Sprint Backlog を GitHub Issues に展開（Issue マークダウンを生成します）
- 個別タスクをさらに 7–10 の subtasks に分割
- 今すぐ適用するコードパッチ（thumbnail-ipc の simulate 実装 / preload 修正等）
