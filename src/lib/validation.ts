/**
 * 生產級別輸入驗證與清洗系統
 * 防止注入攻擊、XSS、資源耗盡等安全問題
 */

import { logger, LogContext } from './logger'

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ValidationResult {
  private errors: Map<string, string> = new Map()
  private warnings: Map<string, string> = new Map()

  addError(field: string, message: string, code?: string): void {
    this.errors.set(field, message)
  }

  addWarning(field: string, message: string): void {
    this.warnings.set(field, message)
  }

  hasErrors(): boolean {
    return this.errors.size > 0
  }

  getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors)
  }

  getWarnings(): Record<string, string> {
    return Object.fromEntries(this.warnings)
  }

  getFirstError(): string | null {
    return this.errors.values().next().value || null
  }

  throwIfInvalid(): void {
    if (this.hasErrors()) {
      throw new ValidationError(
        Object.keys(this.getErrors())[0],
        this.getFirstError() || '驗證失敗'
      )
    }
  }
}

/**
 * 字符串清洗工具
 */
export class StringSanitizer {
  /**
   * 移除控制字符（保留換行、製表符）
   */
  static removeControlChars(str: string): string {
    return str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  }

  /**
   * 移除危險的 HTML 標籤（基本 XSS 防護）
   * 注意：這只是基本防護，不應替代專門的 XSS 防護庫
   */
  static sanitizeHtml(str: string): string {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * 去除首尾空白
   */
  static trim(str: string): string {
    return str.trim()
  }

  /**
   * 限制字符串長度
   */
  static truncate(str: string, maxLength: number, suffix = '...'): string {
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength - suffix.length) + suffix
  }

  /**
   * 組合清洗：trim + 移除控制字符 + 長度限制
   */
  static clean(str: string, maxLength?: number): string {
    let cleaned = this.trim(str)
    cleaned = this.removeControlChars(cleaned)
    if (maxLength) {
      cleaned = this.truncate(cleaned, maxLength, '')
    }
    return cleaned
  }
}

/**
 * 驗證器
 */
export class Validators {
  /**
   * 驗證用戶名
   * 規則：3-50 字符，僅允許字母、數字、底線、連字符
   */
  static username(value: string): string | null {
    if (!value) return '用戶名不能為空'
    if (value.length < 3) return '用戶名至少需要 3 個字符'
    if (value.length > 50) return '用戶名不能超過 50 個字符'
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return '用戶名只能包含字母、數字、底線和連字符'
    }
    return null
  }

  /**
   * 驗證密碼強度
   * 規則：至少 8 字符
   */
  static password(value: string): string | null {
    if (!value) return '密碼不能為空'
    if (value.length < 8) return '密碼至少需要 8 個字符'
    if (value.length > 100) return '密碼不能超過 100 個字符'
    return null
  }

  /**
   * 驗證台灣手機號碼
   */
  static taiwanPhone(value: string): string | null {
    if (!value) return '手機號碼不能為空'
    const cleaned = value.replace(/[\s-]/g, '')
    if (!/^09\d{8}$/.test(cleaned)) {
      return '請輸入有效的台灣手機號碼 (09xxxxxxxx)'
    }
    return null
  }

  /**
   * 驗證姓名（中文或英文）
   */
  static name(value: string): string | null {
    if (!value) return '姓名不能為空'
    if (value.length < 1) return '姓名不能為空'
    if (value.length > 50) return '姓名不能超過 50 個字符'
    if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(value)) {
      return '姓名只能包含中文、英文和空格'
    }
    return null
  }

  /**
   * 驗證台灣地址
   */
  static taiwanAddress(value: string): string | null {
    if (!value) return '地址不能為空'
    if (value.length < 5) return '地址請至少輸入 5 個字符'
    if (value.length > 200) return '地址不能超過 200 個字符'
    return null
  }

  /**
   * 驗證金額（正數）
   */
  static positiveAmount(value: number): string | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return '金額必須是數字'
    }
    if (value < 0) return '金額不能為負數'
    if (value > 999999999) return '金額超過上限'
    return null
  }

  /**
   * 驗證數量（正整數）
   */
  static positiveInteger(value: number): string | null {
    if (!Number.isInteger(value)) {
      return '數量必須是整數'
    }
    if (value < 1) return '數量必須大於 0'
    if (value > 99999) return '數量超過上限'
    return null
  }

  /**
   * 驗證 Email
   */
  static email(value: string): string | null {
    if (!value) return 'Email 不能為空'
    if (value.length > 255) return 'Email 過長'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return '請輸入有效的 Email 地址'
    }
    return null
  }

  /**
   * 驗證日期範圍
   */
  static dateRange(value: Date, min?: Date, max?: Date): string | null {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      return '無效的日期'
    }
    if (min && value < min) {
      return `日期不能早於 ${min.toISOString()}`
    }
    if (max && value > max) {
      return `日期不能晚於 ${max.toISOString()}`
    }
    return null
  }
}

