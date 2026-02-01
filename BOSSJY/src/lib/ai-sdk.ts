import ZAI from 'z-ai-web-dev-sdk'

// Create ZAI client instance
let zaiClient: any = null

async function getZaiClient() {
  if (!zaiClient) {
    // ZAI.create() will load config from .z-ai-config file
    // or we can pass config directly
    try {
      zaiClient = await ZAI.create()
    } catch (error) {
      console.error('Failed to create ZAI client:', error)
      // Fallback: try to create with environment variables
      const config = {
        baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai',
        apiKey: process.env.ZAI_API_KEY || '',
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
      }
      zaiClient = new ZAI(config)
    }
  }
  return zaiClient
}

// LLM (Large Language Model)
export const llm = {
  chat: {
    completions: {
      create: async (options: any) => {
        const client = await getZaiClient()
        return client.chat.completions.create(options)
      },
    },
  },
}

// VLM (Vision Language Model) - for image understanding
export const vlm = {
  chat: {
    completions: {
      create: async (options: any) => {
        const client = await getZaiClient()
        return client.chat.completions.createVision(options)
      },
    },
  },
}

// Web Search
export const search = {
  search: async (query: string) => {
    const client = await getZaiClient()
    return client.functions.invoke('web_search', { query })
  },
}

// Web Reader
export const webReader = {
  extract: async (url: string) => {
    const client = await getZaiClient()
    return client.functions.invoke('web_reader', { url })
  },
}
