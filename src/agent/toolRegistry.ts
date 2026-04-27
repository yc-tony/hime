import type { ToolDefinition, ToolCall } from '../types';
import { getCurrentTime } from './tools/timeTool';
import { webSearch }      from './tools/searchTool';
import { getWeather }     from './tools/weatherTool';
import { getStock }       from './tools/stockTool';

// Tool schemas sent to the LLM so it knows what tools are available
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_current_time',
    description: '取得目前的日期與時間。當用戶詢問現在幾點、今天幾號時使用。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'web_search',
    description: '使用搜尋引擎查詢最新資訊、新聞、事件。當問題需要即時資訊時使用。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜尋關鍵字或問題' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_weather',
    description: '查詢指定地點的天氣狀況與預報。',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: '地點名稱，例如「台北」「東京」「大阪」' },
      },
      required: ['location'],
    },
  },
  {
    name: 'get_stock',
    description: '查詢股票即時報價與基本資訊。',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代號，例如「AAPL」「2330.TW」「7203.T」' },
      },
      required: ['symbol'],
    },
  },
];

// Execute a tool call returned by the LLM and return the result as a string
export async function executeTool(toolCall: ToolCall): Promise<string> {
  const { name, arguments: args } = toolCall;
  try {
    switch (name) {
      case 'get_current_time': return getCurrentTime();
      case 'web_search':       return await webSearch(args.query as string);
      case 'get_weather':      return await getWeather(args.location as string);
      case 'get_stock':        return await getStock(args.symbol as string);
      default:                 return `[Error] 未知工具：${name}`;
    }
  } catch (err) {
    return `[Tool Error] ${name} 執行失敗：${(err as Error).message}`;
  }
}
