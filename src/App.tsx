import React, { useEffect, useRef, useState, useCallback } from 'react';
import useAppStore from './store/appStore';
import { Live2DController } from './live2d/Live2DController';
import { AudioPlayer } from './audio/AudioPlayer';
import * as api from './api/client';
import { useChat } from './hooks/useChat';
import type { AgentMessage } from './agent/agentLoop';
import { apiGetMe } from './api/auth';

import StatusBar    from './components/StatusBar';
import Live2DPanel  from './components/Live2DPanel';
import MessageLog, { type MessageLogHandle } from './components/MessageLog';
import ThinkingRow  from './components/ThinkingRow';
import ImageStrip   from './components/ImageStrip';
import InputBar     from './components/InputBar';
import GameFooter   from './components/GameFooter';
import AuthModal    from './components/AuthModal';

const App: React.FC = () => {
  const store = useAppStore();

  // Imperative refs for objects that must outlive renders
  const live2dRef  = useRef<Live2DController | null>(null);
  const audioRef   = useRef<AudioPlayer | null>(null);
  const msgLogRef  = useRef<MessageLogHandle | null>(null);
  const agentHistoryRef = useRef<AgentMessage[]>([]);

  const [characterList, setCharacterList] = useState<Array<{ name: string; key: string; model_url: string }>>([]);
  const [isHorizontal, setIsHorizontal]   = useState(false);
  const [showAuth, setShowAuth]           = useState(false);

  // Stable callback: gives useChat an imperative handle to the MessageLog
  const onAIMessageStart = useCallback(() => {
    const handle = msgLogRef.current!.startAIMessage();
    return {
      appendText: handle.appendText,
      addExtras:  handle.addExtras,
    };
  }, []);

  const { sendMessage } = useChat({ live2dRef, audioRef, agentHistoryRef, onAIMessageStart });

  // 啟動時嘗試從 localStorage 還原登入狀態
  useEffect(() => {
    (async () => {
      try {
        const u = await apiGetMe();
        if (u) {
          console.log('[App] Restored user from token:', u.nickname);
          store.setUser(u);
        } else {
          console.log('[App] No valid token found');
        }
      } catch (err) {
        console.error('[App] Failed to restore user:', err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Init on mount: load character info + Live2D model
  useEffect(() => {
    (async () => {
      store.setStatusText('載入設定中…');
      try {
        const [modelUrl, charInfo] = await Promise.all([
          api.fetchModelUrl(),
          api.fetchCharacterInfo(),
        ]);

        if (charInfo) {
          store.setCurrentCharacter(charInfo.name, charInfo.key);
          const list = charInfo.characterList ?? [
            { name: charInfo.name, key: charInfo.key, model_url: '' },
          ];
          setCharacterList(list);
        }

        // Init Live2D controller after DOM is ready
        live2dRef.current = new Live2DController('l2d-canvas', 'l2d-placeholder');
        live2dRef.current.onExpressionChange = (name) => store.setCurrentExpr(name);
        await live2dRef.current.init(modelUrl);
        live2dRef.current.refreshLayout();
        store.setLive2dLoaded(true);

        // Init audio player
        const audioEl = document.getElementById('voice-audio') as HTMLAudioElement;
        audioRef.current = new AudioPlayer(audioEl);
        audioRef.current.lipSync.bind(live2dRef.current);

      } catch (err) {
        console.warn('[Init] 初始化失敗:', err);
      }

      // Restore layout preference
      const saved = localStorage.getItem('layout-mode');
      if (saved === 'horizontal') setIsHorizontal(true);

      store.setStatusText('就緒');
      store.setConnState('online');
    })();

    return () => {
      live2dRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync character name to MessageLog imperative ref
  useEffect(() => {
    (msgLogRef.current as any)?.setCharName?.(store.currentCharacterName);
  }, [store.currentCharacterName]);

  const handleSend = async (text: string, images: string[]) => {
    // Show user message immediately
    msgLogRef.current?.appendUser(text, images);
    try {
      await sendMessage(text, images);
    } catch (err) {
      msgLogRef.current?.appendError(`⚠ 系統錯誤：${(err as Error).message}`);
    }
  };

  const handleCharacterChange = async (key: string, name: string) => {
    if (key === store.currentCharacterKey) return;

    // Stop any playing audio first
    audioRef.current?.stop();

    // Build cross-character context summary from rolling history
    // so the new character knows what was previously discussed
    const prevHistory = store.history;
    if (prevHistory.length > 0) {
      const contextLines = prevHistory.map(h => {
        const charLabel = h.characterName || h.characterKey || 'AI';
        const msgText   = h.character.replace(/\nTime:.*/, '').replace(/^message: /, '');
        return `用戶：${h.user}\n${charLabel}：${msgText}`;
      });
      const contextMsg = [
        `【角色切換】`,
        `你現在是「${name}」，接手與用戶的對話。`,
        `以下是先前其他角色和用戶的對話記錄，供你參考：`,
        ...contextLines,
        `請以「${name}」的身份繼續對話。`,
      ].join('\n');
      agentHistoryRef.current = [{ role: 'user', content: contextMsg }];
    } else {
      agentHistoryRef.current = [];
    }

    // Update store (triggers re-render with new character name)
    store.setCurrentCharacter(name, key);

    // Reload Live2D model for new character
    const charEntry = characterList.find(c => c.key === key);
    const modelUrl  = charEntry?.model_url ?? '';
    if (modelUrl && live2dRef.current) {
      store.setLive2dLoaded(false);
      store.setStatusText(`載入 ${name} 的模型…`);
      try {
        await live2dRef.current.init(modelUrl);
        live2dRef.current.refreshLayout();
        store.setLive2dLoaded(true);
      } catch (err) {
        console.warn('[CharSwitch] Live2D 重載失敗:', err);
      }
      store.setStatusText('就緒');
    }
  };

  const handleLayoutToggle = () => {
    const next = !isHorizontal;
    setIsHorizontal(next);
    localStorage.setItem('layout-mode', next ? 'horizontal' : 'overlay');
    live2dRef.current?.refreshLayout();
  };

  const handleAudioToggle = () => {
    const next = !store.voiceMuted;
    store.setVoiceMuted(next);
    if (next) audioRef.current?.stop();
  };

  const handleLangToggle = () => {
    store.setVoiceLang(store.voiceLang === 'Japanese' ? 'Chinese' : 'Japanese');
  };

  return (
    <div id="game-root" className={isHorizontal ? 'layout-horizontal' : ''}>
      <StatusBar
        characterList={characterList}
        onCharacterChange={handleCharacterChange}
        onLayoutToggle={handleLayoutToggle}
        isHorizontal={isHorizontal}
        onAuthClick={() => setShowAuth(true)}
      />

      <div id="main-layout">
        <Live2DPanel />

        <div id="dialogue-panel">
          <MessageLog ref={msgLogRef} />
          <ThinkingRow />
          <ImageStrip />
          <InputBar onSend={handleSend} />
        </div>
      </div>

      <GameFooter onAudioToggle={handleAudioToggle} onLangToggle={handleLangToggle} />

      {/* Hidden audio element for TTS playback */}
      <audio id="voice-audio" style={{ display: 'none' }} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default App;
