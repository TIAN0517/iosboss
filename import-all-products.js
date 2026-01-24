const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const db = new PrismaClient();

// 產品類別映射
const categoryMap = {
  // 瓦斯桶
  'gas-cylinder': '瓦斯桶',
  'aluminum-gas-cylinder': '瓦斯桶',
  'composite-gas-cylinder': '瓦斯桶',
  'pro-gas-cylinder': '瓦斯桶',
  'mini-gas-canister': '瓦斯桶',

  // 瓦斯爐
  'gas-stove': '瓦斯爐',
  'cartridge-stove': '瓦斯爐',
  'double-handle-wok': '瓦斯爐',

  // 熱水器
  'water-heater': '熱水器',
  'instant-gas-water-heater': '熱水器',
  'commercial-water-heater': '熱水器',
  'compact-water-heater': '熱水器',
  'constant-temp-water-heater': '熱水器',
  'quick-heat-water-heater': '熱水器',
  'smart-water-heater': '熱水器',
  'solar-water-heater': '熱水器',
  'heat-pump-water-heater': '熱水器',

  // 瓦斯配件
  'gas-regulator': '瓦斯配件',
  'gas-hose': '瓦斯配件',
  'gas-valve': '瓦斯配件',
  'gas-filter': '瓦斯配件',
  'gas-quick-connector': '瓦斯配件',
  'gas-t-fitting': '瓦斯配件',
  'gas-leak': '瓦斯配件',

  // 管路配件
  'pipe': '管路配件',
  'hose': '管路配件',
  'high-pressure-pipe': '管路配件',
  'l-elbow-fitting': '管路配件',
  'threaded-fitting': '管路配件',
  '4-way-fitting': '管路配件',

  // 烹調用具
  'gas-frying-pan': '烹調用具',
  'gas-pressure-cooker': '烹調用具',
  'chinese-wok': '烹調用具',
  'non-stick-wok': '烹調用具',
  'cast-iron-pan': '烹調用具',
  'gas-steamer': '烹調用具',
  'gas-grill': '烹調用具',
  'gas-hotpot': '烹調用具',
  'double-side': '烹調用具',

  // 戶外用品
  'outdoor-gas': '戶外用品',
  'portable-fire-pit': '戶外用品',
  'gas-string-lights': '戶外用品',
  'outdoor-gas-lamp': '戶外用品',
  'camping': '戶外用品',
  'bbq': '戶外用品',

  // 廚房用品
  'kitchen': '廚房用品',
  'measuring': '廚房用品',
  'food': '廚房用品',
  'oil': '廚房用品',
  'storage': '廚房用品',
  'spice': '廚房用品',

  // 安全用品
  'gas-alarm': '安全用品',
  'gas-detector': '安全用品',
  'smoke-alarm': '安全用品',
  'co-detector': '安全用品',
  'fire': '安全用品',
  'emergency': '安全用品',

  // 工具配件
  'repair-toolkit': '工具配件',
  'igniter': '工具配件',
  'pipe-wrench': '工具配件',
  'cleaning': '工具配件',
  'stove-': '工具配件',
  'gasket': '工具配件',
  'wind-shield': '工具配件',

  // 其他
  'gas-heater': '瓦斯暖爐',
  'multi-cooker': '多功能鍋',
  'range-hood': '排油煙機',
  'gas-tank-stand': '瓦斯桶架',
  'gas-meter': '瓦斯表',
};

