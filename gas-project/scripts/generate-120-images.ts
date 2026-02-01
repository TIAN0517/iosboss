import { completeProducts } from './120-products-complete';

const API_BASE = 'http://localhost:3000';

async function generateImage(prompt: string, filename: string): Promise<boolean> {
  try {
    console.log(`  🔄 生成: ${filename}`);

    const response = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        filename,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`  ✅ 成功: ${result.imageUrl}`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ 失敗: ${error.message}`);
    return false;
  }
}

async function generateAllImages() {
  console.log('========================================');
  console.log('批量生成 120 張產品圖片');
  console.log('========================================\n');

  let successCount = 0;
  let failCount = 0;
  const total = completeProducts.length;

  // 分批生成，每批10個
  const batchSize = 10;

  for (let i = 0; i < total; i += batchSize) {
    const batch = completeProducts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(`\n=== 批次 ${batchNum}/${totalBatches} ===`);

    for (let j = 0; j < batch.length; j++) {
      const product = batch[j];
      const currentIndex = i + j + 1;

      console.log(`[${currentIndex}/${total}] ${product.name}`);

      const success = await generateImage(product.prompt, product.filename);

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // 延遲避免API限制
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // 批次間稍長延遲
    console.log(`\n批次 ${batchNum} 完成，等待3秒...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n========================================');
  console.log('🎉 圖片生成完成！');
  console.log('========================================');
  console.log(`📊 統計資料：`);
  console.log(`   - 成功: ${successCount} 張`);
  console.log(`   - 失敗: ${failCount} 張`);
  console.log(`   - 總計: ${total} 張`);
  console.log(`   - 成功率: ${((successCount / total) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  console.log('💡 提示：');
  console.log('   - 所有圖片已保存到 /public/products/');
  console.log('   - 圖片URL已自動更新到數據庫');
  console.log('   - 可以在 Preview Panel 查看效果');
  console.log('========================================\n');
}

// 單個生成（測試用）
async function generateSingleImage(filename?: string) {
  if (!filename) {
    console.log('用法: bun run scripts/generate-120-images.ts [filename]');
    console.log('或：bun run scripts/generate-120-images.ts all');
    console.log('\n可用的文件名（前10個）：');
    completeProducts.slice(0, 10).forEach(p => {
      console.log(`  - ${p.filename}`);
    });
    console.log(`\n... 還有 ${completeProducts.length - 10} 個產品`);
    process.exit(0);
  }

  const product = completeProducts.find(p => p.filename === filename);
  if (!product) {
    console.error(`❌ 找不到產品: ${filename}`);
    process.exit(1);
  }

  console.log(`生成單張圖片: ${filename}\n`);
  console.log(`產品: ${product.name}`);
  console.log(`提示詞: ${product.prompt.substring(0, 100)}...\n`);

  await generateImage(product.prompt, product.filename);
  console.log('\n✅ 完成！');
}

// 檢查命令行參數
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === 'all') {
  generateAllImages().catch(console.error);
} else {
  generateSingleImage(args[0]).catch(console.error);
}
