// 測試 JWT 驗證
const jwt = require('jsonwebtoken')

// .env 中的 secret
const ENV_SECRET = '9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY='
// 默認 secret
const DEFAULT_SECRET = 'jy-gas-management-2025-super-secret-key-change-in-production'

// 從登入 API 獲取的 token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWprcHY2M3UwMDAwaHdna3p2N3Zvb3Y2IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NjY2NDQ1MiwiZXhwIjoxNzY3MjY5MjUyfQ.yNQJonwzChdVpe8vw4UvC2MjY3pZZaHvYaO4ziQmuj4'

console.log('Testing with ENV_SECRET:', ENV_SECRET)
try {
  const decoded = jwt.verify(token, ENV_SECRET)
  console.log('✅ Valid with ENV_SECRET:', decoded)
} catch (e) {
  console.log('❌ Invalid with ENV_SECRET:', e.message)
}

console.log('\nTesting with DEFAULT_SECRET:', DEFAULT_SECRET)
try {
  const decoded = jwt.verify(token, DEFAULT_SECRET)
  console.log('✅ Valid with DEFAULT_SECRET:', decoded)
} catch (e) {
  console.log('❌ Invalid with DEFAULT_SECRET:', e.message)
}
