// Application-level constants — mirrors the original CONFIG object
const CONFIG = {
  VERSION: '2.0.0',

  // Yamato backend endpoints
  CONFIG_ENDPOINT:   '/live2d_config',
  CHAR_INFO_ENDPOINT: '/live2d/characterInfo',
  FAST_API_ENDPOINT:  '/chat_fast',
  DEEP_API_ENDPOINT:  '/chat_deep',
  LIVE2D_API_ENDPOINT: '/generate_live2d',

  // Hime agent endpoint (served by hime_api.py, not yamato_api.py)
  AGENT_STEP_ENDPOINT: '/hime/agent/step',
  SEARCH_ENDPOINT:     '/hime/search',
  WEATHER_ENDPOINT:    '/hime/weather',
  STOCK_ENDPOINT:      '/hime/stock',

  MAX_HISTORY:    3,
  TYPING_SPEED:   35,   // chars/sec
  AUTO_PLAY_VOICE: true,

  // true = send all sentence requests in parallel (needs more resources)
  // false = sequential (safer for limited hardware)
  PARALLEL_SENTENCE_GENERATION: false,

  // Max ReAct agent loop iterations before forcing a final answer
  AGENT_MAX_STEPS: 5,
} as const;

export default CONFIG;
