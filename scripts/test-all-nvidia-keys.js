const NVIDIA_API_KEYS = [
  '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',
  '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',
  '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',
];
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

async function testSingleKey(key, index) {
  console.log(`\n🔑 測試 Key #${index + 1}...`);

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    });

    if (response.ok) {
      const models = await response.json();
      console.log(`✅ Key #${index + 1} 有效！`);
      console.log(`   可用模型數量：${models.data.length}`);
      return { valid: true, key, modelCount: models.data.length };
    } else {
      console.log(`❌ Key #${index + 1} 失效！`);
      console.log(`   狀態碼：${response.status}`);
      const error = await response.text();
      console.log(`   錯誤：${error.substring(0, 100)}...`);
      return { valid: false, key, error: response.status };
    }
  } catch (error) {
    console.log(`❌ Key #${index + 1} 測試失敗：`, error.message);
    return { valid: false, key, error: error.message };
  }
}

async function testChatWithKey(key, index) {
  console.log(`\n💬 測試 Key #${index + 1} 對話功能...`);

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'minimaxai/minimax-m2.1',
        messages: [
          {
            role: 'system',
            content: '你是一個專業的瓦斯行客服AI助手。所有輸出必須使用繁體中文。',
          },
          {
            role: 'user',
            content: '請用一句話說明九九瓦斯行的服務。',
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices[0]?.message?.content;
      console.log(`✅ Key #${index + 1} 對話成功！`);
      console.log(`   回應：${reply}`);
      console.log(`   Token 使用：${data.usage?.total_tokens}`);
      return { valid: true, key, reply: reply };
    } else {
      console.log(`❌ Key #${index + 1} 對話失敗！`);
      console.log(`   狀態碼：${response.status}`);
      return { valid: false, key, error: response.status };
    }
  } catch (error) {
    console.log(`❌ Key #${index + 1} 對話測試失敗：`, error.message);
    return { valid: false, key, error: error.message };
  }
}

async function testAllKeys() {
  console.log('🧪 測試所有 NVIDIA API Key\n');
  console.log(`總共有 ${NVIDIA_API_KEYS.length} 個 API Key\n`);

  const results = [];

  for (let i = 0; i < NVIDIA_API_KEYS.length; i++) {
    const key = NVIDIA_API_KEYS[i];
    const result = await testSingleKey(key, i);
    results.push(result);

    if (result.valid) {
      const chatResult = await testChatWithKey(key, i);
      results.push(chatResult);
    }
  }

  console.log('\n📊 測試結果總結：');
  console.log('====================');

  const validKeys = results.filter(r => r.valid).length;
  const invalidKeys = results.filter(r => !r.valid).length;

  console.log(`✅ 有效 Key：${validKeys} / ${NVIDIA_API_KEYS.length}`);
  console.log(`❌ 無效 Key：${invalidKeys} / ${NVIDIA_API_KEYS.length}`);

  if (validKeys === NVIDIA_API_KEYS.length) {
    console.log('\n🎉 所有 API Key 都可以正常使用！');
    console.log('💡 已配置負載平衡，系統會自動輪換使用這些 Key。');
  } else {
    console.log('\n⚠️ 部分無效 Key，請檢查配置。');
  }

  return { validKeys, invalidKeys, total: NVIDIA_API_KEYS.length };
}

testAllKeys();
