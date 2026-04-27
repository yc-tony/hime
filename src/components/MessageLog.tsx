import { useRef, useImperativeHandle, forwardRef } from 'react';

// Shape exposed to parent via ref
export interface MessageLogHandle {
  appendUser: (text: string, images: string[]) => void;
  startAIMessage: () => {
    appendText: (text: string) => Promise<void>;
    addExtras: (doc?: string, code?: string) => void;
    setAudioUrl: (url: string, onReplay: (url: string) => void) => void;
  };
  appendError: (text: string) => void;
}

// Typewriter speed (chars/sec)
const TYPING_SPEED = 35;

function now(): string {
  return new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

// Build a collapsible document/code block element
function buildCollapsibleBlock(
  wrapClass: string, icon: string, title: string, contentEl: HTMLElement, defaultOpen = true
): HTMLElement {
  const wrap    = document.createElement('div');
  wrap.className = wrapClass;

  const header = document.createElement('div');
  header.className = `${wrapClass}-header`;

  const btn = document.createElement('button');
  btn.className = `${wrapClass}-toggle`;
  btn.textContent = defaultOpen ? '收合 ▴' : '展開 ▾';

  const contentWrap = document.createElement('div');
  contentWrap.className = `${wrapClass}-content`;
  contentWrap.style.display = defaultOpen ? 'block' : 'none';
  contentWrap.appendChild(contentEl);

  btn.addEventListener('click', () => {
    const open = contentWrap.style.display !== 'none';
    contentWrap.style.display = open ? 'none' : 'block';
    btn.textContent = open ? '展開 ▾' : '收合 ▴';
  });

  header.innerHTML = `<span>${icon}</span><span>${title}</span>`;
  header.appendChild(btn);
  wrap.appendChild(header);
  wrap.appendChild(contentWrap);
  return wrap;
}

// Typewriter into a DOM element, returns promise resolving when complete
function typewriteInto(el: HTMLElement, text: string, speed = TYPING_SPEED): Promise<void> {
  return new Promise(resolve => {
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    el.appendChild(cursor);

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        const ch = text[i++];
        el.insertBefore(ch === '\n' ? document.createElement('br') : document.createTextNode(ch), cursor);
        el.closest('#msg-log')?.scrollTo(0, el.closest('#msg-log')!.scrollHeight);
      } else {
        clearInterval(interval);
        cursor.remove();
        resolve();
      }
    }, 1000 / speed);
  });
}

// Main chat message list component
const MessageLog = forwardRef<MessageLogHandle>((_, ref) => {
  const logRef = useRef<HTMLDivElement>(null);
  const charNameRef = useRef<string>('AI');

  // Allow parent to read/set current character name for message headers
  useImperativeHandle(ref, () => ({
    setCharName(name: string) { charNameRef.current = name; },

    appendUser(text: string, images: string[]) {
      const log = logRef.current!;
      const block = document.createElement('div');
      block.className = 'msg-block';

      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.innerHTML = `<span class="msg-speaker user-speaker">❯ 我</span><span class="msg-time">${now()}</span>`;

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble user-bubble';
      bubble.textContent = text;

      if (images.length > 0) {
        const imgRow = document.createElement('div');
        imgRow.className = 'msg-images';
        images.forEach(src => {
          const img = document.createElement('img');
          img.className = 'msg-image'; img.src = src; img.alt = '上傳圖片';
          imgRow.appendChild(img);
        });
        bubble.appendChild(imgRow);
      }

      block.appendChild(meta);
      block.appendChild(bubble);
      log.appendChild(block);
      log.scrollTop = log.scrollHeight;
    },

    startAIMessage() {
      const log = logRef.current!;
      const block = document.createElement('div');
      block.className = 'msg-block';

      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.innerHTML = `
        <span class="msg-speaker ai-speaker">◈ ${charNameRef.current}</span>
        <span class="msg-time">${now()}</span>
      `;

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble ai-bubble';

      block.appendChild(meta);
      block.appendChild(bubble);
      log.appendChild(block);
      log.scrollTop = log.scrollHeight;

      return {
        // Typewrite a sentence chunk into the bubble
        appendText: (text: string) => typewriteInto(bubble, text),

        // Append replay button to meta after audio URL is known
        setAudioUrl(url: string, onReplay: (u: string) => void) {
          const btn = document.createElement('button');
          btn.className = 'msg-replay-btn'; btn.title = '重播語音';
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
          btn.addEventListener('click', () => onReplay(url));
          meta.appendChild(btn);
        },

        // Append document/code collapsible blocks after all sentences are done
        addExtras(doc?: string, code?: string) {
          if (doc?.trim()) {
            const contentEl = document.createElement('div');
            contentEl.className = 'doc-block-content-inner';
            if (typeof (window as any).marked !== 'undefined') {
              (window as any).marked.setOptions({ breaks: true, gfm: true });
              contentEl.innerHTML = (window as any).marked.parse(doc);
            } else {
              const pre = document.createElement('pre'); pre.textContent = doc;
              contentEl.appendChild(pre);
            }
            block.appendChild(buildCollapsibleBlock('doc-block', '📄', '說明文件', contentEl, true));
            log.scrollTop = log.scrollHeight;
          }
          if (code?.trim()) {
            const pre = document.createElement('pre');
            pre.className = 'code-content'; pre.textContent = code;
            block.appendChild(buildCollapsibleBlock('code-block', '💻', '程式碼', pre, true));
            log.scrollTop = log.scrollHeight;
          }
        },
      };
    },

    appendError(text: string) {
      const log = logRef.current!;
      const block = document.createElement('div');
      block.className = 'msg-block';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble ai-bubble';
      bubble.textContent = text;
      block.appendChild(bubble);
      log.appendChild(block);
      log.scrollTop = log.scrollHeight;
    },
  } as any));

  return <div id="msg-log" ref={logRef} />;
});

MessageLog.displayName = 'MessageLog';
export default MessageLog;