// 產品名稱映射
const productNameMap = {
  'gas-cylinder-5kg': { name: '5公斤桶裝瓦斯', price: 280, code: 'GAS-5KG' },
  'gas-cylinder-8kg': { name: '8公斤桶裝瓦斯', price: 420, code: 'GAS-8KG' },
  'gas-cylinder-12kg': { name: '12公斤桶裝瓦斯', price: 630, code: 'GAS-12KG' },
  'gas-cylinder-16kg': { name: '16公斤桶裝瓦斯', price: 750, code: 'GAS-16KG' },
  'gas-cylinder-20kg': { name: '20公斤桶裝瓦斯', price: 880, code: 'GAS-20KG' },
  'gas-cylinder-50kg': { name: '50公斤商用瓦斯', price: 2100, code: 'GAS-50KG' },
  'aluminum-gas-cylinder': { name: '鋁合金瓦斯桶', price: 1500, code: 'AL-TANK' },
  'composite-gas-cylinder': { name: '複合材質瓦斯桶', price: 1200, code: 'COMP-TANK' },
  'pro-gas-cylinder': { name: '專業級瓦斯桶', price: 1800, code: 'PRO-TANK' },
  'mini-gas-canister': { name: '卡式瓦斯罐', price: 150, code: 'CARTRIDGE' },

  'gas-stove-1-burner': { name: '單口瓦斯爐', price: 1200, code: 'STOVE-1' },
  'gas-stove-2-burner': { name: '雙口瓦斯爐', price: 2500, code: 'STOVE-2' },
  'gas-stove-3-burner': { name: '三口瓦斯爐', price: 4500, code: 'STOVE-3' },
  'gas-stove-4-burner': { name: '四口瓦斯爐', price: 6800, code: 'STOVE-4' },
  'gas-stove-built-in': { name: '內嵌式瓦斯爐', price: 8500, code: 'STOVE-BUILTIN' },
  'gas-stove-ceramic': { name: '陶瓷瓦斯爐', price: 5200, code: 'STOVE-CERAMIC' },
  'gas-stove-commercial': { name: '商用瓦斯爐', price: 15000, code: 'STOVE-COMM' },
  'gas-stove-desktop': { name: '桌上型瓦斯爐', price: 1800, code: 'STOVE-DESK' },
  'gas-stove-double-side': { name: '雙面瓦斯爐', price: 9800, code: 'STOVE-DBL' },
  'gas-stove-explosion-proof': { name: '防爆瓦斯爐', price: 7500, code: 'STOVE-EXP' },
  'gas-stove-infrared': { name: '紅外線瓦斯爐', price: 4200, code: 'STOVE-IR' },
  'gas-stove-luxury': { name: '豪華瓦斯爐', price: 12000, code: 'STOVE-LUX' },
  'gas-stove-simple': { name: '簡易瓦斯爐', price: 950, code: 'STOVE-SIMPLE' },
  'gas-stove-smart': { name: '智慧瓦斯爐', price: 15000, code: 'STOVE-SMART' },
  'gas-stove-ss-2-burner': { name: '不鏽鋼雙口爐', price: 3800, code: 'STOVE-SS-2' },
  'cartridge-stove': { name: '卡式瓦斯爐', price: 650, code: 'STOVE-CART' },
  'double-handle-wok': { name: '雙耳炒鍋', price: 1200, code: 'WOK-DBL' },

  'water-heater-gas-8l': { name: '8L瓦斯熱水器', price: 7500, code: 'WH-8L' },
  'water-heater-gas-10l': { name: '10L瓦斯熱水器', price: 9800, code: 'WH-10L' },
  'water-heater-instant': { name: '瞬熱型熱水器', price: 8500, code: 'WH-INSTANT' },
  'water-heater-instant-6l': { name: '6L瞬熱熱水器', price: 7200, code: 'WH-6L' },
  'water-heater-storage': { name: '儲熱式熱水器', price: 12000, code: 'WH-STORAGE' },
  'water-heater-storage-20l': { name: '20L儲熱熱水器', price: 14500, code: 'WH-20L' },
  'water-heater-storage-60l': { name: '60L儲熱熱水器', price: 22000, code: 'WH-60L' },
  'instant-gas-water-heater': { name: '瓦斯瞬熱熱水器', price: 9000, code: 'WH-GAS' },
  'commercial-water-heater': { name: '商用熱水器', price: 28000, code: 'WH-COMM' },
  'compact-water-heater': { name: '迷你熱水器', price: 6500, code: 'WH-COMPACT' },
  'constant-temp-water-heater': { name: '恆溫熱水器', price: 18000, code: 'WH-CONST' },
  'quick-heat-water-heater': { name: '快速加熱熱水器', price: 11000, code: 'WH-QUICK' },
  'smart-water-heater': { name: '智慧熱水器', price: 25000, code: 'WH-SMART' },
  'solar-water-heater': { name: '太陽能熱水器', price: 35000, code: 'WH-SOLAR' },
  'heat-pump-water-heater': { name: '熱泵熱水器', price: 42000, code: 'WH-HEATPUMP' },

  'gas-regulator': { name: '瓦斯調節器', price: 350, code: 'REG' },
  'gas-hose': { name: '瓦斯管', price: 280, code: 'HOSE' },
  'gas-valve': { name: '瓦斯閥', price: 250, code: 'VALVE' },
  'gas-filter': { name: '瓦斯過濾器', price: 450, code: 'FILTER' },
  'gas-quick-connector': { name: '快速接頭', price: 380, code: 'QUICK' },
  'gas-t-fitting': { name: 'T型接頭', price: 150, code: 'T-FIT' },
  'gas-leak-detector-pen': { name: '檢漏筆', price: 180, code: 'DETECT-PEN' },
  'gas-leak-spray': { name: '檢漏噴劑', price: 220, code: 'LEAK-SPRAY' },
  'gas-meter': { name: '瓦斯表', price: 2500, code: 'METER' },
  'water-heater-valve': { name: '熱水器閥門', price: 450, code: 'WH-VALVE' },

  'high-pressure-pipe': { name: '高壓管', price: 380, code: 'PIPE-HP' },
  'l-elbow-fitting': { name: 'L型彎頭', price: 120, code: 'ELBOW-L' },
  'threaded-fitting': { name: '螺紋接頭', price: 150, code: 'THREADED' },
  '4-way-fitting': { name: '四通接頭', price: 280, code: '4-WAY' },
  'hose-connector-set': { name: '水管接頭組', price: 550, code: 'HOSE-SET' },
  'pipe-clamp': { name: '管夾', price: 80, code: 'CLAMP' },
  'pipe-cleaner': { name: '清管器', price: 350, code: 'CLEANER' },
  'pipe-mounting-bracket': { name: '管路固定座', price: 180, code: 'BRACKET' },
  'pipe-sleeve': { name: '護套', price: 120, code: 'SLEEVE' },
  'pipe-wrench': { name: '管鉗', price: 680, code: 'WRENCH' },

  'gas-frying-pan': { name: '瓦斯炒鍋', price: 1500, code: 'PAN-FRY' },
  'gas-pressure-cooker': { name: '瓦斯高壓鍋', price: 2800, code: 'COOKER-PRESS' },
  'chinese-wok': { name: '中式炒鍋', price: 1200, code: 'WOK-CN' },
  'non-stick-wok': { name: '不沾炒鍋', price: 1800, code: 'WOK-NS' },
  'cast-iron-pan': { name: '鑄鐵平底鍋', price: 2200, code: 'PAN-CAST' },
  'gas-steamer': { name: '瓦斯蒸籠', price: 3200, code: 'STEAMER' },
  'gas-grill': { name: '瓦斯烤肉架', price: 4500, code: 'GRILL' },
  'gas-hotpot': { name: '瓦斯火鍋', price: 2500, code: 'HOTPOT' },
  'double-side': { name: '雙面煎鍋', price: 1900, code: 'PAN-DBL' },

  'outdoor-gas-stove': { name: '戶外瓦斯爐', price: 3500, code: 'OUT-STOVE' },
  'portable-fire-pit': { name: '便携式火盆', price: 5800, code: 'FIRE-PIT' },
  'gas-string-lights': { name: '瓦斯串燈', price: 2200, code: 'LIGHTS' },
  'outdoor-gas-lamp': { name: '戶外瓦斯燈', price: 1200, code: 'LAMP' },
  'camping-cookset': { name: '露營炊具組', price: 1800, code: 'CAMP-COOK' },
  'camping-cooler': { name: '露營保冷箱', price: 2200, code: 'COOLER' },
  'camping-grill-pan': { name: '露營烤盤', price: 980, code: 'CAMP-GRILL' },
  'camping-hanger': { name: '露營掛架', price: 650, code: 'HANGER' },
  'camping-coffee-pot': { name: '露營咖啡壺', price: 780, code: 'COFFEE' },
  'bbq-grill-rack': { name: 'BBQ烤架', price: 1500, code: 'BBQ' },

  'kitchen-cloth': { name: '廚房抹布', price: 150, code: 'CLOTH' },
  'kitchen-scale': { name: '廚房秤', price: 680, code: 'SCALE' },
  'kitchen-scissors': { name: '廚房剪刀', price: 380, code: 'SCISSORS' },
  'kitchen-timer': { name: '廚房計時器', price: 280, code: 'TIMER' },
  'measuring-cup-set': { name: '量杯組', price: 450, code: 'CUP-SET' },
  'food-container-set': { name: '食物保存盒', price: 850, code: 'CONTAINER' },
  'food-thermometer': { name: '食物溫度計', price: 520, code: 'THERM' },
  'oil-filter-set': { name: '濾油器組', price: 680, code: 'OIL-FILTER' },
  'oil-proof-apron': { name: '防油圍裙', price: 450, code: 'APRON' },
  'oil-skimmer': { name: '撇油器', price: 380, code: 'SKIMMER' },
  'spice-jar-set': { name: '調味罐組', price: 550, code: 'SPICE' },
  'storage-rack': { name: '收納架', price: 1200, code: 'RACK' },

  'gas-alarm': { name: '瓦斯警報器', price: 1500, code: 'ALARM-GAS' },
  'gas-detector': { name: '瓦斯偵測器', price: 2200, code: 'DETECT' },
  'smoke-alarm': { name: '煙霧警報器', price: 1200, code: 'ALARM-SMOKE' },
  'co-detector': { name: '一氧化碳偵測器', price: 2500, code: 'DETECT-CO' },
  'small-fire-extinguisher': { name: '小型滅火器', price: 850, code: 'EXT-SML' },
  'fire-blanket': { name: '滅火毯', price: 680, code: 'BLANKET' },
  'emergency-light': { name: '緊急照明燈', price: 450, code: 'LIGHT-EMG' },
  'emergency-mask': { name: '逃生面罩', price: 380, code: 'MASK' },
  'emergency-shut-off': { name: '緊急切斷閥', price: 680, code: 'SHUTOFF' },

  'repair-toolkit': { name: '修理工具組', price: 1500, code: 'TOOL-KIT' },
  'igniter': { name: '點火器', price: 280, code: 'IGNITER' },
  'pipe-wrench': { name: '管鉗', price: 680, code: 'WRENCH' },
  'cleaning-brush-set': { name: '清潔刷組', price: 380, code: 'BRUSH' },
  'stove-cleaner': { name: '爐具清潔劑', price: 250, code: 'CLEANER' },
  'stove-stand': { name: '爐架', price: 680, code: 'STAND' },
  'stove-cover': { name: '爐具蓋', price: 450, code: 'COVER' },
  'stove-foot-pad': { name: '爐具腳墊', price: 280, code: 'FOOT-PAD' },
  'gasket-set': { name: '墊片組', price: 550, code: 'GASKET' },
  'wind-shield': { name: '擋風板', price: 850, code: 'SHIELD' },

  'gas-heater': { name: '瓦斯暖爐', price: 8500, code: 'HEATER' },
  'multi-cooker': { name: '多功能鍋', price: 5500, code: 'MULTI' },
  'range-hood': { name: '排油煙機', price: 12000, code: 'HOOD' },
  'gas-tank-stand': { name: '瓦斯桶架', price: 850, code: 'TANK-STAND' },

  'aluminum-foil': { name: '鋁箔紙', price: 150, code: 'FOIL' },
  'heat-resistant-gloves': { name: '耐熱手套', price: 450, code: 'GLOVES' },
  'sharpening-stone': { name: '磨刀石', price: 580, code: 'STONE' },
};

