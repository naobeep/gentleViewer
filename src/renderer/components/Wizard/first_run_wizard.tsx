// renderer/components/Wizard/FirstRunWizard.tsx
import React, { useState } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface FirstRunWizardProps {
  isOpen: boolean;
  onComplete: (settings: WizardSettings) => void;
}

interface WizardSettings {
  masterPassword?: string;
  enableStartupAuth: boolean;
  enableBossKey: boolean;
  bossKeyShortcut: string;
  coverScreenType: 'excel' | 'vscode' | 'browser' | 'explorer' | 'custom';
  enableHiddenTags: boolean;
  language: 'ja' | 'en';
}

/**
 * 初回起動ウィザード
 */
const FirstRunWizard: React.FC<FirstRunWizardProps> = ({
  isOpen,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<WizardSettings>({
    enableStartupAuth: false,
    enableBossKey: false,
    bossKeyShortcut: 'Ctrl+Shift+B',
    coverScreenType: 'excel',
    enableHiddenTags: false,
    language: 'ja',
  });

  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Gentle Viewerへようこそ',
      description: '初期設定を行います',
    },
    {
      id: 'password',
      title: 'マスターパスワード設定',
      description: 'データを保護するためのパスワードを設定します',
    },
    {
      id: 'privacy',
      title: 'プライバシー設定',
      description: 'セキュリティ機能を設定します',
    },
    {
      id: 'boss-key',
      title: 'ボスキー設定',
      description: '緊急非表示機能を設定します',
    },
    {
      id: 'complete',
      title: '設定完了',
      description: '準備ができました',
    },
  ];

  const handleNext = () => {
    // パスワード確認
    if (currentStep === 1 && settings.masterPassword) {
      if (settings.masterPassword !== passwordConfirm) {
        setPasswordError('パスワードが一致しません');
        return;
      }
      if (settings.masterPassword.length < 8) {
        setPasswordError('パスワードは8文字以上で設定してください');
        return;
      }
    }

    setPasswordError('');
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(settings);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // パスワード設定をスキップ
    setSettings(prev => ({ ...prev, masterPassword: undefined }));
    setCurrentStep(2);
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <PasswordStep
            password={settings.masterPassword || ''}
            passwordConfirm={passwordConfirm}
            error={passwordError}
            onPasswordChange={(value) =>
              setSettings(prev => ({ ...prev, masterPassword: value }))
            }
            onConfirmChange={setPasswordConfirm}
          />
        );
      case 2:
        return (
          <PrivacyStep
            enableStartupAuth={settings.enableStartupAuth}
            enableBossKey={settings.enableBossKey}
            enableHiddenTags={settings.enableHiddenTags}
            onChange={(key, value) =>
              setSettings(prev => ({ ...prev, [key]: value }))
            }
          />
        );
      case 3:
        return (
          <BossKeyStep
            enabled={settings.enableBossKey}
            shortcut={settings.bossKeyShortcut}
            coverScreenType={settings.coverScreenType}
            onChange={(key, value) =>
              setSettings(prev => ({ ...prev, [key]: value }))
            }
          />
        );
      case 4:
        return <CompleteStep />;
      default:
        return null;
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        {/* ヘッダー */}
        <div className="wizard-header">
          <h1>初期設定</h1>
          <div className="wizard-progress">
            ステップ {currentStep + 1} / {steps.length}
          </div>
        </div>

        {/* ステップインジケーター */}
        <div className="wizard-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`wizard-step ${
                index === currentStep
                  ? 'active'
                  : index < currentStep
                  ? 'completed'
                  : ''
              }`}
            >
              <div className="step-number">
                {index < currentStep ? '✓' : index + 1}
              </div>
              <div className="step-label">{step.title}</div>
            </div>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="wizard-content">
          <h2>{steps[currentStep].title}</h2>
          <p className="wizard-description">
            {steps[currentStep].description}
          </p>
          {renderStepContent()}
        </div>

        {/* フッター */}
        <div className="wizard-footer">
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <button className="secondary" onClick={handleBack}>
              戻る
            </button>
          )}

          {currentStep === 1 && (
            <button className="secondary" onClick={handleSkip}>
              スキップ
            </button>
          )}

          <div className="spacer" />

          <button className="primary" onClick={handleNext}>
            {currentStep === steps.length - 1 ? '完了' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ウェルカムステップ
 */
const WelcomeStep: React.FC = () => {
  return (
    <div className="welcome-step">
      <div className="welcome-icon">🎩</div>
      <h3>Gentle Viewerをご利用いただき、ありがとうございます</h3>
      <p>
        このウィザードでは、アプリを快適に利用するための
        <br />
        初期設定を行います。
      </p>
      <ul className="feature-list">
        <li>✓ タグベースのファイル管理</li>
        <li>✓ 多形式対応の統合ビューワー</li>
        <li>✓ プライバシー保護機能</li>
        <li>✓ 高速検索・フィルタリング</li>
      </ul>
    </div>
  );
};

/**
 * パスワード設定ステップ
 */
const PasswordStep: React.FC<{
  password: string;
  passwordConfirm: string;
  error: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}> = ({ password, passwordConfirm, error, onPasswordChange, onConfirmChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [hint, setHint] = useState('');

  return (
    <div className="password-step">
      <p className="step-info">
        データベースを暗号化するためのマスターパスワードを設定します。
        <br />
        <strong>このパスワードは忘れないように保管してください。</strong>
      </p>

      <div className="input-group">
        <label>パスワード (8文字以上)</label>
        <div className="password-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="パスワードを入力"
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div className="input-group">
        <label>パスワード（確認）</label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={passwordConfirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder="もう一度入力"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="input-group">
        <label>ヒント（オプション）</label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="パスワードのヒント"
        />
        <small>パスワードを思い出すためのヒントです</small>
      </div>

      <div className="info-box">
        <span className="info-icon">ℹ️</span>
        パスワードを設定しない場合は「スキップ」してください。
        後から設定することも可能です。
      </div>
    </div>
  );
};

/**
 * プライバシー設定ステップ
 */
const PrivacyStep: React.FC<{
  enableStartupAuth: boolean;
  enableBossKey: boolean;
  enableHiddenTags: boolean;
  onChange: (key: string, value: boolean) => void;
}> = ({ enableStartupAuth, enableBossKey, enableHiddenTags, onChange }) => {
  return (
    <div className="privacy-step">
      <p className="step-info">
        プライバシー保護機能を設定します。
        <br />
        これらの設定は後から変更できます。
      </p>

      <div className="options-list">
        <label className="option-item">
          <input
            type="checkbox"
            checked={enableStartupAuth}
            onChange={(e) => onChange('enableStartupAuth', e.target.checked)}
          />
          <div className="option-content">
            <strong>起動時にパスワード要求</strong>
            <small>アプリ起動時にパスワード入力が必要になります</small>
          </div>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={enableBossKey}
            onChange={(e) => onChange('enableBossKey', e.target.checked)}
          />
          <div className="option-content">
            <strong>ボスキー機能を有効化</strong>
            <small>
              ショートカットキーで即座に画面を切り替えます
            </small>
          </div>
        </label>

        <label className="option-item">
          <input
            type="checkbox"
            checked={enableHiddenTags}
            onChange={(e) => onChange('enableHiddenTags', e.target.checked)}
          />
          <div className="option-content">
            <strong>隠しタグ機能を有効化</strong>
            <small>特定のタグを非表示にできます</small>
          </div>
        </label>
      </div>
    </div>
  );
};

/**
 * ボスキー設定ステップ
 */
const BossKeyStep: React.FC<{
  enabled: boolean;
  shortcut: string;
  coverScreenType: string;
  onChange: (key: string, value: any) => void;
}> = ({ enabled, shortcut, coverScreenType, onChange }) => {
  if (!enabled) {
    return (
      <div className="boss-key-step">
        <p className="step-info">
          ボスキー機能が無効になっています。
          <br />
          前のステップに戻って有効にしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="boss-key-step">
      <p className="step-info">
        緊急時に使用するカバー画面を選択してください。
      </p>

      <div className="input-group">
        <label>ショートカットキー</label>
        <input
          type="text"
          value={shortcut}
          onChange={(e) => onChange('bossKeyShortcut', e.target.value)}
          readOnly
        />
        <small>クリックしてキーを押すと変更できます</small>
      </div>

      <div className="cover-screen-options">
        <label className="cover-option">
          <input
            type="radio"
            name="coverScreen"
            value="excel"
            checked={coverScreenType === 'excel'}
            onChange={(e) => onChange('coverScreenType', e.target.value)}
          />
          <div className="cover-preview">
            <div className="preview-icon">📊</div>
            <strong>Excel風</strong>
            <small>四半期レポート</small>
          </div>
        </label>

        <label className="cover-option">
          <input
            type="radio"
            name="coverScreen"
            value="vscode"
            checked={coverScreenType === 'vscode'}
            onChange={(e) => onChange('coverScreenType', e.target.value)}
          />
          <div className="cover-preview">
            <div className="preview-icon">💻</div>
            <strong>VSCode風</strong>
            <small>プログラミング</small>
          </div>
        </label>

        <label className="cover-option">
          <input
            type="radio"
            name="coverScreen"
            value="browser"
            checked={coverScreenType === 'browser'}
            onChange={(e) => onChange('coverScreenType', e.target.value)}
          />
          <div className="cover-preview">
            <div className="preview-icon">🌐</div>
            <strong>ブラウザ風</strong>
            <small>ニュースサイト</small>
          </div>
        </label>

        <label className="cover-option">
          <input
            type="radio"
            name="coverScreen"
            value="explorer"
            checked={coverScreenType === 'explorer'}
            onChange={(e) => onChange('coverScreenType', e.target.value)}
          />
          <div className="cover-preview">
            <div className="preview-icon">📁</div>
            <strong>エクスプローラー風</strong>
            <small>ファイル管理</small>
          </div>
        </label>
      </div>
    </div>
  );
};

/**
 * 完了ステップ
 */
const CompleteStep: React.FC = () => {
  return (
    <div className="complete-step">
      <div className="complete-icon">✓</div>
      <h3>設定が完了しました！</h3>
      <p>
        Gentle Viewerを使い始める準備ができました。
        <br />
        ファイルを追加して、タグで整理してみましょう。
      </p>

      <div className="quick-tips">
        <h4>クイックヒント</h4>
        <ul>
          <li>📁 ファイルはドラッグ&ドロップで追加できます</li>
          <li>🏷️ タグは自由に作成・編集できます</li>
          <li>🔍 検索バーから素早くファイルを見つけられます</li>
          <li>⚙️ 設定はいつでも変更できます</li>
        </ul>
      </div>
    </div>
  );
};

export default FirstRunWizard;