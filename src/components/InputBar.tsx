import React, { useRef } from 'react';
import useAppStore from '../store/appStore';

interface InputBarProps {
  onSend: (text: string, images: string[]) => void;
}

// User input area with textarea, image upload, and send button
const InputBar: React.FC<InputBarProps> = ({ onSend }) => {
  const { isSending, pendingImages, setPendingImages } = useAppStore();
  const [text, setText] = React.useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() || isSending) return;
    const images = [...pendingImages];
    setPendingImages([]);
    onSend(text.trim(), images);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize textarea height
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
  };

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    Promise.all(files.map(f => new Promise<string>(res => {
      const reader = new FileReader();
      reader.onload = ev => res(ev.target!.result as string);
      reader.readAsDataURL(f);
    }))).then(urls => setPendingImages([...pendingImages, ...urls]));
    e.target.value = '';
  };

  return (
    <div id="input-area">
      <button
        id="image-btn"
        aria-label="上傳圖片"
        onClick={() => fileInputRef.current?.click()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
      <input
        ref={fileInputRef}
        id="image-input"
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleImagesSelected}
      />

      <textarea
        ref={textareaRef}
        id="user-input"
        placeholder="輸入訊息…"
        maxLength={500}
        rows={1}
        value={text}
        onChange={handleTextChange}
      />

      <button
        id="send-btn"
        aria-label="送出"
        disabled={isSending || !text.trim()}
        onClick={handleSend}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  );
};

export default InputBar;
