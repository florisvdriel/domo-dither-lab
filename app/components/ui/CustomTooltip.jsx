'use client';

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export default function CustomTooltip({ text, children }) {
  // Don't render tooltip if no text provided
  if (!text) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={8}
          className="border-0 rounded-none"
          style={{
            backgroundColor: '#222',
            color: '#aaa',
            padding: '8px 12px',
            fontSize: '9px',
            fontFamily: 'monospace',
            maxWidth: '200px',
            lineHeight: 1.4,
            whiteSpace: 'normal',
            boxShadow: 'none'
          }}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
