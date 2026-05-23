import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center rounded-md border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-primary overflow-hidden">
      <span className="px-2.5 text-sm text-gray-500 border-r border-gray-200 bg-gray-50 h-9 flex items-center select-none shrink-0">
        +90
      </span>
      <input
        type="tel"
        ref={ref}
        className={cn(
          'flex-1 h-9 px-3 text-sm bg-transparent focus:outline-none placeholder:text-gray-400',
          className
        )}
        {...props}
      />
    </div>
  )
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
