'use client';

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";

export default function CustomSection({ title, children, defaultOpen = true }) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue={defaultOpen ? "item-1" : undefined}
      className="w-full"
    >
      <AccordionPrimitive.Item
        value="item-1"
        className="border-b border-[#222]"
      >
        <AccordionPrimitive.Header className="flex">
          <AccordionPrimitive.Trigger
            className={cn(
              "group",
              "flex flex-1 items-center justify-between w-full",
              "px-[14px] py-[14px]",
              "text-[10px] tracking-[0.1em]",
              "text-[#666]",
              "hover:bg-[#0f0f0f] hover:text-[#888]",
              "border-0 bg-transparent",
              "[&>svg]:hidden" // Hide the default chevron from accordion.jsx
            )}
            style={{
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              transition: 'all 0.12s ease'
            }}
          >
            <span className="text-left">{title}</span>
            <span
              className="text-[#444] text-[14px] shrink-0 ml-2"
              style={{
                fontFamily: 'monospace',
                fontWeight: 'normal'
              }}
            >
              <span className="inline-block group-data-[state=open]:hidden">+</span>
              <span className="hidden group-data-[state=open]:inline-block">−</span>
            </span>
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content
          className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        >
          <div className="px-[16px] pb-[16px] pt-0">
            {children}
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}