/**
 * API 請求驗證器
 */
export class ApiValidator {
  /**
   * 驗證登入請求
   */
  static validateLoginRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 驗證用戶名
    const usernameError = Validators.username(body.username)
    if (usernameError) result.addError('username', usernameError)

    // 驗證密碼
    const passwordError = Validators.password(body.password)
    if (passwordError) result.addError('password', passwordError)

    return result
  }

  /**
   * 驗證員工註冊請求
   */
  static validateRegisterRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 驗證用戶名
    const usernameError = Validators.username(body.username)
    if (usernameError) result.addError('username', usernameError)

    // 驗證密碼
    const passwordError = Validators.password(body.password)
    if (passwordError) result.addError('password', passwordError)

    // 驗證 Email
    const emailError = Validators.email(body.email)
    if (emailError) result.addError('email', emailError)

    // 驗證姓名
    const nameError = Validators.name(body.name)
    if (nameError) result.addError('name', nameError)

    // 驗證角色
    const validRoles = ['admin', 'staff', 'driver', 'accountant']
    if (!body.role) {
      result.addError('role', '角色不能為空')
    } else if (!validRoles.includes(body.role)) {
      result.addError('role', `角色必須是 ${validRoles.join(', ')} 之一`)
    }

    // 驗證手機（可選）
    if (body.phone) {
      const phoneError = Validators.taiwanPhone(body.phone)
      if (phoneError) result.addError('phone', phoneError)
    }

    // 驗證部門（可選）
    if (body.department && body.department.length > 50) {
      result.addError('department', '部門不能超過 50 個字符')
    }

    return result
  }

  /**
   * 驗證創建訂單請求
   */
  static validateCreateOrderRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 客戶 ID
    if (!body.customerId) {
      result.addError('customerId', '請選擇客戶')
    } else if (typeof body.customerId !== 'string') {
      result.addError('customerId', '客戶 ID 格式錯誤')
    }

    // 訂單項目
    if (!body.items || !Array.isArray(body.items)) {
      result.addError('items', '訂單項目必須是陣列')
    } else if (body.items.length === 0) {
      result.addError('items', '請至少添加一個商品')
    } else {
      body.items.forEach((item: any, index: number) => {
        const prefix = `items[${index}]`

        if (!item.productId) {
          result.addError(`${prefix}.productId`, '商品 ID 不能為空')
        }

        const qtyError = Validators.positiveInteger(item.quantity)
        if (qtyError) {
          result.addError(`${prefix}.quantity`, qtyError)
        }
      })
    }

    // 配送日期（可選）
    if (body.deliveryDate) {
      const dateError = Validators.dateRange(
        new Date(body.deliveryDate),
        new Date(), // 不能早於今天
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 不能超過一年後
      )
      if (dateError) {
        result.addError('deliveryDate', dateError)
      }
    }

    // 備註（可選）
    if (body.note && typeof body.note === 'string') {
      if (body.note.length > 500) {
        result.addError('note', '備註不能超過 500 個字符')
      }
    }

    return result
  }

  /**
   * 驗證創建客戶請求
   */
  static validateCreateCustomerRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 姓名
    const nameError = Validators.name(body.name)
    if (nameError) result.addError('name', nameError)

    // 手機
    const phoneError = Validators.taiwanPhone(body.phone)
    if (phoneError) result.addError('phone', phoneError)

    // 地址
    const addressError = Validators.taiwanAddress(body.address)
    if (addressError) result.addError('address', addressError)

    // 客戶分組（可選）
    if (body.groupId && typeof body.groupId !== 'string') {
      result.addError('groupId', '客戶分組 ID 格式錯誤')
    }

    return result
  }

  /**
   * 驗證庫存更新請求
   */
  static validateInventoryUpdateRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 產品 ID
    if (!body.productId) {
      result.addError('productId', '產品 ID 不能為空')
    }

    // 類型 (匹配 inventory/route.ts 中使用的類型)
    const validTypes = ['purchase', 'delivery', 'return', 'adjust', 'damaged']
    if (!body.type || !validTypes.includes(body.type)) {
      result.addError('type', `類型必須是 ${validTypes.join(', ')} 之一`)
    }

    // 數量
    const qtyError = Validators.positiveInteger(body.quantity)
    if (qtyError) result.addError('quantity', qtyError)

    return result
  }

  /**
   * 驗證創建產品請求
   */
  static validateCreateProductRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 名稱
    if (!body.name) {
      result.addError('name', '產品名稱不能為空')
    } else if (body.name.length > 100) {
      result.addError('name', '產品名稱不能超過 100 個字符')
    }

    // 價格
    if (body.price === undefined || body.price === null) {
      result.addError('price', '價格不能為空')
    } else {
      const priceError = Validators.positiveAmount(parseFloat(body.price))
      if (priceError) result.addError('price', priceError)
    }

    // 成本（可選）
    if (body.cost !== undefined && body.cost !== null) {
      const costError = Validators.positiveAmount(parseFloat(body.cost))
      if (costError) result.addError('cost', costError)
    }

    // 容量
    if (!body.capacity) {
      result.addError('capacity', '容量不能為空')
    } else if (body.capacity.length > 20) {
      result.addError('capacity', '容量不能超過 20 個字符')
    }

    // 單位（可選）
    if (body.unit && body.unit.length > 10) {
      result.addError('unit', '單位不能超過 10 個字符')
    }

    return result
  }

  /**
   * 驗證創建員工請求
   */
  static validateCreateStaffRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 姓名
    const nameError = Validators.name(body.name)
    if (nameError) result.addError('name', nameError)

    // 用戶名
    const usernameError = Validators.username(body.username)
    if (usernameError) result.addError('username', usernameError)

    // 密碼
    const passwordError = Validators.password(body.password)
    if (passwordError) result.addError('password', passwordError)

    // 角色
    const validRoles = ['admin', 'staff', 'driver', 'accountant']
    if (!body.role) {
      result.addError('role', '角色不能為空')
    } else if (!validRoles.includes(body.role)) {
      result.addError('role', `角色必須是 ${validRoles.join(', ')} 之一`)
    }

    // Email（可選）
    if (body.email) {
      const emailError = Validators.email(body.email)
      if (emailError) result.addError('email', emailError)
    }

    // 手機（可選）
    if (body.phone) {
      const phoneError = Validators.taiwanPhone(body.phone)
      if (phoneError) result.addError('phone', phoneError)
    }

    return result
  }

  /**
   * 驗證創建客戶分組請求
   */
  static validateCreateCustomerGroupRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 名稱
    if (!body.name) {
      result.addError('name', '分組名稱不能為空')
    } else if (body.name.length > 50) {
      result.addError('name', '分組名稱不能超過 50 個字符')
    }

    // 折扣
    if (body.discount !== undefined && body.discount !== null) {
      const discount = parseFloat(body.discount)
      if (isNaN(discount) || discount < 0 || discount > 1) {
        result.addError('discount', '折扣必須在 0 到 1 之間')
      }
    }

    // 描述（可選）
    if (body.description && body.description.length > 500) {
      result.addError('description', '描述不能超過 500 個字符')
    }

    return result
  }

  /**
   * 驗證創建促銷活動請求
   */
  static validateCreatePromotionRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 名稱
    if (!body.name) {
      result.addError('name', '促銷名稱不能為空')
    } else if (body.name.length > 100) {
      result.addError('name', '促銷名稱不能超過 100 個字符')
    }

    // 類型
    const validTypes = ['discount', 'free_delivery', 'special_price', 'bundle']
    if (!body.type) {
      result.addError('type', '類型不能為空')
    } else if (!validTypes.includes(body.type)) {
      result.addError('type', `類型必須是 ${validTypes.join(', ')} 之一`)
    }

    // 折扣值
    if (body.discountValue !== undefined && body.discountValue !== null) {
      const value = parseFloat(body.discountValue)
      if (isNaN(value) || value < 0 || value > 100) {
        result.addError('discountValue', '折扣值必須在 0 到 100 之間')
      }
    }

    // 最低金額（可選）
    if (body.minAmount !== undefined && body.minAmount !== null) {
      const amountError = Validators.positiveAmount(parseFloat(body.minAmount))
      if (amountError) result.addError('minAmount', amountError)
    }

    // 開始日期
    if (!body.startDate) {
      result.addError('startDate', '開始日期不能為空')
    } else {
      const startDate = new Date(body.startDate)
      if (isNaN(startDate.getTime())) {
        result.addError('startDate', '開始日期格式錯誤')
      }
    }

    // 結束日期
    if (!body.endDate) {
      result.addError('endDate', '結束日期不能為空')
    } else {
      const endDate = new Date(body.endDate)
      if (isNaN(endDate.getTime())) {
        result.addError('endDate', '結束日期格式錯誤')
      }
    }

    // 檢查日期範圍
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate)
      const endDate = new Date(body.endDate)
      if (startDate >= endDate) {
        result.addError('endDate', '結束日期必須晚於開始日期')
      }
    }

    // 描述（可選）
    if (body.description && body.description.length > 500) {
      result.addError('description', '描述不能超過 500 個字符')
    }

    return result
  }

  /**
   * 驗證創建成本記錄請求
   */
  static validateCreateCostRequest(body: any): ValidationResult {
    const result = new ValidationResult()

    if (!body) {
      result.addError('body', '請求體不能為空')
      return result
    }

    // 類型
    const validTypes = ['purchase', 'delivery', 'labor', 'utility', 'rent', 'maintenance', 'other']
    if (!body.type) {
      result.addError('type', '類型不能為空')
    } else if (!validTypes.includes(body.type)) {
      result.addError('type', `類型必須是 ${validTypes.join(', ')} 之一`)
    }

    // 分類
    if (!body.category) {
      result.addError('category', '分類不能為空')
    } else if (body.category.length > 50) {
      result.addError('category', '分類不能超過 50 個字符')
    }

    // 金額
    if (body.amount === undefined || body.amount === null) {
      result.addError('amount', '金額不能為空')
    } else {
      const amountError = Validators.positiveAmount(parseFloat(body.amount))
      if (amountError) result.addError('amount', amountError)
    }

    // 描述（可選）
    if (body.description && body.description.length > 500) {
      result.addError('description', '描述不能超過 500 個字符')
    }

    // 日期（可選）
    if (body.date) {
      const date = new Date(body.date)
      if (isNaN(date.getTime())) {
        result.addError('date', '日期格式錯誤')
      }
    }

    return result
  }
}

