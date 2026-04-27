// Logged-in user profile
export interface UserInfo {
  id:         number;
  username:   string;
  nickname:   string;
  self_intro: string;
}

// Live2D step within a sequence returned by /generate_live2d
export interface Live2DStep {
  delay?: number;
  expression?: string;
  motion?: { group: string; index?: number };
  parameters?: Record<string, number>;
}

// Data returned by /chat_fast or /chat_deep
export interface ChatData {
  message: string;
  needs_deep?: boolean;
  typing_speed?: number;
  document?: string;
  code?: string;
}

// Data returned by /generate_live2d
export interface Live2DData {
  live2d: Live2DStep[];
}

// Character entry in the character list
export interface CharacterEntry {
  name:      string;
  key:       string;
  model_url: string;
}

// Full character info from /live2d/characterInfo
export interface CharacterInfo {
  name:           string;
  key:            string;
  characterList?: CharacterEntry[];
}

// History entry for the conversation (kept for display + API context)
export interface HistoryEntry {
  user:          string;
  images:        string[];
  characterKey:  string;   // e.g. "chino"
  characterName: string;   // e.g. "香風智乃"
  character:     string;   // AI 回應文字（含時間戳）
}

// App-wide state (Zustand store)
export interface AppState {
  sessionId: string;
  history: HistoryEntry[];
  isSending: boolean;
  voiceMuted: boolean;
  voiceLang: 'Japanese' | 'Chinese';
  live2dLoaded: boolean;
  currentExpr: string;
  currentCharacterKey: string;
  currentCharacterName: string;
  pendingImages: string[];
  thinkText: string;
  statusText: string;
  connState: 'online' | 'offline' | 'busy';
  user: UserInfo | null;

  // Actions
  setHistory: (h: HistoryEntry[]) => void;
  setIsSending: (v: boolean) => void;
  setVoiceMuted: (v: boolean) => void;
  setVoiceLang: (v: 'Japanese' | 'Chinese') => void;
  setLive2dLoaded: (v: boolean) => void;
  setCurrentExpr: (v: string) => void;
  setCurrentCharacter: (name: string, key: string) => void;
  setPendingImages: (imgs: string[]) => void;
  setThinkText: (t: string) => void;
  setStatusText: (t: string) => void;
  setConnState: (s: 'online' | 'offline' | 'busy') => void;
  setUser: (u: UserInfo | null) => void;
}

// Tool call from LLM agent step
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Response from /hime/agent/step
export interface AgentStepResponse {
  type: 'tool_calls' | 'message';
  tool_calls?: ToolCall[];
  content?: string;
}

// Tool definition for LLM
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}
