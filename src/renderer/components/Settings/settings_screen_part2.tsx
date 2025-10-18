// renderer/components/Settings/SettingsTabs.tsx
import React from 'react';
import { AppSettings } from './SettingsScreen';

/**
 * プライバシー設定タブ
 */
export const PrivacySettings: React.FC<{
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onChange }) => {
  return (
    <div className="settings-section">
      <h2>プライバシー設定</h2>

      {/* 認証 */}
      <h3>認証</h3>
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enableStartupAuth}
            onChange={(e) => onChange('enableStartupAuth', e.target.checked)}
          />
          起動時にパスワード要求
        </label>
      </div>

      <div className="setting-group">
        <label className="setting-label">自動ロック</label>
        <select
          value={settings.autoLockMinutes}
          onChange={(e) => onChange('autoLockMinutes', parseInt(e.target.value))}
        >
          <option value="0">無効</option>
          <option value="5">5分後</option>
          <option value="10">10分後</option>
          <option value="30">30分後</option>
          <option value="60">60分後</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.lockOnMinimize}
            onChange={(e) => onChange('lockOnMinimize', e.target.checked)}
          />
          最小化時に自動ロック
        </label>
      </div>

      {/* ボスキー */}
      <h3>緊急非表示（ボスキー）</h3>
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enableBossKey}
            onChange={(e) => onChange('enableBossKey', e.target.checked)}
          />
          ボスキー機能を有効化
        </label>
      </div>

      {settings.enableBossKey && (
        <>
          <div className="setting-group">
            <label className="setting-label">ショートカットキー</label>
            <input
              type="text"
              value={settings.bossKeyShortcut}
              onChange={(e) => onChange('bossKeyShortcut', e.target.value)}
              readOnly
            />
            <button className="secondary">変更</button>
          </div>

          <div className="setting-group">
            <label className="setting-label">カバー画面</label>
            <select
              value={settings.coverScreenType}
              onChange={(e) => onChange('coverScreenType', e.target.value as any)}
            >
              <option value="excel">Excel風（四半期レポート）</option>
              <option value="vscode">VSCode風（プログラミング）</option>
              <option value="browser">ブラウザ風（ニュースサイト）</option>
              <option value="explorer">エクスプローラー風</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.muteOnBossKey}
                onChange={(e) => onChange('muteOnBossKey', e.target.checked)}
              />
              音声を自動ミュート
            </label>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.clearHistoryOnBossKey}
                onChange={(e) => onChange('clearHistoryOnBossKey', e.target.checked)}
              />
              履歴をクリア
            </label>
          </div>
        </>
      )}

      {/* 隠しタグ */}
      <h3>隠しタグ</h3>
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enableHiddenTags}
            onChange={(e) => onChange('enableHiddenTags', e.target.checked)}
          />
          隠しタグ機能を有効化
        </label>
      </div>

      {settings.enableHiddenTags && (
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.requireAuthForHiddenTags}
              onChange={(e) => onChange('requireAuthForHiddenTags', e.target.checked)}
            />
            表示切替時にパスワード要求
          </label>
        </div>
      )}
    </div>
  );
};

/**
 * 表示設定タブ
 */
export const DisplaySettings: React.FC<{
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onChange }) => {
  return (
    <div className="settings-section">
      <h2>表示設定</h2>

      <div className="setting-group">
        <label className="setting-label">グリッドサイズ</label>
        <select
          value={settings.gridSize}
          onChange={(e) => onChange('gridSize', e.target.value as any)}
        >
          <option value="small">小（4列）</option>
          <option value="medium">中（3列）</option>
          <option value="large">大（2列）</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">デフォルト表示モード</label>
        <select
          value={settings.defaultViewMode}
          onChange={(e) => onChange('defaultViewMode', e.target.value as any)}
        >
          <option value="grid">グリッド表示</option>
          <option value="list">リスト表示</option>
          <option value="detail">詳細表示</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">サムネイル品質</label>
        <select
          value={settings.thumbnailQuality}
          onChange={(e) => onChange('thumbnailQuality', e.target.value as any)}
        >
          <option value="low">低（高速）</option>
          <option value="medium">中（標準）</option>
          <option value="high">高（高品質）</option>
        </select>
        <small>品質を下げると読み込みが速くなります</small>
      </div>
    </div>
  );
};

/**
 * パフォーマンス設定タブ
 */
export const PerformanceSettings: React.FC<{
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onChange }) => {
  return (
    <div className="settings-section">
      <h2>パフォーマンス設定</h2>

      <div className="setting-group">
        <label className="setting-label">
          キャッシュ最大サイズ: {settings.maxCacheSize} MB
        </label>
        <input
          type="range"
          min="256"
          max="4096"
          step="256"
          value={settings.maxCacheSize}
          onChange={(e) => onChange('maxCacheSize', parseInt(e.target.value))}
        />
        <small>サムネイルとアーカイブ展開のキャッシュサイズ</small>
      </div>

      <div className="setting-group">
        <label className="setting-label">
          プリロードページ数: {settings.preloadPageCount}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={settings.preloadPageCount}
          onChange={(e) => onChange('preloadPageCount', parseInt(e.target.value))}
        />
        <small>ビューワーで事前に読み込むページ数</small>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.hardwareAcceleration}
            onChange={(e) => onChange('hardwareAcceleration', e.target.checked)}
          />
          ハードウェアアクセラレーションを使用
        </label>
        <small>GPUを使用して描画を高速化します（再起動が必要）</small>
      </div>

      <div className="info-box">
        <span>ℹ️</span>
        <div>
          <strong>キャッシュクリア</strong>
          <p>キャッシュをクリアすると空き容量が増えますが、次回読み込み時に再生成が必要になります。</p>
          <button className="secondary">今すぐクリア</button>
        </div>
      </div>
    </div>
  );
};

