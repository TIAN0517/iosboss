const API_BASE = 'http://localhost:3000';

const products = [
  // Gas Stoves
  {
    prompt: 'Professional two-burner gas stove with black glass panel, modern kitchen appliance, white background, high quality product photography',
    filename: 'gas-stove-2-burner.png'
  },
  {
    prompt: 'Three-burner gas stove with stainless steel surface, modern kitchen appliance, white background, professional product photography',
    filename: 'gas-stove-3-burner.png'
  },
  {
    prompt: 'Four-burner professional gas stove, commercial kitchen appliance, white background, high quality product photography',
    filename: 'gas-stove-4-burner.png'
  },
  {
    prompt: 'Compact single-burner gas stove, small kitchen appliance, white background, product photography',
    filename: 'gas-stove-1-burner.png'
  },
  // Water Heaters
  {
    prompt: 'Instant electric water heater, wall-mounted, modern white appliance, white background, product photography',
    filename: 'water-heater-instant.png'
  },
  {
    prompt: '40L storage electric water heater, cylindrical tank, white appliance, white background, product photography',
    filename: 'water-heater-storage.png'
  },
  {
    prompt: '8L gas water heater, compact wall-mounted unit, modern appliance, white background, product photography',
    filename: 'water-heater-gas-8l.png'
  },
  {
    prompt: '10L gas water heater, larger capacity unit, modern appliance, white background, product photography',
    filename: 'water-heater-gas-10l.png'
  },
  // Gas Cylinders
  {
    prompt: '20KG standard gas cylinder, red colored metal tank, professional product photography, white background',
    filename: 'gas-cylinder-20kg.png'
  },
  {
    prompt: '16KG gas cylinder, red colored metal tank, medium size, white background, product photography',
    filename: 'gas-cylinder-16kg.png'
  },
  {
    prompt: '12KG gas cylinder, red colored metal tank, smaller size, white background, product photography',
    filename: 'gas-cylinder-12kg.png'
  },
  {
    prompt: '8KG compact gas cylinder, red colored metal tank, small size, white background, product photography',
    filename: 'gas-cylinder-8kg.png'
  },
  // Accessories
  {
    prompt: '1 meter gas hose pipe, flexible tubing, white background, product photography',
    filename: 'gas-hose.png'
  },
  {
    prompt: 'Gas pressure regulator valve, metallic device, white background, product photography',
    filename: 'gas-regulator.png'
  },
  {
    prompt: 'Gas stove control valve switch, metal knob, white background, product photography',
    filename: 'gas-valve.png'
  },
  {
    prompt: 'Gas shut-off valve for water heater, brass colored, white background, product photography',
    filename: 'water-heater-valve.png'
  }
];

async function generateImage(product: { prompt: string; filename: string }) {
  try {
    const response = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: product.prompt,
        filename: product.filename,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✓ Generated: ${product.filename}`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to generate ${product.filename}:`, error);
    return null;
  }
}

async function generateAllImages() {
  console.log('Starting product image generation...\n');

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}] Generating: ${product.filename}...`);

    await generateImage(product);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ All product images generated!');
}

generateAllImages().catch(console.error);
