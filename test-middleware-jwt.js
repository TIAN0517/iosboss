// 測試 middleware JWT 驗證邏輯
const jwt = require('jsonwebtoken')

// Middleware 中的 JWT_SECRET
const JWT_SECRET = '9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY='

// 從最新登入獲取的 token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWprcHY2M3UwMDAwaHdna3p2N3Zvb3Y2IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NjY2NDU1OSwiZXhwIjoxNzY3MjY5MzU5fQ.pvSr3Ebmf2ZQaBjegztvzGkigvvBxXSZYiMPYd37eQY'

console.log('Testing middleware JWT verification...')
console.log('JWT_SECRET:', JWT_SECRET)
console.log('Token:', token.substring(0, 50) + '...')

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

const decoded = verifyToken(token)
console.log('\nVerification result:')
if (decoded) {
  console.log('✅ VALID TOKEN')
  console.log('User:', decoded.username)
  console.log('Role:', decoded.role)
} else {
  console.log('❌ INVALID TOKEN')
}
