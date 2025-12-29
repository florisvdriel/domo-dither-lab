import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative w-full grow overflow-hidden bg-[#333] hover:bg-[#555]"
      style={{ height: '1px', borderRadius: 0, transition: 'background-color 0.12s ease' }}
    >
      <SliderPrimitive.Range
        className="absolute h-full bg-transparent"
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block bg-white border-0 cursor-pointer hover:w-[10px] hover:h-[10px] focus-visible:outline-none"
      style={{
        width: '8px',
        height: '8px',
        borderRadius: 0,
        boxShadow: 'none',
        transition: 'width 0.12s ease, height 0.12s ease'
      }}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
