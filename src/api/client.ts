import CONFIG from '../config';
import type { ChatData, CharacterInfo, Live2DData } from '../types';

// Collects browser/OS/device info sent with every chat request
// so the character's backend can tailor its response to the user's environment.
export async function getClientInfo(version: string, characterKey: string) {
  const ua = navigator.userAgent;
  const v = (re: RegExp) => { const m = ua.match(re); return m ? m[1].replace(/_/g, '.') : ''; };

  let os = 'Unknown', osVersion = '', deviceType = 'desktop', deviceModel = '';
  let hePlatformVersion = '', heModel = '';

  // User-Agent Client Hints (Chrome/Edge only) — gives more accurate platform data
  if ((navigator as any).userAgentData?.getHighEntropyValues) {
    try {
      const he = await (navigator as any).userAgentData.getHighEntropyValues(
        ['platformVersion', 'model', 'platform']
      );
      hePlatformVersion = he.platformVersion || '';
      heModel = he.model || '';
    } catch (_) {}
  }

  if (/iPhone|iPad|iPod/.test(ua)) {
    os = /iPad/.test(ua) ? 'iPadOS' : 'iOS';
    osVersion = v(/Version\/([\d.]+)/) || v(/OS (\d+[._]\d+[._]?\d*)/);
    deviceType = /iPad/.test(ua) ? 'tablet' : 'mobile';
    const dm = ua.match(/(iPhone|iPad|iPod)[\d,]*/);
    if (dm) deviceModel = dm[0];
  } else if (/Android/.test(ua)) {
    os = 'Android';
    osVersion = hePlatformVersion || v(/Android ([\d.]+)/);
    deviceType = /\bTV\b|Android TV|BRAVIA|SHIELD|AFT/.test(ua) ? 'tv'
               : /Mobile/.test(ua) ? 'mobile' : 'tablet';
    const bm = ua.match(/;\s*([^;)]+)\s+Build\//);
    deviceModel = heModel || (bm ? bm[1].trim() : '');
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS'; osVersion = hePlatformVersion || v(/Mac OS X (\d+[._]\d+[._]?\d*)/);
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
    if (hePlatformVersion) {
      const major = parseInt(hePlatformVersion.split('.')[0], 10);
      osVersion = (major >= 13 ? '11' : '10') + ` (${hePlatformVersion})`;
    } else {
      const nt = v(/Windows NT ([\d.]+)/);
      const ntMap: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
      osVersion = ntMap[nt] || nt;
    }
  } else if (/CrOS/.test(ua)) {
    os = 'ChromeOS'; osVersion = hePlatformVersion || v(/CrOS \S+ ([\d.]+)/);
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  let browser = 'Unknown', browserVersion = '';
  if      (/SamsungBrowser/.test(ua)) { browser = 'Samsung Browser'; browserVersion = v(/SamsungBrowser\/([\d.]+)/); }
  else if (/OPR\/|Opera\//.test(ua))  { browser = 'Opera';           browserVersion = v(/(?:OPR|Opera)\/([\d.]+)/); }
  else if (/Edg\//.test(ua))          { browser = 'Edge';            browserVersion = v(/Edg\/([\d.]+)/); }
  else if (/FxiOS\//.test(ua))        { browser = 'Firefox';         browserVersion = v(/FxiOS\/([\d.]+)/); }
  else if (/Firefox\//.test(ua))      { browser = 'Firefox';         browserVersion = v(/Firefox\/([\d.]+)/); }
  else if (/CriOS\//.test(ua))        { browser = 'Chrome';          browserVersion = v(/CriOS\/([\d.]+)/); }
  else if (/Chrome\//.test(ua))       { browser = 'Chrome';          browserVersion = v(/Chrome\/([\d.]+)/); }
  else if (/Version\/.*Safari/.test(ua)) { browser = 'Safari';       browserVersion = v(/Version\/([\d.]+)/); }

  const isApp = /YamatoApp|wv|WebView/.test(ua) || (navigator as any).standalone === true;
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const locale = navigator.language || 'en-US';
  const offsetMin = now.getTimezoneOffset();
  const offsetH = Math.floor(Math.abs(offsetMin) / 60);
  const offsetM = Math.abs(offsetMin) % 60;
  const utcOffset = `UTC${offsetMin <= 0 ? '+' : '-'}${String(offsetH).padStart(2,'0')}:${String(offsetM).padStart(2,'0')}`;

  const info: Record<string, string> = {
    version,
    os: osVersion ? `${os} ${osVersion}` : os,
    browser: browserVersion ? `${browser} ${browserVersion}` : browser,
    device_type: deviceType,
    platform: isApp ? 'app' : 'web',
    timezone: tz,
    utc_offset: utcOffset,
    locale,
    local_time: now.toLocaleString(locale, { timeZone: tz }),
  };
  if (deviceModel) info.device_model = deviceModel;

  // suppress unused parameter warning — characterKey may be used in future
  void characterKey;

  return info;
}

// ── Public API functions ──────────────────────────────────────────

export async function fetchModelUrl(): Promise<string> {
  const res = await fetch(CONFIG.CONFIG_ENDPOINT);
  if (!res.ok) throw new Error(`live2d_config HTTP ${res.status}`);
  const json = await res.json();
  return json.model_url ?? '';
}

export async function fetchCharacterInfo(): Promise<CharacterInfo> {
  const res = await fetch(CONFIG.CHAR_INFO_ENDPOINT);
  if (!res.ok) throw new Error(`characterInfo HTTP ${res.status}`);
  const json = await res.json();
  return json.data as CharacterInfo;
}

export async function sendFast(
  message: string,
  sessionId: string,
  characterKey: string,
  history: unknown[] | null
): Promise<ChatData> {
  const clientInfo = await getClientInfo('2.0.0', characterKey);
  const body: Record<string, unknown> = { message, session_id: sessionId, characterKey, client_info: clientInfo };
  if (history?.length) body.history = history;

  const res = await fetch(CONFIG.FAST_API_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message ?? `HTTP ${res.status}`); }
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message ?? '未知錯誤');
  return json.data as ChatData;
}

export async function sendDeep(
  message: string,
  sessionId: string,
  characterKey: string,
  history: unknown[] | null,
  images: string[] | null
): Promise<ChatData> {
  const clientInfo = await getClientInfo('2.0.0', characterKey);
  const body: Record<string, unknown> = { message, session_id: sessionId, characterKey, client_info: clientInfo };
  if (history?.length) body.history = history;
  if (images?.length) body.images = images;

  const res = await fetch(CONFIG.DEEP_API_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message ?? `HTTP ${res.status}`); }
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message ?? '未知錯誤');
  return json.data as ChatData;
}

export async function sendLive2d(message: string): Promise<Live2DData> {
  const res = await fetch(CONFIG.LIVE2D_API_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message ?? `HTTP ${res.status}`); }
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message ?? '未知錯誤');
  return json.data as Live2DData;
}

export async function translateText(text: string): Promise<string> {
  const res = await fetch('/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, target: 'ja' }),
  });
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const data = await res.json();
  return data.translated as string;
}

export async function fetchTTSAudio(text: string, characterKey: string, voiceLang: 'Japanese' | 'Chinese'): Promise<string> {
  const res = await fetch('/generateAudio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, characterKey, langCode: voiceLang }),
  });
  if (!res.ok) throw new Error(`generateAudio HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
