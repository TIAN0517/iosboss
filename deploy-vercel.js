const { execSync } = require('child_process');

console.log('=== 部署到 Vercel ===\n');

try {
  console.log('1. 檢查 Git 狀態...');
  execSync('git status', { stdio: 'inherit' });
  
  console.log('\n2. 提交更改...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "fix: 更新 LINE Webhook 和語音助手功能', { stdio: 'inherit' });
  
  console.log('\n3. 推送到 GitHub...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n✅ 完成！請等待 Vercel 自動部署（約 1-2 分鐘）');
  console.log('部署完成後 Webhook 將會恢復正常');
  
} catch (error) {
  console.error('\n❌ 部署失敗:', error.message);
  process.exit(1);
}
