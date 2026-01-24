import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const outputDir = './public/products';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateImage(prompt: string, filename: string, size = '1024x1024') {
  try {
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt,
      size: size
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, buffer);

    console.log(`✓ Generated: ${filename}`);
    return `/products/${filename}`;
  } catch (error) {
    console.error(`✗ Failed to generate ${filename}:`, error);
    return null;
  }
}

async function main() {
  console.log('Starting product image generation...\n');

  // Gas Stoves
  console.log('Generating gas stove images...');
  const gasStove1 = await generateImage(
    'Professional two-burner gas stove with black glass panel, modern kitchen appliance, white background, high quality product photography',
    'gas-stove-2-burner.png'
  );

  const gasStove2 = await generateImage(
    'Three-burner gas stove with stainless steel surface, modern kitchen appliance, white background, professional product photography',
    'gas-stove-3-burner.png'
  );

  const gasStove3 = await generateImage(
    'Four-burner professional gas stove, commercial kitchen appliance, white background, high quality product photography',
    'gas-stove-4-burner.png'
  );

  const gasStove4 = await generateImage(
    'Compact single-burner gas stove, small kitchen appliance, white background, product photography',
    'gas-stove-1-burner.png'
  );

  // Water Heaters
  console.log('\nGenerating water heater images...');
  const waterHeater1 = await generateImage(
    'Instant electric water heater, wall-mounted, modern white appliance, white background, product photography',
    'water-heater-instant.png'
  );

  const waterHeater2 = await generateImage(
    '40L storage electric water heater, cylindrical tank, white appliance, white background, product photography',
    'water-heater-storage.png'
  );

  const waterHeater3 = await generateImage(
    '8L gas water heater, compact wall-mounted unit, modern appliance, white background, product photography',
    'water-heater-gas-8l.png'
  );

  const waterHeater4 = await generateImage(
    '10L gas water heater, larger capacity unit, modern appliance, white background, product photography',
    'water-heater-gas-10l.png'
  );

  // Gas Cylinders
  console.log('\nGenerating gas cylinder images...');
  const gasCylinder1 = await generateImage(
    '20KG standard gas cylinder, red colored metal tank, professional product photography, white background',
    'gas-cylinder-20kg.png'
  );

  const gasCylinder2 = await generateImage(
    '16KG gas cylinder, red colored metal tank, medium size, white background, product photography',
    'gas-cylinder-16kg.png'
  );

  const gasCylinder3 = await generateImage(
    '12KG gas cylinder, red colored metal tank, smaller size, white background, product photography',
    'gas-cylinder-12kg.png'
  );

  const gasCylinder4 = await generateImage(
    '8KG compact gas cylinder, red colored metal tank, small size, white background, product photography',
    'gas-cylinder-8kg.png'
  );

  // Accessories
  console.log('\nGenerating gas accessory images...');
  const accessory1 = await generateImage(
    '1 meter gas hose pipe, flexible tubing, white background, product photography',
    'gas-hose.png'
  );

  const accessory2 = await generateImage(
    'Gas pressure regulator valve, metallic device, white background, product photography',
    'gas-regulator.png'
  );

  const accessory3 = await generateImage(
    'Gas stove control valve switch, metal knob, white background, product photography',
    'gas-valve.png'
  );

  const accessory4 = await generateImage(
    'Gas shut-off valve for water heater, brass colored, white background, product photography',
    'water-heater-valve.png'
  );

  console.log('\n✅ All product images generated successfully!');
}

main().catch(console.error);
