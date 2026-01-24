const API_BASE = 'http://localhost:3000';

const images = [
  // Original products
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
  },
  // Extended products
  {
    prompt: 'High quality stainless steel two-burner gas stove, modern kitchen appliance, white background, professional product photography',
    filename: 'gas-stove-ss-2-burner.png'
  },
  {
    prompt: 'Built-in three-burner gas stove with black ceramic glass surface, modern kitchen appliance, white background, product photography',
    filename: 'gas-stove-built-in.png'
  },
  {
    prompt: 'Two-burner gas stove with white ceramic glass panel, modern kitchen appliance, white background, product photography',
    filename: 'gas-stove-ceramic.png'
  },
  {
    prompt: 'Commercial five-burner gas stove, professional kitchen equipment, stainless steel, white background, product photography',
    filename: 'gas-stove-commercial.png'
  },
  {
    prompt: 'Desktop single burner portable gas stove, compact design, white background, product photography',
    filename: 'gas-stove-desktop.png'
  },
  {
    prompt: 'Compact 6L instant electric water heater, wall-mounted, white appliance, white background, product photography',
    filename: 'water-heater-instant-6l.png'
  },
  {
    prompt: '20L storage electric water heater, compact tank, white appliance, white background, product photography',
    filename: 'water-heater-storage-20l.png'
  },
  {
    prompt: '60L large capacity storage electric water heater, tall cylindrical tank, white appliance, white background, product photography',
    filename: 'water-heater-storage-60l.png'
  },
  {
    prompt: 'Solar water heater system with panels and storage tank, eco-friendly energy system, white background, product photography',
    filename: 'solar-water-heater.png'
  },
  {
    prompt: '5KG small portable gas cylinder, red colored metal tank, compact size, white background, product photography',
    filename: 'gas-cylinder-5kg.png'
  },
  {
    prompt: '50KG industrial gas cylinder, large red metal tank, commercial grade, white background, product photography',
    filename: 'gas-cylinder-50kg.png'
  },
  {
    prompt: 'Gas pressure cooker, stainless steel pot with locking lid, cooking appliance, white background, product photography',
    filename: 'gas-pressure-cooker.png'
  },
  {
    prompt: 'Gas steamer pot with multiple tiers, stainless steel cooking appliance, white background, product photography',
    filename: 'gas-steamer.png'
  },
  {
    prompt: 'Gas compatible frying pan with non-stick coating, cookware, white background, product photography',
    filename: 'gas-frying-pan.png'
  },
  {
    prompt: 'Portable gas grill for outdoor cooking, camping equipment, white background, product photography',
    filename: 'gas-grill.png'
  },
  {
    prompt: 'Gas hot pot burner, portable heating element for hot pot dining, white background, product photography',
    filename: 'gas-hotpot.png'
  },
  {
    prompt: 'Outdoor camping gas stove, portable folding design, camping equipment, white background, product photography',
    filename: 'outdoor-gas-stove.png'
  },
  {
    prompt: 'Outdoor gas camping lantern, portable lighting device, camping equipment, white background, product photography',
    filename: 'outdoor-gas-lamp.png'
  },
  {
    prompt: 'Mini portable single burner gas stove, ultralight camping gear, white background, product photography',
    filename: 'mini-portable-stove.png'
  },
  {
    prompt: 'Portable gas heater, winter heating appliance, safety design, white background, product photography',
    filename: 'gas-heater.png'
  },
  {
    prompt: 'Gas leak detector device, safety alarm system, modern electronic device, white background, product photography',
    filename: 'gas-detector.png'
  },
  {
    prompt: 'Gas alarm system with digital display, safety monitoring device, white background, product photography',
    filename: 'gas-alarm.png'
  },
  {
    prompt: 'Emergency gas shut-off valve, safety device, mechanical valve, white background, product photography',
    filename: 'emergency-shut-off.png'
  },
  {
    prompt: 'Gas filter cleaning device, pipeline accessory, metal construction, white background, product photography',
    filename: 'gas-filter.png'
  },
  {
    prompt: 'Brass gas T-shaped fitting connector, plumbing accessory, white background, product photography',
    filename: 'gas-t-fitting.png'
  },
  {
    prompt: 'Gas quick connect coupling mechanism, easy connector device, white background, product photography',
    filename: 'gas-quick-connector.png'
  },
  {
    prompt: 'Gas pipe clamp fitting, stainless steel clamp, plumbing accessory, white background, product photography',
    filename: 'pipe-clamp.png'
  },
  {
    prompt: 'Set of gas sealing gaskets, rubber washers assortment, plumbing accessory, white background, product photography',
    filename: 'gasket-set.png'
  },
  {
    prompt: 'Stove cleaner spray bottle, cleaning product for gas appliances, white background, product photography',
    filename: 'stove-cleaner.png'
  },
  {
    prompt: 'Gas pipe cleaning brush tool, maintenance equipment, white background, product photography',
    filename: 'pipe-cleaner.png'
  },
  {
    prompt: 'Gas appliance repair toolkit, wrenches and tools set, maintenance equipment, white background, product photography',
    filename: 'repair-toolkit.png'
  },
  {
    prompt: 'Adjustable stainless steel stove stand legs, kitchen appliance support, white background, product photography',
    filename: 'stove-stand.png'
  },
  {
    prompt: 'Gas stove wind shield, protective aluminum foil guard, camping accessory, white background, product photography',
    filename: 'wind-shield.png'
  },
  {
    prompt: 'Gas stove piezoelectric igniter, long handle safety lighter, white background, product photography',
    filename: 'igniter.png'
  },
  {
    prompt: 'Digital kitchen timer device, cooking safety gadget, white background, product photography',
    filename: 'kitchen-timer.png'
  }
];

// Get filename from command line arguments
const filename = process.argv[2];

if (!filename) {
  console.log('Usage: bun run scripts/generate-single-image.ts <filename>');
  console.log('\nAvailable images:');
  images.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.filename}`);
  });
  process.exit(1);
}

const imageToGenerate = images.find(img => img.filename === filename);

if (!imageToGenerate) {
  console.error(`Image ${filename} not found!`);
  process.exit(1);
}

async function generateImage() {
  try {
    console.log(`Generating ${imageToGenerate.filename}...`);
    console.log(`Prompt: ${imageToGenerate.prompt.substring(0, 100)}...`);

    const response = await fetch(`${API_BASE}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: imageToGenerate.prompt,
        filename: imageToGenerate.filename,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✓ Generated: ${imageToGenerate.filename}`);
    console.log(`  URL: ${result.imageUrl}`);
  } catch (error: any) {
    console.error(`✗ Failed to generate ${imageToGenerate.filename}:`, error.message);
    process.exit(1);
  }
}

generateImage();
