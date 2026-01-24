import OpenAI from 'openai';

interface AIResponse {
  content: string;
  model: string;
  provider: string;
}

export async function generateAIResponse(
  message: string,
  conversationHistory: any[] = []
): Promise<AIResponse> {
  const providers = [
    { name: 'Ollama', check: checkOllama, call: callOllama },
    { name: 'GLM', check: () => true, call: callGLM },
    { name: 'Kimi', check: () => true, call: callKimi },
    { name: 'Groq', check: () => true, call: callGroq },
  ];

  for (const provider of providers) {
    try {
      if (await provider.check()) {
        console.log(`Using AI provider: ${provider.name}`);
        return await provider.call(message, conversationHistory);
      }
    } catch (error) {
      console.error(`${provider.name} failed:`, error);
      continue;
    }
  }

  throw new Error('All AI providers failed');
}

async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function callOllama(message: string, history: any[]): Promise<AIResponse> {
  const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'dolphin-llama3:latest',
      messages: [...history, { role: 'user', content: message }],
      stream: false,
    }),
  });

  if (!response.ok) throw new Error('Ollama request failed');

  const data = await response.json();
  return {
    content: data.message.content,
    model: process.env.OLLAMA_MODEL || 'dolphin-llama3:latest',
    provider: 'Ollama',
  };
}

async function callGLM(message: string, history: any[]): Promise<AIResponse> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) throw new Error('GLM API key not found');

  const openai = new OpenAI({
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
    apiKey,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.GLM_MODEL || 'glm-4-flash',
    messages: [...history, { role: 'user', content: message }],
  });

  return {
    content: completion.choices[0].message.content || '',
    model: process.env.GLM_MODEL || 'glm-4-flash',
    provider: 'GLM',
  };
}

async function callKimi(message: string, history: any[]): Promise<AIResponse> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) throw new Error('Kimi API key not found');

  const openai = new OpenAI({
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.KIMI_MODEL || 'kimi-k2-thinking-turbo',
    messages: [...history, { role: 'user', content: message }],
  });

  return {
    content: completion.choices[0].message.content || '',
    model: process.env.KIMI_MODEL || 'kimi-k2-thinking-turbo',
    provider: 'Kimi',
  };
}

async function callGroq(message: string, history: any[]): Promise<AIResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not found');

  const openai = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [...history, { role: 'user', content: message }],
  });

  return {
    content: completion.choices[0].message.content || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    provider: 'Groq',
  };
}