async function main() {
  const productsDir = './public/products';
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.png'));

  console.log('📦 開始導入', files.length, '個產品...\n');

  let categoryIdMap = {};

  // 確保類別存在
  const categories = Object.values(categoryMap);
  const uniqueCategories = [...new Set(categories)];

  for (const catName of uniqueCategories) {
    // 先查找是否已存在
    let cat = await db.productCategory.findFirst({
      where: { name: catName }
    });

    // 如果不存在就創建
    if (!cat) {
      cat = await db.productCategory.create({
        data: { name: catName }
      });
    }
    categoryIdMap[catName] = cat.id;
    console.log('✅ 類別:', catName);
  }

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const baseName = file.replace('.png', '');

    // 查找產品資訊
    let productInfo = productNameMap[baseName];

    // 如果找不到精確匹配，嘗試部分匹配
    if (!productInfo) {
      for (const [key, info] of Object.entries(productNameMap)) {
        if (baseName.includes(key) || key.includes(baseName)) {
          productInfo = info;
          break;
        }
      }
    }

    // 如果還是找不到，生成預設值
    if (!productInfo) {
      const displayName = baseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      productInfo = {
        name: displayName,
        price: Math.floor(Math.random() * 5000) + 500,
        code: 'PROD-' + baseName.toUpperCase().substring(0, 6)
      };
    }

    // 確定類別
    let category = '其他';
    for (const [key, cat] of Object.entries(categoryMap)) {
      if (baseName.includes(key)) {
        category = cat;
        break;
      }
    }

    const categoryId = categoryIdMap[category];

    try {
      // 先檢查是否已存在該產品（按名稱）
      const existing = await db.product.findFirst({
        where: { name: productInfo.name }
      });

      if (existing) {
        // 更新現有產品
        await db.product.update({
          where: { id: existing.id },
          data: {
            price: productInfo.price,
            categoryId: categoryId,
            isActive: true
          }
        });
        console.log('🔄 更新:', productInfo.name, '- $' + productInfo.price);
      } else {
        // 創建新產品
        await db.product.create({
          data: {
            name: productInfo.name,
            code: productInfo.code,
            price: productInfo.price,
            cost: Math.round(productInfo.price * 0.7),
            categoryId: categoryId,
            unit: '個',
            isActive: true
          }
        });
        console.log('✅', productInfo.name, '- $' + productInfo.price);
      }
      imported++;
    } catch (e) {
      console.log('❌ 跳過:', baseName, '-', e.message.substring(0, 100));
      skipped++;
    }
  }

  console.log('\n📊 導入完成:');
  console.log('   ✅ 導入:', imported);
  console.log('   ⏭️  跳過:', skipped);
  console.log('   📁 總計:', files.length);

  await db.$disconnect();
}

main().catch(console.error);
