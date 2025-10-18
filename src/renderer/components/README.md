# ThumbnailGrid の使い方

例（App.tsx 内）:
import ThumbnailGrid from './components/ThumbnailGrid';

const files = [
  'C:\\Users\\naomu\\Pictures\\img1.jpg',
  'C:\\Users\\naomu\\Pictures\\img2.png',
  // ...
];

<ThumbnailGrid filePaths={files} colCount={4} thumbWidth={160} />

挙動:

- マウント時に既存キャッシュを取得し、自動でサムネイル生成を開始（autoStart: true）
- 個別の「生成」ボタンで単体生成をトリガできる
- 生成中は preload 経由で送られる thumbnail-progress イベントで該当ファイルのパスを更新する
