import { completeProducts } from './120-products-complete';

const API_BASE = 'http://localhost:3000';

async function generateImage(prompt: string, filename: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, filename }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ ${filename}`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${filename}: ${error.message}`);
    return false;
  }
}

async function generateFirst20() {
  console.log('开始生成前20个产品图片...\n');

  const first20Products = completeProducts.slice(0, 20);

  let successCount = 0;
  for (let i = 0; i < first20Products.length; i++) {
    const product = first20Products[i];
    console.log(`[${i + 1}/20] ${product.name}`);

    const success = await generateImage(product.prompt, product.filename);
    if (success) successCount++;

    // 延迟2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ 完成！成功生成 ${successCount}/20 张图片`);
}

generateFirst20().catch(console.error);
