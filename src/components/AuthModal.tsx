import React, { useState } from 'react';
import useAppStore from '../store/appStore';
import { apiLogin, apiRegister, apiUpdateProfile, clearToken, saveToken } from '../api/auth';

type Tab = 'login' | 'register' | 'profile';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { user, setUser } = useAppStore();
  const [tab, setTab]     = useState<Tab>(user ? 'profile' : 'login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form
  const [regUser,   setRegUser]   = useState('');
  const [regPass,   setRegPass]   = useState('');
  const [regNick,   setRegNick]   = useState('');
  const [regIntro,  setRegIntro]  = useState('');

  // Profile form
  const [profNick,  setProfNick]  = useState(user?.nickname   ?? '');
  const [profIntro, setProfIntro] = useState(user?.self_intro ?? '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user: u } = await apiLogin(loginUser, loginPass);
      saveToken(token);
      setUser(u);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user: u } = await apiRegister(regUser, regPass, regNick, regIntro);
      saveToken(token);
      setUser(u);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const u = await apiUpdateProfile(profNick, profIntro);
      setUser(u);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    onClose();
  };

  const switchTab = (t: Tab) => { setTab(t); setError(''); };

  return (
    <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={onClose} aria-label="關閉">✕</button>

        {/* 分頁標籤 */}
        {!user ? (
          <div className="auth-tabs">
            <button className={tab === 'login'    ? 'active' : ''} onClick={() => switchTab('login')}>登入</button>
            <button className={tab === 'register' ? 'active' : ''} onClick={() => switchTab('register')}>註冊</button>
          </div>
        ) : (
          <div className="auth-user-header">
            <span className="auth-user-nick">{user.nickname}</span>
            <span className="auth-user-sub">@{user.username}</span>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && <div className="auth-error">{error}</div>}

        {/* 登入表單 */}
        {tab === 'login' && !user && (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>帳號
              <input value={loginUser} onChange={e => setLoginUser(e.target.value)}
                placeholder="請輸入帳號" autoComplete="username" required />
            </label>
            <label>密碼
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                placeholder="請輸入密碼" autoComplete="current-password" required />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? '登入中…' : '登入'}
            </button>
            <p className="auth-hint">未登入也可以以訪客身份使用，AI 會將你視為訪客。</p>
          </form>
        )}

        {/* 註冊表單 */}
        {tab === 'register' && !user && (
          <form className="auth-form" onSubmit={handleRegister}>
            <label>帳號
              <input value={regUser} onChange={e => setRegUser(e.target.value)}
                placeholder="至少 3 個字元" autoComplete="username" required />
            </label>
            <label>密碼
              <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)}
                placeholder="至少 6 個字元" autoComplete="new-password" required />
            </label>
            <label>
              暱稱 <span className="auth-field-hint">（AI 用來稱呼你的名字）</span>
              <input value={regNick} onChange={e => setRegNick(e.target.value)}
                placeholder="例如：小明、Yuki…" required />
            </label>
            <label>
              自我介紹 <span className="auth-field-hint">（讓 AI 更了解你，可留空）</span>
              <textarea value={regIntro} onChange={e => setRegIntro(e.target.value)}
                placeholder="例如：我是一個喜歡貓咪的工程師…" rows={3} />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? '建立中…' : '建立帳號'}
            </button>
          </form>
        )}

        {/* 個人資料（已登入） */}
        {user && (
          <form className="auth-form" onSubmit={handleUpdateProfile}>
            <label>
              暱稱 <span className="auth-field-hint">（AI 用來稱呼你的名字）</span>
              <input value={profNick} onChange={e => setProfNick(e.target.value)} required />
            </label>
            <label>
              自我介紹 <span className="auth-field-hint">（讓 AI 更了解你）</span>
              <textarea value={profIntro} onChange={e => setProfIntro(e.target.value)} rows={3} />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? '儲存中…' : '儲存變更'}
            </button>
            <button type="button" className="auth-btn-logout" onClick={handleLogout}>登出</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
