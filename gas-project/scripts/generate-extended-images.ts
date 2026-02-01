import { extendedProducts } from './extended-products-data';

const API_BASE = 'http://localhost:3000';

async function generateImage(prompt: string, filename: string) {
  try {
    console.log(`Generating ${filename}...`);

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
    console.log(`  ✓ Success: ${result.imageUrl}`);
    return true;
  } catch (error: any) {
    console.error(`  ✗ Failed: ${error.message}`);
    return false;
  }
}

async function generateAllImages() {
  console.log('========================================');
  console.log('Starting Extended Product Image Generation');
  console.log('========================================\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < extendedProducts.length; i++) {
    const product = extendedProducts[i];
    const total = extendedProducts.length;

    console.log(`[${i + 1}/${total}] ${product.name}`);

    const success = await generateImage(product.prompt, product.filename);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('');
  }

  console.log('========================================');
  console.log('✅ Image Generation Complete!');
  console.log(`   Success: ${successCount} images`);
  console.log(`   Failed: ${failCount} images`);
  console.log('========================================');
}

generateAllImages().catch(console.error);
