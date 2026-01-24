#!/usr/bin/env node

/**
 * NVIDIA NIM API 測試腳本
 * 驗證 NVIDIA API 連接和功能
 */

import { readFileSync } from 'fs';

// 手動載入 .env 文件
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          if (value && !process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  } catch (err) {
    console.warn('無法載入 .env 文件:', err.message);
  }
}

loadEnv();

const NVIDIA_API_KEYS = process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'minimaxai/minimax-m2.1';

// 解析多個 API Keys
const apiKeys = NVIDIA_API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0);

console.log('='.repeat(60));
console.log('🔍 NVIDIA NIM API 連接測試');
console.log('='.repeat(60));
console.log(`📍 API 端點: ${NVIDIA_BASE_URL}`);
console.log(`🤖 模型: ${NVIDIA_MODEL}`);
console.log(`🔑 API Keys 數量: ${apiKeys.length}`);
console.log('='.repeat(60));
console.log('');

async function testConnection(apiKey, index) {
  console.log(`\n📡 測試 API Key #${index + 1}${index === 0 ? ' (主 Key)' : ''}`);
  console.log('-'.repeat(60));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一個繁體中文 AI 助理，專門協助瓦斯行管理系統。請簡潔回應。'
          },
          {
            role: 'user',
            content: '你好，請用一句話介紹你自己。'
          }
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 100,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`狀態碼: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ 錯誤詳情:', JSON.stringify(error, null, 2));

      if (response.status === 401) {
        console.error('🔑 API Key 無效或已過期');
      } else if (response.status === 429) {
        console.error('⚠️  請求頻率過高或配額用盡');
      }
      return { success: false, error };
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '無回應內容';
    const tokensUsed = data.usage?.total_tokens || 0;

    console.log('✅ 連接成功！');
    console.log(`📝 AI 回應: ${message}`);
    console.log(`📊 Tokens 使用: ${tokensUsed}`);
    console.log(`🎯 模型: ${data.model || NVIDIA_MODEL}`);

    return {
      success: true,
      message,
      tokensUsed,
      model: data.model,
    };

  } catch (error) {
    console.error('❌ 請求失敗:', error.message);

    if (error.name === 'AbortError') {
      console.error('⏱️  請求超時（15秒）');
    }

    return { success: false, error: error.message };
  }
}

async function testStreamingConnection(apiKey) {
  console.log('\n🌊 測試串流響應 (Streaming)');
  console.log('-'.repeat(60));

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一個繁體中文 AI 助理。'
          },
          {
            role: 'user',
            content: '請數到五'
          }
        ],
        temperature: 0.7,
        max_tokens: 50,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`串流請求失敗: ${response.status}`);
    }

    console.log('✅ 串流連接建立成功！');
    console.log('📝 接收數據: ', '');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('\n✅ 串流完成');
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              process.stdout.write(content);
              chunkCount++;
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }

    console.log(`\n📊 共接收 ${chunkCount} 個數據塊`);

    return { success: true, chunkCount };

  } catch (error) {
    console.error(`\n❌ 串流測試失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  if (apiKeys.length === 0) {
    console.error('❌ 錯誤: 未找到 NVIDIA_API_KEYS 或 NVIDIA_API_KEY 環境變量');
    console.error('請在 .env 文件中設置 NVIDIA_API_KEYS');
    process.exit(1);
  }

  let successCount = 0;
  let lastSuccessResult = null;

  // 測試每個 API Key
  for (let i = 0; i < apiKeys.length; i++) {
    const result = await testConnection(apiKeys[i], i);

    if (result.success) {
      successCount++;
      lastSuccessResult = result;

      // 第一個成功的 Key，測試串流
      if (i === 0) {
        await testStreamingConnection(apiKeys[i]);
      }

      // 只測試第一個成功的 Key，除非都失敗
      break;
    }

    // 等待一下再測試下一個 Key
    if (i < apiKeys.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 總結報告
  console.log('\n' + '='.repeat(60));
  console.log('📊 測試總結');
  console.log('='.repeat(60));
  console.log(`✅ 成功連接: ${successCount}/${apiKeys.length} 個 API Keys`);

  if (successCount > 0 && lastSuccessResult) {
    console.log(`🎯 可用模型: ${lastSuccessResult.model}`);
    console.log(`📝 測試回應: ${lastSuccessResult.message}`);
    console.log('\n✅ NVIDIA NIM API 配置正確，可以正常使用！');
  } else {
    console.log('\n❌ 所有 API Keys 都無法使用');
    console.log('請檢查：');
    console.log('  1. API Key 是否正確（從 https://build.nvidia.com 獲取）');
    console.log('  2. 是否有足夠的配額');
    console.log('  3. 網絡連接是否正常');
    process.exit(1);
  }

  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('測試過程發生錯誤:', error);
  process.exit(1);
});
