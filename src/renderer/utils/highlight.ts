// renderer/utils/highlight.ts

interface HighlightMatch {
  start: number;
  end: number;
  text: string;
}

/**
 * テキスト内の検索キーワードをハイライト用のマークアップに変換
 */
export const highlightText = (
  text: string,
  query: string,
  options: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
  } = {}
): React.ReactNode => {
  if (!query || !text) return text;

  const { caseSensitive = false, wholeWord = false } = options;

  // 検索パターン作成
  const flags = caseSensitive ? 'g' : 'gi';
  const pattern = wholeWord
    ? new RegExp(`\\b${escapeRegExp(query)}\\b`, flags)
    : new RegExp(escapeRegExp(query), flags);

  const matches: HighlightMatch[] = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  if (matches.length === 0) return text;

  // React要素に変換
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    // マッチ前のテキスト
    if (match.start > lastIndex) {
      elements.push(text.substring(lastIndex, match.start));
    }

    // ハイライトされたテキスト
    elements.push(
      <mark key={index} className="search-highlight">
        {match.text}
      </mark>
    );

    lastIndex = match.end;
  });

  // 残りのテキスト
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return <>{elements}</>;
};

const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
