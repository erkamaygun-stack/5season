import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-primary overflow-hidden">
      <span className="px-2.5 text-sm text-muted-foreground border-r border-border bg-muted h-9 flex items-center select-none shrink-0">
        +90
      </span>
      <input
        type="tel"
        ref={ref}
        className={cn(
          'flex-1 h-9 px-3 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground text-foreground',
          className
        )}
        {...props}
      />
    </div>
  )
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
