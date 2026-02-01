const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== 詳細比較兩站數據 ===\n');

    // 1. 檢查 custid 是否有差異
    console.log('1. 檢查 custid 差異:');
    const meilunIds = await prisma.$queryRaw`SELECT custid, custname, custaddr FROM customers_meilun ORDER BY custid`;
    const jiAnIds = await prisma.$queryRaw`SELECT custid, custname, custaddr FROM customers_ji_an ORDER BY custid`;

    const meilunIdSet = new Set(meilunIds.map(r => r.custid.trim()));
    const jiAnIdSet = new Set(jiAnIds.map(r => r.custid.trim()));

    const onlyInMeilun = meilunIds.filter(r => !jiAnIdSet.has(r.custid.trim()));
    const onlyInJiAn = jiAnIds.filter(r => !meilunIdSet.has(r.custid.trim()));

    console.log('   只在美崙站:', onlyInMeilun.length, '筆');
    console.log('   只在吉安站:', onlyInJiAn.length, '筆');

    // 2. 隨機抽樣 20 筆詳細比較
    console.log('\n2. 隨機抽樣 20 筆比較:');
    const sampleSize = 20;

    // 獲取美崙站隨機樣本
    const meilunSample = await prisma.$queryRaw`
      SELECT m.custid, m.custname, m.custaddr, j.custname as ji_name, j.custaddr as ji_addr
      FROM customers_meilun m
      LEFT JOIN customers_ji_an j ON m.custid = j.custid
      ORDER BY RANDOM()
      LIMIT ${sampleSize}
    `;

    meilunSample.forEach((r, i) => {
      const nameSame = r.custname === r.ji_name;
      const addrSame = r.custaddr === r.ji_addr;
      const status = nameSame && addrSame ? '✅ 相同' : '❌ 不同';
      console.log(`   [${i+1}] ID: ${r.custid?.trim()} | ${status}`);
      if (!nameSame) console.log(`       美崙: ${r.custname?.substring(0, 20)}`);
      if (!nameSame) console.log(`       吉安: ${r.ji_name?.substring(0, 20)}`);
    });

    // 3. 檢查實際不同的記錄
    console.log('\n3. 查找真正不同的記錄:');
    const diffRecords = await prisma.$queryRaw`
      SELECT m.custid, m.custname as meilun_name, m.custaddr as meilun_addr,
             j.custname as ji_an_name, j.custaddr as ji_an_addr
      FROM customers_meilun m
      JOIN customers_ji_an j ON m.custid = j.custid
      WHERE m.custname != j.custname OR m.custaddr != j.custaddr
      LIMIT 10
    `;

    if (diffRecords.length === 0) {
      console.log('   ✅ 沒有找到任何不同的記錄！兩站數據 100% 相同。');
    } else {
      console.log('   發現', diffRecords.length, '筆不同的記錄:');
      diffRecords.forEach(r => {
        console.log(`   ID: ${r.custid?.trim()}`);
        console.log(`     美崙: ${r.meilun_name} | ${r.meilun_addr}`);
        console.log(`     吉安: ${r.ji_an_name} | ${r.ji_an_addr}`);
      });
    }

    // 4. 總結
    console.log('\n=== 總結 ===');
    console.log(`美崙站總筆數: ${meilunIds.length}`);
    console.log(`吉安站總筆數: ${jiAnIds.length}`);
    console.log(`共同 custid 數量: ${Math.min(meilunIds.length, jiAnIds.length)}`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
