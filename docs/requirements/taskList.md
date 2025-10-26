# 優先度別リスト（更新：残作業の精査）

※ 現在の実装状況を反映して未完了／追加すべきタスクを明確化しました。短期で対応優先度が高いものを上に並べています。
（更新履歴：main 側 IPC ハンドラ拡張、cache.clear / cache.getInfo 実装、thumbnail-generator に実実装自動検出パッチを追加、TypeScript 引数エラー修正）

🔴 最優先（Phase1で必須・未完了 or 要検討）

1. PDFビューワー設計書（未完）
   - 受け入条件: ページナビ／拡大縮小／印刷／テキスト選択の要件を決定。PDF.js 採用可否検討。
   - 見積: 2–4日（設計＋簡易実装：1–2日）
2. 画像ビューワー設計書（部分実装済）
   - 必要: 高解像度表示、ズーム・パン、回転、メタデータ表示、キーボード操作設計。
   - 見積: 1–3日
3. 統合ビューワー切替ロジック（未完）
   - 条件: 拡張子判定ルール、優先表示順（画像→PDF→動画→音声→外部）を明確化。
   - 見積: 0.5–1日（実装調整含む）
4. タグ編集ダイアログ（簡易実装あり → 完成必要）
   - 必要: タグの作成・削除・カラー編集、複数タグ付与UI、ファイル側でのタグ付けUX。
   - 見積: 1–2日
5. ファイル情報ダイアログ（未実装）
   - 必要: メタ（path/size/type/created/updated/tags/thumbnail path）表示。
   - 見積: 0.5–1日
6. マイグレーション整備・FTS インデックス確認（部分実装済）
   - 必要: 001_init.sql の確定、起動時の FTS インデックス更新の回避チェック、dist に含める手順。
   - 見積: 1–2日

🟡 高優先度（Phase1推奨）

1. キャッシュ管理（TTL / サイズ上限 / 手動クリア） — 必須機能（部分実装済）
   - 進捗: preload と main の API で cache.getInfo / cache.clear / cache.prune が実装済みで、renderer からの呼び出しで情報取得・強制クリアが確認済み。
   - 未完点: 自動 pruning のポリシー適用（TTL・サイズ制限のバックグラウンド enforcement）、UI のキャッシュ管理画面、prune の安全確認ワークフロー。
   - 次アクション: prune policy の自動スケジューリング実装、UI に現在サイズと削除ボタンを追加。
2. サムネイル生成並列度／設定の UI 連動（部分実装）
   - 進捗: main 側で thumbnail.getConfig / thumbnail.setConfig / thumbnail.startManaged を実装。thumbnail-generator に「実実装自動検出」パッチを追加し、見つかれば実関数を呼ぶようにした。TypeScript の引数エラーは修正済み。
   - 未完点: Renderer の ThumbnailSettings UI と並列度（concurrency）設定の双方向連携（UIから設定を永続化し、thumbnail ジェネレータへ確実に反映）が未実装。並列度を安全に反映する API（setter）があれば確実。
   - 次アクション: ThumbnailSettings で concurrency を変更 → ipc 経由で保存 → startManaged 実行時に確実に反映されることを検証し、必要であれば thumbnail-generator に setter を追加。
3. ビューワ：キーボード操作（次/前/閉じる）・フルスクリーン（未実装）
4. エラー表示の統一（Renderer 側トースト/モーダル）
5. 初回起動ウィザード（DB 初期化／フォルダ登録）

🟢 中優先度（Phase2）

1. 保存済み検索 UI の完成（保存／編集／削除）
2. 検索結果ハイライト（FTS 検索語の強調表示）
3. ドラッグ&ドロップのビジュアルフィードバック詳細
4. 設定画面（アプリ全体の設定項目追加）

🔵 低優先度（Phase2-3）

1. 自動タグ付け（AI/ルール）
2. 重複検出（pHash 等）
3. OCR／メタデータ強化
4. 統計・分析画面、CIの拡張（Windows実行安定化）

---

## 現在「完了」または「動作確認済み」項目（参照）

- preload の contextBridge（基本 API を公開） — 完了
- thumbnail generation の IPC（start/progress/get-paths）および dev-simulate 実装 — 完了（進捗イベント確認済み）
- main 側で thumbnail.getConfig / thumbnail.setConfig / thumbnail.startManaged を追加 — 完了（TS 引数修正済）
- thumbnail-generator に「実装自動検出」パッチを追加 — 完了（見つかれば実関数を呼ぶ）
- cache.getInfo / cache.clear の動作確認済み（cache.info: 約16.3MB, 185 files） — 完了
- Renderer 基本 UI：ThumbnailGrid / FileList / TagManager / SearchBar / Viewer（簡易） — 完了（簡易）
- tags リポジトリと基本的なタグ CRUD + search-files IPC（FTS 利用） — 完了
- 新ウィンドウでの Viewer 起動 IPC（open-viewer） — 完了

---

## 優先対応（次のアクション — 推奨順）

1. PDF ビューワー設計書作成 → 簡易実装（PDF.js を使ったビューアをまず追加）
2. キャッシュ自動管理の実装（TTL / サイズ enforcement）＋キャッシュ管理 UI の追加（現在 getInfo/clear は実装済み）
3. サムネイル並列度 UI 連動を実装（ThumbnailSettings で変更→保存→startManaged で反映を確認）。必要なら thumbnail-generator に concurrency setter を追加。
4. タグ編集ダイアログ完成・ファイルへのタグ付けフロー改善
5. FTS とマイグレーションの整合性確認（001_init.sql の最終化）

---

## 付記（運用・開発上の注意）

- キャッシュ内に大量の thumb-dummy ファイルが存在するため（確認済み）、必要ならユーザー側で削除 or prune を実行してクリーンアップしてください。PowerShell 等での一括削除手順はドキュメント/README に追加すると良いです。
- サムネイルの「実実装が見つからない」ケースは既存の fallback-dummy を使うため安全に起動できますが、レンダラー側で実装パスを確実に指定できるようにするのが望ましいです（明示パス優先のオプション追加を推奨）。

---

更新者: GitHub Copilot（要確認）
