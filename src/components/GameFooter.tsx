import React from 'react';
import useAppStore from '../store/appStore';

interface GameFooterProps {
  onAudioToggle: () => void;
  onLangToggle: () => void;
}

// Bottom bar: status text, char count (unused here — shown in InputBar), audio controls
const GameFooter: React.FC<GameFooterProps> = ({ onAudioToggle, onLangToggle }) => {
  const { statusText, connState, voiceMuted, voiceLang } = useAppStore();

  return (
    <div id="game-footer">
      <div id="status-left">
        <span id="conn-dot" className={`conn-dot ${connState}`} />
        <span id="status-text">{statusText}</span>
      </div>
      <div id="audio-ctrl">
        <button id="audio-toggle" aria-label="切換語音" onClick={onAudioToggle}>
          {voiceMuted ? '🔇' : '🔊'}
        </button>
        <button id="lang-toggle" aria-label="切換語言" onClick={onLangToggle}>
          {voiceLang === 'Japanese' ? '日' : '中'}
        </button>
      </div>
    </div>
  );
};

export default GameFooter;
