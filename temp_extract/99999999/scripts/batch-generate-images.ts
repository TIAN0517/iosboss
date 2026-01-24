import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const images = [
  'gas-stove-2-burner.png',
  'gas-stove-3-burner.png',
  'gas-stove-4-burner.png',
  'gas-stove-1-burner.png',
  'water-heater-instant.png',
  'water-heater-storage.png',
  'water-heater-gas-8l.png',
  'water-heater-gas-10l.png',
  'gas-cylinder-20kg.png',
  'gas-cylinder-16kg.png',
  'gas-cylinder-12kg.png',
  'gas-cylinder-8kg.png',
  'gas-hose.png',
  'gas-regulator.png',
  'gas-valve.png',
  'water-heater-valve.png'
];

async function generateAllImages() {
  console.log('Starting batch image generation...\n');

  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    // Skip if already exists
    if (fs.existsSync(`./public/products/${image}`)) {
      console.log(`[${i + 1}/${images.length}] ⏭️  Skipping ${image} (already exists)`);
      continue;
    }

    console.log(`[${i + 1}/${images.length}] 🔄 Generating ${image}...`);

    try {
      await execAsync(`bun run scripts/generate-single-image.ts ${image}`);
    } catch (error) {
      console.error(`Failed to generate ${image}, continuing...`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Batch image generation complete!');
}

generateAllImages().catch(console.error);
