import React from 'react'

interface IOSSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const IOSSelect = React.forwardRef<HTMLSelectElement, IOSSelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-lg border border-gray-200
            bg-white text-gray-900
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
            transition-all duration-200
            appearance-none cursor-pointer
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {/* 下拉箭头 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    )
  }
)

IOSSelect.displayName = 'IOSSelect'
