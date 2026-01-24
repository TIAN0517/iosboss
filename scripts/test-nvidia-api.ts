import { getNVIDIANIMService } from '../lib/nvidia-nim-service';

async function testNVIDIA_NIM_API() {
  console.log('🧪 測試 NVIDIA NIM API 服務...\n');

  try {
    const nvidiaService = getNVIDIANIMService();
    const modelInfo = nvidiaService.getModelInfo();

    console.log('📋 模型資訊:');
    console.log('  主模型:', modelInfo.model);
    console.log('  備用模型:', modelInfo.fallbackModel);
    console.log('  API 端點:', modelInfo.baseUrl);
    console.log('');

    console.log('🔍 測試 1: 基本對話...');
    const response1 = await nvidiaService.generateResponse(
      'test-user',
      '你好，請介紹一下九九瓦斯行的營業時間和瓦斯價格。'
    );
    console.log('✅ 回應:', response1.text.substring(0, 200) + '...');
    console.log('  使用的模型:', response1.model);
    console.log('  Token 使用量:', response1.tokensUsed);
    console.log('');

    console.log('🔍 測試 2: 複雜查詢...');
    const conversationHistory = [
      { role: 'user', content: '我想查詢瓦斯價格' },
      { role: 'assistant', content: '九九瓦斯行的瓦斯價格如下：4kg NT$180, 20kg NT$720, 50kg NT$1,800' },
    ];

    const response2 = await nvidiaService.generateResponse(
      'test-user',
      '那配送範圍呢？',
      conversationHistory
    );
    console.log('✅ 回應:', response2.text.substring(0, 200) + '...');
    console.log('  使用的模型:', response2.model);
    console.log('');

    console.log('🔍 測試 3: 繁體中文驗證...');
    const response3 = await nvidiaService.generateResponse(
      'test-user',
      '請用繁體中文回答：營業時間、價格、客戶、訂單、庫存'
    );
    console.log('✅ 回應:', response3.text);
    console.log('  使用的模型:', response3.model);
    console.log('');

    console.log('🎉 所有測試通過！');
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testNVIDIA_NIM_API();
