import { env } from '../config/env';

/** Thin client for Groq's OpenAI-compatible chat API. */
export function groqEnabled(): boolean {
  return Boolean(env.GROQ_API_KEY);
}

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export async function groqChat(messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number } = {}): Promise<string> {
  if (!groqEnabled()) throw Object.assign(new Error('GROQ_API_KEY is not set in backend/.env'), { statusCode: 503 });
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      messages,
      temperature: opts.temperature ?? 0.1,
      // gpt-oss models reason before answering; keep it short and leave room for the answer itself
      ...(env.GROQ_MODEL.includes('gpt-oss') ? { reasoning_effort: 'low', max_completion_tokens: (opts.maxTokens ?? 2048) + 1500 } : { max_tokens: opts.maxTokens ?? 2048 }),
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`Groq request failed (${res.status}): ${body.slice(0, 300)}`), { statusCode: 502 });
  }
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export async function groqJson<T = any>(system: string, user: string, maxTokens = 3000): Promise<T> {
  const text = await groqChat([{ role: 'system', content: system }, { role: 'user', content: user }], { json: true, maxTokens });
  return JSON.parse(text) as T;
}