/**
 * データベース設定タブ
 */
export const DatabaseSettings: React.FC<{
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onChange }) => {
  const [dbSize, setDbSize] = React.useState<string>('計算中...');
  const [lastBackup, setLastBackup] = React.useState<string>('なし');

  React.useEffect(() => {
    // データベースサイズ取得
    window.electronAPI.getDatabaseSize().then(size => {
      setDbSize(`${(size / 1024 / 1024).toFixed(2)} MB`);
    });

    // 最終バックアップ日時取得
    window.electronAPI.getLastBackupDate().then(date => {
      if (date) {
        setLastBackup(new Date(date).toLocaleString('ja-JP'));
      }
    });
  }, []);

  const handleBackupNow = async () => {
    try {
      await window.electronAPI.backupDatabase();
      alert('バックアップが完了しました');
    } catch (error) {
      alert('バックアップに失敗しました');
    }
  };

  const handleOptimize = async () => {
    try {
      await window.electronAPI.optimizeDatabase();
      alert('最適化が完了しました');
    } catch (error) {
      alert('最適化に失敗しました');
    }
  };

  return (
    <div className="settings-section">
      <h2>データベース設定</h2>

      <div className="info-panel">
        <div className="info-item">
          <span className="info-label">データベースサイズ</span>
          <span className="info-value">{dbSize}</span>
        </div>
        <div className="info-item">
          <span className="info-label">最終バックアップ</span>
          <span className="info-value">{lastBackup}</span>
        </div>
      </div>

      <h3>自動バックアップ</h3>
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoBackup}
            onChange={(e) => onChange('autoBackup', e.target.checked)}
          />
          自動バックアップを有効化
        </label>
      </div>

      {settings.autoBackup && (
        <>
          <div className="setting-group">
            <label className="setting-label">バックアップ間隔</label>
            <select
              value={settings.backupInterval}
              onChange={(e) => onChange('backupInterval', parseInt(e.target.value))}
            >
              <option value="1">毎日</option>
              <option value="3">3日ごと</option>
              <option value="7">毎週</option>
              <option value="14">2週間ごと</option>
              <option value="30">毎月</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label">
              保持するバックアップ数: {settings.maxBackupCount}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.maxBackupCount}
              onChange={(e) => onChange('maxBackupCount', parseInt(e.target.value))}
            />
          </div>
        </>
      )}

      <h3>メンテナンス</h3>
      <div className="button-group">
        <button className="secondary" onClick={handleBackupNow}>
          今すぐバックアップ
        </button>
        <button className="secondary" onClick={handleOptimize}>
          データベースを最適化
        </button>
      </div>

      <div className="warning-box">
        <span>⚠️</span>
        <div>
          <strong>データベースのリセット</strong>
          <p>すべてのデータが削除されます。この操作は取り消せません。</p>
          <button className="danger">データベースをリセット</button>
        </div>
      </div>
    </div>
  );
};

/**
 * 詳細設定タブ
 */
export const AdvancedSettings: React.FC<{
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onChange }) => {
  const [appVersion, setAppVersion] = React.useState<string>('');
  const [electronVersion, setElectronVersion] = React.useState<string>('');

  React.useEffect(() => {
    window.electronAPI.getAppVersion().then(setAppVersion);
    window.electronAPI.getElectronVersion().then(setElectronVersion);
  }, []);

  const handleExportSettings = async () => {
    try {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: 'gentle-viewer-settings.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!result.canceled && result.filePath) {
        await window.electronAPI.exportSettings(result.filePath);
        alert('設定をエクスポートしました');
      }
    } catch (error) {
      alert('エクスポートに失敗しました');
    }
  };

  const handleImportSettings = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        await window.electronAPI.importSettings(result.filePaths[0]);
        alert('設定をインポートしました。再起動してください。');
      }
    } catch (error) {
      alert('インポートに失敗しました');
    }
  };

  const handleOpenDataFolder = () => {
    window.electronAPI.openDataFolder();
  };

  const handleOpenLogFolder = () => {
    window.electronAPI.openLogFolder();
  };

  return (
    <div className="settings-section">
      <h2>詳細設定</h2>

      <h3>バージョン情報</h3>
      <div className="info-panel">
        <div className="info-item">
          <span className="info-label">Gentle Viewer</span>
          <span className="info-value">{appVersion}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Electron</span>
          <span className="info-value">{electronVersion}</span>
        </div>
      </div>

      <h3>設定のインポート・エクスポート</h3>
      <div className="button-group">
        <button className="secondary" onClick={handleExportSettings}>
          設定をエクスポート
        </button>
        <button className="secondary" onClick={handleImportSettings}>
          設定をインポート
        </button>
      </div>

      <h3>フォルダを開く</h3>
      <div className="button-group">
        <button className="secondary" onClick={handleOpenDataFolder}>
          データフォルダ
        </button>
        <button className="secondary" onClick={handleOpenLogFolder}>
          ログフォルダ
        </button>
      </div>

      <h3>使用統計</h3>
      <div className="setting-group">
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked={false} />
          匿名の使用統計を送信
        </label>
        <small>アプリ改善のため、匿名の使用統計を送信します</small>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked={true} />
          クラッシュレポートを送信
        </label>
        <small>エラー発生時、診断情報を送信します</small>
      </div>

      <h3>開発者向け</h3>
      <div className="button-group">
        <button className="secondary" onClick={() => window.electronAPI.openDevTools()}>
          開発者ツールを開く
        </button>
        <button className="secondary" onClick={() => window.electronAPI.reloadApp()}>
          アプリを再読み込み
        </button>
      </div>
    </div>
  );
};