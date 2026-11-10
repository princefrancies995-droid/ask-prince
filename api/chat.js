// Prince AI backend: receives chat messages from the website, forwards them to
// the Groq API with your secret key, and streams the answer back as plain text.
// Your API key stays here on the server and is never sent to the browser.

export const config = { runtime: 'edge' };

// Which AI model each mode uses. You can override these in Vercel
// (Settings -> Environment Variables) without touching the code.
const MODELS = {
  quick: process.env.MODEL_FAST || 'llama-3.1-8b-instant',
  default: process.env.MODEL_BALANCED || 'llama-3.3-70b-versatile',
  complex: process.env.MODEL_DEEP || 'openai/gpt-oss-120b',
};

const MAX_MESSAGES = 40;        // only the most recent messages are sent
const MAX_CHARS = 12000;        // per message
const DEFAULT_SYSTEM = 'You are Prince AI, a friendly, knowledgeable and concise AI assistant. Format answers in Markdown.';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Use POST' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return json(500, { error: 'The server is missing GROQ_API_KEY. Add it in Vercel → Settings → Environment Variables, then redeploy.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid request' }); }

  const tier = MODELS[body.tier] ? body.tier : 'default';
  const system = String(body.system || DEFAULT_SYSTEM).slice(0, 4000);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return json(400, { error: 'The last message must be from the user.' });
  }

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODELS[tier],
      messages: [{ role: 'system', content: system }, ...messages],
      stream: true,
      temperature: 0.7,
    }),
    signal: req.signal,
  });

  if (!upstream.ok) {
    let detail = '';
    try { detail = (await upstream.json())?.error?.message || ''; } catch {}
    if (upstream.status === 429) return json(429, { error: 'Prince AI is busy (free usage limit reached). Please wait a minute and try again.' });
    if (upstream.status === 401) return json(500, { error: 'The server API key is invalid. Check GROQ_API_KEY in Vercel.' });
    return json(502, { error: `AI service error (${upstream.status})${detail ? ': ' + detail : ''}` });
  }

  // Convert the provider's event stream into a plain text stream.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const data = t.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch { /* ignore partial or keep-alive lines */ }
          }
        }
      } catch (e) {
        // client disconnected or network error: just end the stream
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
