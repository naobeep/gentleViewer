// renderer/components/Statistics/StatisticsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { FileInfo, Tag } from '../../types';

interface StatisticsData {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  filesByTag: Record<string, number>;
  recentActivity: ActivityLog[];
  topTags: TagUsage[];
  storageUsage: StorageInfo;
  viewingHistory: ViewingStats[];
}

interface ActivityLog {
  date: string;
  filesAdded: number;
  filesDeleted: number;
  tagsModified: number;
}

interface TagUsage {
  tagId: number;
  tagName: string;
  color: string;
  count: number;
  percentage: number;
}

interface StorageInfo {
  database: number;
  thumbnails: number;
  cache: number;
  total: number;
}

interface ViewingStats {
  fileType: string;
  viewCount: number;
  totalDuration: number;
}

/**
 * 統計・分析画面
 */
const StatisticsScreen: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    if (isOpen) {
      loadStatistics();
    }
  }, [isOpen, timeRange]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getStatistics(timeRange);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="statistics-overlay" onClick={onClose}>
      <div className="statistics-container" onClick={(e) => e.stopPropagation()}>
        <div className="statistics-header">
          <h1>📊 統計・分析</h1>
          <div className="header-controls">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="time-range-select"
            >
              <option value="week">過去7日間</option>
              <option value="month">過去30日間</option>
              <option value="year">過去1年間</option>
              <option value="all">全期間</option>
            </select>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        {loading ? (
          <div className="statistics-loading">
            <div className="spinner" />
            <p>統計データを読み込んでいます...</p>
          </div>
        ) : statistics ? (
          <div className="statistics-content">
            {/* サマリーカード */}
            <SummaryCards statistics={statistics} />

            {/* グラフセクション */}
            <div className="statistics-grid">
              <FileTypeDistribution data={statistics.filesByType} />
              <TagDistribution data={statistics.topTags} />
              <ActivityChart data={statistics.recentActivity} />
              <StorageBreakdown data={statistics.storageUsage} />
              <ViewingHistory data={statistics.viewingHistory} />
            </div>
          </div>
        ) : (
          <div className="statistics-error">
            統計データの読み込みに失敗しました
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * サマリーカード
 */
const SummaryCards: React.FC<{ statistics: StatisticsData }> = ({ statistics }) => {
  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const cards = [
    {
      icon: '📁',
      label: '総ファイル数',
      value: statistics.totalFiles.toLocaleString(),
      color: '#1976d2',
    },
    {
      icon: '💾',
      label: '総容量',
      value: formatSize(statistics.totalSize),
      color: '#388e3c',
    },
    {
      icon: '🏷️',
      label: 'タグ数',
      value: statistics.topTags.length.toLocaleString(),
      color: '#f57c00',
    },
    {
      icon: '📈',
      label: 'ストレージ使用量',
      value: formatSize(statistics.storageUsage.total),
      color: '#7b1fa2',
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card, index) => (
        <div key={index} className="summary-card" style={{ borderLeftColor: card.color }}>
          <div className="card-icon">{card.icon}</div>
          <div className="card-content">
            <div className="card-label">{card.label}</div>
            <div className="card-value">{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * ファイル形式分布
 */
const FileTypeDistribution: React.FC<{
  data: Record<string, number>;
}> = ({ data }) => {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);

  const chartData = Object.entries(data).map(([type, count]) => ({
    type,
    count,
    percentage: (count / total) * 100,
  }));

  const typeColors: Record<string, string> = {
    archive: '#1976d2',
    video: '#d32f2f',
    pdf: '#f57c00',
    image: '#388e3c',
    audio: '#7b1fa2',
  };

  return (
    <div className="chart-card">
      <h3>ファイル形式別分布</h3>
      <div className="pie-chart">
        <svg viewBox="0 0 200 200" className="pie-svg">
          {(() => {
            let currentAngle = 0;
            return chartData.map((item, index) => {
              const angle = (item.percentage / 100) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;

              const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
              const y2 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);

              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={item.type}
                  d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={typeColors[item.type] || '#666'}
                  stroke="#fff"
                  strokeWidth="2"
                />
              );
            });
          })()}
        </svg>
        <div className="chart-legend">
          {chartData.map((item) => (
            <div key={item.type} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: typeColors[item.type] || '#666' }}
              />
              <span className="legend-label">
                {item.type}: {item.count} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * タグ分布
 */
const TagDistribution: React.FC<{
  data: TagUsage[];
}> = ({ data }) => {
  const topTags = data.slice(0, 10);

  return (
    <div className="chart-card">
      <h3>トップ10タグ</h3>
      <div className="bar-chart">
        {topTags.map((tag) => (
          <div key={tag.tagId} className="bar-item">
            <div className="bar-label">
              <span
                className="tag-color"
                style={{ backgroundColor: tag.color }}
              />
              {tag.tagName}
            </div>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${tag.percentage}%`,
                  backgroundColor: tag.color,
                }}
              />
              <span className="bar-value">{tag.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * アクティビティチャート
 */
const ActivityChart: React.FC<{
  data: ActivityLog[];
}> = ({ data }) => {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.filesAdded, d.filesDeleted))
  );

  return (
    <div className="chart-card">
      <h3>最近のアクティビティ</h3>
      <div className="line-chart">
        <div className="chart-area">
          {data.map((item, index) => {
            const addedHeight = (item.filesAdded / maxValue) * 100;
            const deletedHeight = (item.filesDeleted / maxValue) * 100;

            return (
              <div key={index} className="chart-bar-group">
                <div className="chart-bars">
                  <div
                    className="chart-bar added"
                    style={{ height: `${addedHeight}%` }}
                    title={`追加: ${item.filesAdded}`}
                  />
                  <div
                    className="chart-bar deleted"
                    style={{ height: `${deletedHeight}%` }}
                    title={`削除: ${item.filesDeleted}`}
                  />
                </div>
                <div className="chart-label">
                  {new Date(item.date).toLocaleDateString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color added" />
            追加
          </div>
          <div className="legend-item">
            <span className="legend-color deleted" />
            削除
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ストレージ内訳
 */
const StorageBreakdown: React.FC<{
  data: StorageInfo;
}> = ({ data }) => {
  const formatSize = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const items = [
    { label: 'データベース', value: data.database, color: '#1976d2' },
    { label: 'サムネイル', value: data.thumbnails, color: '#388e3c' },
    { label: 'キャッシュ', value: data.cache, color: '#f57c00' },
  ];

  return (
    <div className="chart-card">
      <h3>ストレージ使用量</h3>
      <div className="storage-breakdown">
        {items.map((item) => {
          const percentage = (item.value / data.total) * 100;
          return (
            <div key={item.label} className="storage-item">
              <div className="storage-header">
                <span className="storage-label">{item.label}</span>
                <span className="storage-value">{formatSize(item.value)}</span>
              </div>
              <div className="storage-bar">
                <div
                  className="storage-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="storage-percentage">
                {percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
        <div className="storage-total">
          合計: {formatSize(data.total)}
        </div>
      </div>
    </div>
  );
};

/**
 * 閲覧履歴
 */
const ViewingHistory: React.FC<{
  data: ViewingStats[];
}> = ({ data }) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  return (
    <div className="chart-card">
      <h3>閲覧統計</h3>
      <div className="viewing-stats">
        {data.map((item) => (
          <div key={item.fileType} className="stat-item">
            <div className="stat-header">
              <span className="stat-type">{item.fileType}</span>
              <span className="stat-count">{item.viewCount}回</span>
            </div>
            {item.totalDuration > 0 && (
              <div className="stat-duration">
                合計: {formatDuration(item.totalDuration)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatisticsScreen;
