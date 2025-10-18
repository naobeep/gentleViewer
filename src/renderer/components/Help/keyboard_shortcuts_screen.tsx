// renderer/components/Help/KeyboardShortcutsScreen.tsx
import React, { useState } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  context?: string;
}

interface ShortcutCategory {
  category: string;
  icon: string;
  shortcuts: Shortcut[];
}

/**
 * キーボードショートカット一覧画面
 */
const KeyboardShortcutsScreen: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: ShortcutCategory[] = [
    {
      category: '全般',
      icon: '⚙️',
      shortcuts: [
        { keys: ['Ctrl', ','], description: '設定を開く' },
        { keys: ['Ctrl', 'F'], description: '検索' },
        { keys: ['Ctrl', 'T'], description: 'タグダイアログを開く' },
        { keys: ['Ctrl', 'O'], description: 'ファイルを追加' },
        { keys: ['Ctrl', 'Shift', 'O'], description: 'フォルダを追加' },
        { keys: ['F5'], description: '更新' },
        { keys: ['Ctrl', 'W'], description: 'ウィンドウを閉じる' },
        { keys: ['?'], description: 'ヘルプ（このウィンドウ）' },
      ],
    },
    {
      category: 'ファイル操作',
      icon: '📁',
      shortcuts: [
        { keys: ['Ctrl', 'A'], description: 'すべて選択' },
        { keys: ['Ctrl', 'クリック'], description: '複数選択' },
        { keys: ['Shift', 'クリック'], description: '範囲選択' },
        { keys: ['Enter'], description: 'ビューワーで開く' },
        { keys: ['Ctrl', 'E'], description: 'エクスプローラーで表示' },
        { keys: ['Ctrl', 'I'], description: 'ファイル情報を表示' },
        { keys: ['Delete'], description: '削除（登録解除）' },
        { keys: ['Ctrl', 'D'], description: 'お気に入りに追加' },
      ],
    },
    {
      category: '表示切替',
      icon: '🎨',
      shortcuts: [
        { keys: ['Ctrl', '1'], description: 'グリッド表示' },
        { keys: ['Ctrl', '2'], description: 'リスト表示' },
        { keys: ['Ctrl', '3'], description: '詳細表示' },
        { keys: ['Ctrl', '+'], description: 'サムネイルを拡大' },
        { keys: ['Ctrl', '-'], description: 'サムネイルを縮小' },
      ],
    },
    {
      category: 'アーカイブビューワー',
      icon: '📚',
      shortcuts: [
        { keys: ['→', 'PageDown', 'L'], description: '次のページ' },
        { keys: ['←', 'PageUp', 'H'], description: '前のページ' },
        { keys: ['Home'], description: '最初のページ' },
        { keys: ['End'], description: '最後のページ' },
        { keys: ['Space'], description: '次のページ（見開き時は2ページ）' },
        { keys: ['Shift', 'Space'], description: '前のページ' },
        { keys: ['N'], description: '次のファイル' },
        { keys: ['P'], description: '前のファイル' },
        { keys: ['S'], description: '表示モード切替' },
        { keys: ['R'], description: '読み方向切替' },
        { keys: ['T'], description: 'サムネイル一覧' },
        { keys: ['B'], description: 'しおりを保存' },
        { keys: ['F', 'F11'], description: '全画面切替' },
        { keys: ['Esc'], description: 'ビューワーを閉じる' },
      ],
    },
    {
      category: '動画ビューワー',
      icon: '🎬',
      shortcuts: [
        { keys: ['Space', 'K'], description: '再生/一時停止' },
        { keys: ['→'], description: '5秒進む' },
        { keys: ['←'], description: '5秒戻る' },
        { keys: ['Shift', '→'], description: '10秒進む' },
        { keys: ['Shift', '←'], description: '10秒戻る' },
        { keys: ['J'], description: '10秒戻る' },
        { keys: ['L'], description: '10秒進む' },
        { keys: ['↑'], description: '音量を上げる' },
        { keys: ['↓'], description: '音量を下げる' },
        { keys: ['M'], description: 'ミュート切替' },
        { keys: ['<', ','], description: '再生速度を下げる' },
        { keys: ['>', '.'], description: '再生速度を上げる' },
        { keys: ['0'], description: '再生速度をリセット' },
        { keys: ['1~9'], description: 'その位置にジャンプ' },
        { keys: ['Home'], description: '最初に戻る' },
        { keys: ['End'], description: '最後にジャンプ' },
        { keys: ['F', 'F11'], description: '全画面切替' },
        { keys: ['I'], description: 'ピクチャーインピクチャー' },
        { keys: ['C'], description: '字幕切替' },
        { keys: ['S'], description: 'スナップショット' },
      ],
    },
    {
      category: 'PDFビューワー',
      icon: '📄',
      shortcuts: [
        { keys: ['→', 'PageDown'], description: '次のページ' },
        { keys: ['←', 'PageUp'], description: '前のページ' },
        { keys: ['Home'], description: '最初のページ' },
        { keys: ['End'], description: '最後のページ' },
        { keys: ['Ctrl', '+'], description: 'ズームイン' },
        { keys: ['Ctrl', '-'], description: 'ズームアウト' },
        { keys: ['Ctrl', '0'], description: 'ズームリセット' },
        { keys: ['1'], description: '幅に合わせる' },
        { keys: ['2'], description: '高さに合わせる' },
        { keys: ['3'], description: 'ページ全体' },
        { keys: ['4'], description: '原寸表示' },
        { keys: ['R'], description: '時計回りに回転' },
        { keys: ['Shift', 'R'], description: '反時計回りに回転' },
        { keys: ['O'], description: '目次を表示' },
        { keys: ['Ctrl', 'F'], description: 'テキスト検索' },
        { keys: ['Ctrl', 'P'], description: '印刷' },
      ],
    },
    {
      category: '画像ビューワー',
      icon: '🖼️',
      shortcuts: [
        { keys: ['→', 'N'], description: '次の画像' },
        { keys: ['←', 'P'], description: '前の画像' },
        { keys: ['+', '='], description: 'ズームイン' },
        { keys: ['-'], description: 'ズームアウト' },
        { keys: ['0'], description: 'ズームリセット' },
        { keys: ['R'], description: '時計回りに回転' },
        { keys: ['Shift', 'R'], description: '反時計回りに回転' },
        { keys: ['H'], description: '左右反転' },
        { keys: ['V'], description: '上下反転' },
        { keys: ['I'], description: 'EXIF情報を表示' },
        { keys: ['C'], description: '比較モード' },
        { keys: ['F'], description: '全画面切替' },
      ],
    },
    {
      category: '音声プレイヤー',
      icon: '🎵',
      shortcuts: [
        { keys: ['Space'], description: '再生/一時停止' },
        { keys: ['→'], description: '5秒進む' },
        { keys: ['←'], description: '5秒戻る' },
        { keys: ['N'], description: '次のトラック' },
        { keys: ['P'], description: '前のトラック' },
        { keys: ['M'], description: 'ミュート切替' },
        { keys: ['L'], description: 'プレイリスト表示' },
        { keys: ['S'], description: 'シャッフル切替' },
        { keys: ['R'], description: 'リピート切替' },
      ],
    },
    {
      category: 'プライバシー',
      icon: '🔒',
      shortcuts: [
        { keys: ['Ctrl', 'L'], description: 'ロック' },
        { keys: ['Ctrl', 'Shift', 'B'], description: 'ボスキー（カスタマイズ可能）' },
        { keys: ['Ctrl', 'Shift', 'H'], description: '隠しタグ表示切替' },
      ],
    },
  ];

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      shortcuts: category.shortcuts.filter(
        (shortcut) =>
          shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shortcut.keys.some((key) =>
            key.toLowerCase().includes(searchQuery.toLowerCase())
          )
      ),
    }))
    .filter(
      (category) =>
        (selectedCategory === 'all' || category.category === selectedCategory) &&
        (searchQuery === '' || category.shortcuts.length > 0)
    );

  if (!isOpen) return null;

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-container" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h1>⌨️ キーボードショートカット</h1>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="shortcuts-controls">
          <input
            type="text"
            placeholder="ショートカットを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <div className="category-tabs">
            <button
              className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              すべて
            </button>
            {categories.map((category) => (
              <button
                key={category.category}
                className={`category-tab ${
                  selectedCategory === category.category ? 'active' : ''
                }`}
                onClick={() => setSelectedCategory(category.category)}
              >
                {category.icon} {category.category}
              </button>
            ))}
          </div>
        </div>

        <div className="shortcuts-content">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div key={category.category} className="shortcut-section">
                <h2>
                  <span className="section-icon">{category.icon}</span>
                  {category.category}
                </h2>
                <div className="shortcuts-list">
                  {category.shortcuts.map((shortcut, index) => (
                    <div key={index} className="shortcut-item">
                      <div className="shortcut-keys">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="key">{key}</kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="key-separator">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="shortcut-description">
                        {shortcut.description}
                        {shortcut.context && (
                          <span className="shortcut-context">
                            ({shortcut.context})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>
                "{searchQuery}" に一致するショートカットが見つかりませんでした
              </p>
            </div>
          )}
        </div>

        <div className="shortcuts-footer">
          <div className="footer-tip">
            <span className="tip-icon">💡</span>
            ヒント: ほとんどのビューワーで <kbd>?</kbd> キーを押すとヘルプが表示されます
          </div>
          <button className="secondary" onClick={() => window.print()}>
            印刷
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsScreen;
