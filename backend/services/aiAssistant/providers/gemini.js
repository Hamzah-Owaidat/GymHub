const DEFAULT_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
];

function isQuotaError(status, message) {
  const m = String(message || '').toLowerCase();
  return (
    status === 429 ||
    m.includes('quota') ||
    m.includes('rate limit') ||
    m.includes('resource_exhausted') ||
    m.includes('limit: 0')
  );
}

async function chatOnce({ systemPrompt, messages, apiKey, modelId }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1536,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.quota = isQuotaError(res.status, msg);
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function chat({ systemPrompt, messages, apiKey, model }) {
  const envModel = model || process.env.GEMINI_MODEL;
  const models = envModel
    ? [envModel, ...DEFAULT_MODELS.filter((m) => m !== envModel)]
    : DEFAULT_MODELS;

  let lastQuotaErr = null;

  for (const modelId of models) {
    try {
      return await chatOnce({ systemPrompt, messages, apiKey, modelId });
    } catch (err) {
      if (err.quota) {
        lastQuotaErr = err;
        continue;
      }
      throw err;
    }
  }

  const err = lastQuotaErr || new Error('Gemini quota exceeded for all configured models.');
  err.status = 429;
  err.code = 'AI_QUOTA_EXCEEDED';
  throw err;
}

module.exports = { chat };
