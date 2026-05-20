async function chat({ systemPrompt, messages, apiKey, model }) {
  const modelId = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      temperature: 0.35,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Groq API error (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.quota = res.status === 429 || String(msg).toLowerCase().includes('rate limit');
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return text;
}

module.exports = { chat };
