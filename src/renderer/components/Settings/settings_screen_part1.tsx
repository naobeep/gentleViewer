// renderer/components/Settings/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';

interface AppSettings {
  // 一般
  language: 'ja' | 'en';
  theme: 'light' | 'dark' | 'system';
  startupBehavior: 'normal' | 'minimized' | 'tray';
  
  // プライバシー
  masterPassword?: string;
  enableStartupAuth: boolean;
  autoLockMinutes: number;
  lockOnMinimize: boolean;
  
  // ボスキー
  enableBossKey: boolean;
  bossKeyShortcut: string;
  coverScreenType: 'excel' | 'vscode' | 'browser' | 'explorer';
  muteOnBossKey: boolean;
  clearHistoryOnBossKey: boolean;
  
  // 隠しタグ
  enableHiddenTags: boolean;
  requireAuthForHiddenTags: boolean;
  
  // 表示
  gridSize: 'small' | 'medium' | 'large';
  defaultViewMode: 'grid' | 'list' | 'detail';
  thumbnailQuality: 'low' | 'medium' | 'high';
  showFileExtensions: boolean;
  
  // パフォーマンス
  maxCacheSize: number;
  preloadPageCount: number;
  hardwareAcceleration: boolean;
  
  // データベース
  autoBackup: boolean;
  backupInterval: number;
  maxBackupCount: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'ja',
  theme: 'system',
  startupBehavior: 'normal',
  enableStartupAuth: false,
  autoLockMinutes: 10,
  lockOnMinimize: false,
  enableBossKey: false,
  bossKeyShortcut: 'Ctrl+Shift+B',
  coverScreenType: 'excel',
  muteOnBossKey: true,
  clearHistoryOnBossKey: false,
  enableHiddenTags: false,
  requireAuthForHiddenTags: true,
  gridSize: 'medium',
  defaultViewMode: 'grid',
  thumbnailQuality: 'medium',
  showFileExtensions: true,
  maxCacheSize: 1024,
  preloadPageCount: 3,
  hardwareAcceleration: true,
  autoBackup: true,
  backupInterval: 7,
  maxBackupCount: 5,
};

/**
 * 設定画面メインコンポーネント
 */
const SettingsScreen: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // 設定読み込み
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const loaded = await window.electronAPI.getSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.electronAPI.saveSettings(settings);
      setHasChanges(false);
      // 成功通知
    } catch (error) {
      console.error('Failed to save settings:', error);
      // エラー通知
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('設定をデフォルトに戻しますか？')) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: '一般', icon: '⚙️' },
    { id: 'privacy', label: 'プライバシー', icon: '🔒' },
    { id: 'display', label: '表示', icon: '🎨' },
    { id: 'performance', label: 'パフォーマンス', icon: '⚡' },
    { id: 'database', label: 'データベース', icon: '💾' },
    { id: 'advanced', label: '詳細', icon: '🔧' },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-container" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h1>設定</h1>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-body">
          {/* サイドバー（タブ） */}
          <div className="settings-sidebar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* コンテンツ */}
          <div className="settings-content">
            {activeTab === 'general' && (
              <GeneralSettings settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'privacy' && (
              <PrivacySettings settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'display' && (
              <DisplaySettings settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'performance' && (
              <PerformanceSettings settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'database' && (
              <DatabaseSettings settings={settings} onChange={handleChange} />
            )}
            {activeTab === 'advanced' && (
              <AdvancedSettings settings={settings} onChange={handleChange} />
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="secondary" onClick={handleReset}>
            デフォルトに戻す
          </button>
          <div className="spacer" />
          {hasChanges && (
            <span className="changes-indicator">
              未保存の変更があります
            </span>
          )}
          <button className="secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 一般設定
 */
const GeneralSettings: React.FC<{
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onChange }) => {
  return (
    <div className="settings-section">
      <h2>一般設定</h2>

      <div className="setting-group">
        <label className="setting-label">言語</label>
        <select
          value={settings.language}
          onChange={(e) => onChange('language', e.target.value as 'ja' | 'en')}
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
        <small>アプリの表示言語を変更します（再起動が必要）</small>
      </div>

      <div className="setting-group">
        <label className="setting-label">テーマ</label>
        <select
          value={settings.theme}
          onChange={(e) => onChange('theme', e.target.value as any)}
        >
          <option value="light">ライト</option>
          <option value="dark">ダーク</option>
          <option value="system">システム設定に従う</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">起動時の動作</label>
        <select
          value={settings.startupBehavior}
          onChange={(e) => onChange('startupBehavior', e.target.value as any)}
        >
          <option value="normal">通常起動</option>
          <option value="minimized">最小化して起動</option>
          <option value="tray">システムトレイに格納</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.showFileExtensions}
            onChange={(e) => onChange('showFileExtensions', e.target.checked)}
          />
          ファイル拡張子を表示
        </label>
      </div>
    </div>
  );
};

export default SettingsScreen;
export type { AppSettings };