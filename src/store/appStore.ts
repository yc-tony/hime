import { create } from 'zustand';
import type { AppState, HistoryEntry, UserInfo } from '../types';

const useAppStore = create<AppState>((set) => ({
  sessionId:            'session_' + Date.now(),
  history:              [],
  isSending:            false,
  voiceMuted:           false,
  voiceLang:            'Japanese',
  live2dLoaded:         false,
  currentExpr:          'neutral',
  currentCharacterKey:  '',
  currentCharacterName: '',
  pendingImages:        [],
  thinkText:            '思考中…',
  statusText:           '就緒',
  connState:            'online',
  user:                 null,

  setHistory:          (h: HistoryEntry[]) => set({ history: h }),
  setIsSending:        (v: boolean)        => set({ isSending: v }),
  setVoiceMuted:       (v: boolean)        => set({ voiceMuted: v }),
  setVoiceLang:        (v)                 => set({ voiceLang: v }),
  setLive2dLoaded:     (v: boolean)        => set({ live2dLoaded: v }),
  setCurrentExpr:      (v: string)         => set({ currentExpr: v }),
  setCurrentCharacter: (name, key)         => set({ currentCharacterName: name, currentCharacterKey: key }),
  setPendingImages:    (imgs: string[])    => set({ pendingImages: imgs }),
  setThinkText:        (t: string)         => set({ thinkText: t }),
  setStatusText:       (t: string)         => set({ statusText: t }),
  setConnState:        (s)                 => set({ connState: s }),
  setUser:             (u: UserInfo | null) => set({ user: u }),
}));

export default useAppStore;
