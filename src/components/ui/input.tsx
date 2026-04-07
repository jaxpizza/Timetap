import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[8px] border px-4 text-sm transition-all duration-200 outline-none focus:border-timetap-primary-500 focus:ring-2 focus:ring-timetap-primary-500/20 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      style={{
        backgroundColor: "var(--tt-elevated-bg)",
        borderColor: "var(--tt-border)",
        color: "var(--tt-text-primary)",
        ...style,
      }}
      {...props}
    />
  )
}

export { Input }
