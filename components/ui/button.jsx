import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-mono transition-all duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-30",
  {
    variants: {
      variant: {
        default: "bg-black border border-[#333] text-white hover:bg-[#1a1a1a] hover:border-[#444]",
        primary: "bg-white border-0 text-black hover:bg-[#ddd]",
        outline: "bg-transparent border border-[#333] text-white hover:border-[#444] hover:bg-[#1a1a1a]",
        ghost: "bg-transparent border-0 text-[#666] hover:text-white hover:bg-[#1a1a1a]",
        danger: "bg-black border border-[#333] text-white hover:bg-[#3a0a0a] hover:border-[#661010]",
        active: "bg-white border border-[#333] text-black"
      },
      size: {
        default: "h-auto p-2.5 text-[10px] tracking-[0.05em]",
        sm: "h-auto px-3 py-1.5 text-[10px] tracking-[0.05em]",
        icon: "h-5 w-5 text-xs"
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: true
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        style={{ borderRadius: 0 }} // Force sharp corners
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