/**
 * 請求清洗器
 */
export class RequestSanitizer {
  /**
   * 清洗登入請求
   */
  static sanitizeLoginRequest(body: any): any {
    return {
      username: StringSanitizer.clean(body.username || '', 50),
      password: body.password, // 密碼不需要清洗，直接傳給 bcrypt
    }
  }

  /**
   * 清洗客戶請求
   */
  static sanitizeCustomerRequest(body: any): any {
    return {
      name: StringSanitizer.clean(body.name || '', 50),
      phone: StringSanitizer.clean(body.phone || '', 20).replace(/[\s-]/g, ''), // 移除空格和連字符
      address: StringSanitizer.clean(body.address || '', 200),
      groupId: body.groupId || null,
      note: body.note ? StringSanitizer.clean(body.note, 500) : null,
    }
  }

  /**
   * 清洗註冊請求
   */
  static sanitizeRegisterRequest(body: any): any {
    return {
      username: StringSanitizer.clean(body.username || '', 50),
      password: body.password, // 密碼不需要清洗，直接傳給 bcrypt
      email: StringSanitizer.clean(body.email || '', 255).toLowerCase(),
      name: StringSanitizer.clean(body.name || '', 50),
      role: StringSanitizer.clean(body.role || 'staff', 20),
      phone: body.phone ? StringSanitizer.clean(body.phone || '', 20).replace(/[\s-]/g, '') : null,
      department: body.department ? StringSanitizer.clean(body.department || '', 50) : null,
    }
  }
}
