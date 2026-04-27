import { useCallback, useRef } from 'react';
import useAppStore from '../store/appStore';
import { runAgentLoop, type AgentMessage } from '../agent/agentLoop';
import * as api from '../api/client';
import CONFIG from '../config';
import type { Live2DController } from '../live2d/Live2DController';
import type { AudioPlayer } from '../audio/AudioPlayer';

// Helper: split text at sentence-ending punctuation (min 5 chars per chunk)
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  for (const ch of text) {
    current += ch;
    if (/[。！？!?]/.test(ch) && current.trim().length >= 5) {
      sentences.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) sentences.push(current.trim());
  return sentences;
}

// Strip characters that break TTS: parenthetical notes, emoji, decorative symbols
function cleanTextForTTS(text: string): string {
  return text
    .replace(/[（(][^）)]{0,20}[）)]/g, '')
    .replace(/[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]/g, '')
    .replace(/[～~＊*_#『』「」《》〈〉【】〔〕…]+/g, '')
    .trim();
}

interface UseChatOptions {
  live2dRef: React.MutableRefObject<Live2DController | null>;
  audioRef:  React.MutableRefObject<AudioPlayer | null>;
  agentHistoryRef: React.MutableRefObject<AgentMessage[]>;
  onAIMessageStart: () => { appendText: (t: string) => Promise<void>; addExtras: (d?: string, c?: string) => void };
}

export function useChat({ live2dRef, audioRef, agentHistoryRef, onAIMessageStart }: UseChatOptions) {
  const store = useAppStore();
  // Keep a stable ref to avoid stale closure issues in sendMessage
  const storeRef = useRef(store);
  storeRef.current = store;

  const sendMessage = useCallback(async (text: string, images: string[]) => {
    const s = storeRef.current;
    if (!text.trim() || s.isSending) return;

    s.setIsSending(true);
    s.setConnState('busy');
    audioRef.current?.warmup();

    try {
      // ── Phase 1: Agent loop (with tool calling) ─────────────────
      s.setThinkText(`${s.currentCharacterName}思考中…`);
      s.setStatusText('思考中…');

      const clientInfo = await api.getClientInfo('2.0.0', s.currentCharacterKey);
      const { content: finalMessage, messages: updatedHistory } = await runAgentLoop(
        text,
        agentHistoryRef.current,
        s.currentCharacterKey,
        clientInfo,
        (toolMsg) => {
          storeRef.current.setThinkText(toolMsg);
          storeRef.current.setStatusText(toolMsg);
        },
        images.length ? images : undefined,
        storeRef.current.user,
      );

      agentHistoryRef.current = updatedHistory;

      // ── Phase 2: Live2D + TTS generation per sentence ────────────
      s.setThinkText('生成動作和語音…');
      s.setStatusText('生成動作和語音…');

      const sentences = splitIntoSentences(finalMessage);
      let allSentenceData: Array<[any, string | null]>;

      const prepareSentence = async (sentence: string): Promise<[any, string | null]> => {
        const live2dP = api.sendLive2d(sentence)
          .catch(e => { console.warn('[Live2D] 動作生成失敗:', e); return { live2d: [] }; });

        const currentStore = storeRef.current;
        let audioP: Promise<string | null> = Promise.resolve(null);
        if (!currentStore.voiceMuted) {
          audioP = (async () => {
            let ttsSource = sentence;
            if (currentStore.voiceLang === 'Japanese') {
              ttsSource = await api.translateText(sentence).catch(() => sentence);
            }
            const cleaned = cleanTextForTTS(ttsSource);
            if (!cleaned) return null;
            return api.fetchTTSAudio(cleaned, currentStore.currentCharacterKey, currentStore.voiceLang)
              .catch(e => { console.warn('[TTS] 語音產生失敗:', e); return null; });
          })();
        }

        return Promise.all([live2dP, audioP]) as Promise<[any, string | null]>;
      };

      if (CONFIG.PARALLEL_SENTENCE_GENERATION) {
        allSentenceData = await Promise.all(sentences.map(prepareSentence));
      } else {
        allSentenceData = [];
        for (const sentence of sentences) allSentenceData.push(await prepareSentence(sentence));
      }

      // ── Phase 3: Render — typewriter + live2d + audio in sync ────
      storeRef.current.setIsSending(false);
      storeRef.current.setStatusText('就緒');
      storeRef.current.setConnState('online');

      const { appendText, addExtras } = onAIMessageStart();

      for (let i = 0; i < sentences.length; i++) {
        const [live2dResult, audioUrl] = allSentenceData[i];
        const steps = live2dResult?.live2d ?? [];
        if (steps.length) live2dRef.current?.applyLive2D(steps);

        await Promise.all([
          appendText(sentences[i]),
          audioRef.current?.playAndWait(audioUrl, storeRef.current.voiceMuted) ?? Promise.resolve(),
        ]);
      }

      addExtras(undefined, undefined);  // no doc/code from agent path for now

      // Keep rolling history (max MAX_HISTORY entries)
      const now = new Date();
      const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const ts   = now.toLocaleString(navigator.language || 'en-US', { timeZone: tz });
      const newHistory = [...storeRef.current.history, {
        user:          text,
        images,
        characterKey:  storeRef.current.currentCharacterKey,
        characterName: storeRef.current.currentCharacterName,
        character:     `message: ${finalMessage}\nTime: ${ts}`,
      }];
      if (newHistory.length > CONFIG.MAX_HISTORY) newHistory.shift();
      storeRef.current.setHistory(newHistory);

    } catch (err) {
      console.error('[Chat] 請求失敗:', err);
      storeRef.current.setConnState('offline');
      throw err;
    } finally {
      storeRef.current.setIsSending(false);
    }
  }, [live2dRef, audioRef, agentHistoryRef, onAIMessageStart]);

  return { sendMessage };
}
