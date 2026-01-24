const NVIDIA_API_KEY = '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';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

async function testNVIDIA_API() {
  console.log('🧪 測試 NVIDIA NIM API 連接...\n');

  try {
    console.log('📋 測試 1: API 端點可達性...');
    const response = await fetch(`${NVIDIA_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
    });

    if (response.ok) {
      const models = await response.json();
      console.log('✅ API 連接成功！');
      console.log('可用的模型：');
      models.data.forEach((model, index) => {
        console.log(`  ${index + 1}. ${model.id}`);
      });
    } else {
      console.log('❌ API 連接失敗：', response.status, response.statusText);
      const error = await response.text();
      console.log('錯誤詳情：', error);
      return;
    }

    console.log('\n📋 測試 2: GLM-4.7 模型對話...');
    const chatResponse = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'z-ai/glm4.7',
        messages: [
          {
            role: 'system',
            content: '你是一個專業的瓦斯行客服AI助手。所有輸出必須使用繁體中文。',
          },
          {
            role: 'user',
            content: '你好，請介紹一下九九瓦斯行的營業時間和瓦斯價格。',
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ GLM-4.7 模型回應成功！');
      console.log('回應：', chatData.choices[0]?.message?.content);
      console.log('使用的模型：', chatData.model);
      console.log('Token 使用量：', chatData.usage?.total_tokens);
    } else {
      console.log('❌ GLM-4.7 模型調用失敗：', chatResponse.status, chatResponse.statusText);
      const error = await chatResponse.text();
      console.log('錯誤詳情：', error);
    }

    console.log('\n📋 測試 3: MiniMax M2.1 模型對話...');
    const minimaxResponse = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
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
            content: '你好，請介紹一下九九瓦斯行的營業時間和瓦斯價格。',
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (minimaxResponse.ok) {
      const minimaxData = await minimaxResponse.json();
      console.log('✅ MiniMax M2.1 模型回應成功！');
      console.log('回應：', minimaxData.choices[0]?.message?.content);
      console.log('使用的模型：', minimaxData.model);
      console.log('Token 使用量：', minimaxData.usage?.total_tokens);
    } else {
      console.log('❌ MiniMax M2.1 模型調用失敗：', minimaxResponse.status, minimaxResponse.statusText);
      const error = await minimaxResponse.text();
      console.log('錯誤詳情：', error);
    }

    console.log('\n🎉 所有測試完成！');
  } catch (error) {
    console.error('❌ 測試失敗：', error);
  }
}

testNVIDIA_API();
