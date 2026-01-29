'use client'

import { useState, useCallback } from 'react'
import { ZodError, ZodSchema } from 'zod'

interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Record<string, string>
}

export function useFormValidation<T>(schema: ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(
    (data: unknown): ValidationResult<T> => {
      try {
        const result = schema.parse(data)
        setErrors({})
        return { success: true, data: result }
      } catch (error) {
        if (error instanceof ZodError) {
          const fieldErrors: Record<string, string> = {}
          error.errors.forEach((err) => {
            const path = err.path.join('.')
            if (path && !fieldErrors[path]) {
              fieldErrors[path] = err.message
            }
          })
          setErrors(fieldErrors)
          return { success: false, errors: fieldErrors }
        }
        return { success: false, errors: { _form: '驗證失敗' } }
      }
    },
    [schema]
  )

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    errors,
    validate,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0,
  }
}

// 電話格式驗證
export function validatePhone(phone: string): boolean {
  return /^09\d{8}$/.test(phone)
}

// 金額驗證
export function validateAmount(amount: number): boolean {
  return amount >= 0 && !isNaN(amount)
}

// 數量驗證
export function validateQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0
}
