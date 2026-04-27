import CONFIG from '../config';
import type { AgentStepResponse, ToolCall, UserInfo } from '../types';
import { TOOL_DEFINITIONS, executeTool } from './toolRegistry';

// Content part for multimodal (text + image) user messages
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool';
  // string: plain text; ContentPart[]: multimodal (text + images); null: assistant tool-call turn
  content?: string | ContentPart[] | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface AgentResult {
  content: string;           // final LLM reply text
  messages: AgentMessage[];  // full message history after the loop
}

// Single-step call to the LLM — returns either tool_calls or a final message.
// Python backend (hime_api.py /hime/agent/step) handles the LLM call;
// tool execution happens here on the client.
// Pass noTools=true to force a plain-text answer (no tool_choice sent to LLM).
async function agentStep(
  messages: AgentMessage[],
  character: string,
  clientInfo: Record<string, string>,
  userInfo?: UserInfo | null,
  noTools = false,
): Promise<AgentStepResponse> {
  const body: Record<string, unknown> = {
    messages,
    tools: noTools ? [] : TOOL_DEFINITIONS,
    character,
    client_info: clientInfo,
  };
  if (userInfo) {
    body.user_info = { nickname: userInfo.nickname, self_intro: userInfo.self_intro };
  }
  const res = await fetch(CONFIG.AGENT_STEP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`agent/step HTTP ${res.status}`);
  return res.json() as Promise<AgentStepResponse>;
}

// Run the full ReAct loop for a single user message.
// onThinking is called each time a tool is invoked so the UI can show progress.
// images: base64 data-URLs or remote URLs to attach to the first user message (triggers VLM).
export async function runAgentLoop(
  userMessage: string,
  history: AgentMessage[],
  character: string,
  clientInfo: Record<string, string>,
  onThinking?: (msg: string) => void,
  images?: string[],
  userInfo?: UserInfo | null,
): Promise<AgentResult> {
  // Build the first user message — attach images if provided (VLM path)
  const firstUserContent: AgentMessage['content'] = images?.length
    ? [
        { type: 'text', text: userMessage },
        ...images.map((url): ContentPart => ({ type: 'image_url', image_url: { url } })),
      ]
    : userMessage;

  const messages: AgentMessage[] = [
    ...history,
    { role: 'user', content: firstUserContent },
  ];

  // Track previously-executed (tool, args) pairs to detect infinite loops.
  // If the model requests the exact same call it already received a result for,
  // bail out immediately rather than waiting for MAX_STEPS.
  const executedCalls = new Set<string>();

  for (let step = 0; step < CONFIG.AGENT_MAX_STEPS; step++) {
    const response = await agentStep(messages, character, clientInfo, userInfo);

    // LLM decided to answer directly
    if (response.type === 'message') {
      return { content: response.content ?? '', messages };
    }

    // LLM wants to call tools
    if (response.type === 'tool_calls' && response.tool_calls?.length) {
      // Detect duplicate tool calls — small models sometimes loop on the same
      // tool even after receiving its result.
      const firstDup = response.tool_calls.find(
        (tc) => executedCalls.has(`${tc.name}:${JSON.stringify(tc.arguments)}`),
      );
      if (firstDup) {
        console.warn(`[Agent] duplicate tool call detected: ${firstDup.name} — forcing final answer`);
        break;
      }

      // Add the assistant's tool-call intent to message history
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: response.tool_calls.map((tc: ToolCall) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      });

      // Execute each tool and add its result to message history
      for (const toolCall of response.tool_calls) {
        onThinking?.(`使用工具：${toolCall.name}…`);
        const result = await executeTool(toolCall);
        executedCalls.add(`${toolCall.name}:${JSON.stringify(toolCall.arguments)}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
      // Continue to next iteration with updated messages
    }
  }

  // Exceeded max steps — force a final answer without tools
  onThinking?.('整理資訊中…');
  const finalResponse = await agentStep(
    [...messages, { role: 'user', content: '（請根據目前資訊直接給出回答）' }],
    character,
    clientInfo,
    userInfo,
    true,  // noTools: prevent the LLM from calling tools again
  );
  return { content: finalResponse.content ?? '', messages };
}
