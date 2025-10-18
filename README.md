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

注意:

- preload は tsconfig.main.json の include に入っています。main をビルドして dist/preload/*.js が生成されていることを確認してください。
