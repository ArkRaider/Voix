import * as React from "react"
import { Checkbox as BaseCheckbox } from "@base-ui/react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

export function Checkbox({ className, ...props }: any) {
  return (
    <BaseCheckbox.Root
      className={cn(
        "group flex items-center justify-center w-5 h-5 rounded-[4px] border border-white/20 bg-transparent transition-all outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50 data-[state=checked]:border-none cursor-pointer",
        className
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="group-data-[state=unchecked]:hidden flex items-center justify-center">
        <svg 
           width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
           className="text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
        >
          <motion.path 
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            d="M2.5 7.5L5.5 10.5L11.5 3.5" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )
}
