import React from 'react';
import useAppStore from '../store/appStore';

interface StatusBarProps {
  characterList: Array<{ name: string; key: string }>;
  onCharacterChange: (key: string, name: string) => void;
  onLayoutToggle: () => void;
  isHorizontal: boolean;
  onAuthClick: () => void;
}

// Top bar: character name, expression badge, layout toggle, character selector
const StatusBar: React.FC<StatusBarProps> = ({
  characterList, onCharacterChange, onLayoutToggle, isHorizontal, onAuthClick,
}) => {
  const { currentCharacterName, currentCharacterKey, currentExpr, user } = useAppStore();
  const [badgeVisible, setBadgeVisible] = React.useState(false);
  const badgeTimerRef = React.useRef<number | undefined>(undefined);

  // Show the expression badge briefly whenever expression changes
  React.useEffect(() => {
    setBadgeVisible(true);
    window.clearTimeout(badgeTimerRef.current);
    badgeTimerRef.current = window.setTimeout(() => setBadgeVisible(false), 3000);
    return () => window.clearTimeout(badgeTimerRef.current);
  }, [currentExpr]);

  return (
    <div id="status-bar">
      <div id="char-name-wrap">
        <span id="char-name">{currentCharacterName}</span>
        <span id="expr-badge" className={badgeVisible ? '' : 'hidden'}>
          <span id="expr-label">{currentExpr}</span>
        </span>
      </div>

      <div id="status-bar-right">
        <button
          id="auth-toggle"
          aria-label={user ? `${user.nickname}（點擊管理帳號）` : '登入 / 註冊'}
          onClick={onAuthClick}
          title={user ? `已登入：${user.nickname}` : '登入 / 註冊'}
        >
          {user ? (
            <span id="auth-nick">{user.nickname}</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          )}
        </button>

        <button
          id="layout-toggle"
          aria-label="切換版面配置"
          onClick={onLayoutToggle}
          title={isHorizontal ? '切換為疊加模式' : '切換為並排模式'}
        >
          {/* Two SVG icons swap visibility via CSS classes */}
          <svg id="layout-icon-horizontal" className={isHorizontal ? 'hidden' : ''} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="8" height="18" rx="1"/><rect x="13" y="3" width="8" height="18" rx="1"/>
          </svg>
          <svg id="layout-icon-overlay" className={isHorizontal ? '' : 'hidden'} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="10" height="10" rx="1"/>
          </svg>
        </button>

        <select
          id="char-select"
          value={currentCharacterKey}
          onChange={e => {
            const opt = e.target.selectedOptions[0];
            onCharacterChange(opt.value, opt.text);
          }}
        >
          {characterList.length === 0
            ? <option disabled>載入中…</option>
            : characterList.map(c => (
                <option key={c.key} value={c.key}>{c.name}</option>
              ))
          }
        </select>
      </div>
    </div>
  );
};

export default StatusBar;
