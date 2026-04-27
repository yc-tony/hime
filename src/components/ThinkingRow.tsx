import React from 'react';
import useAppStore from '../store/appStore';

// Pulsing indicator shown while the agent/API is working
const ThinkingRow: React.FC = () => {
  const { isSending, thinkText } = useAppStore();

  return (
    <div id="thinking-row" className={isSending ? '' : 'hidden'}>
      <span className="thinking-dots">
        <span /><span /><span />
      </span>
      <span id="think-text">{thinkText}</span>
    </div>
  );
};

export default ThinkingRow;
