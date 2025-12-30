'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker, HexColorInput } from 'react-colorful';

export default function ColorPickerPopover({ color, onChange, size = 36 }) {
  // Handle size as number (px) or string (e.g., "100%")
  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="border border-[#222] hover:border-[#444] transition-colors duration-150 cursor-pointer"
          style={{
            width: sizeStyle,
            height: sizeStyle,
            backgroundColor: color,
            borderRadius: 0,
            padding: 0
          }}
        />
      </PopoverTrigger>

      <PopoverContent
        data-color-picker-popup
        className="bg-[#0a0a0a] border border-[#222] rounded-none p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-50 w-auto"
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-2.5">
          <HexColorPicker
            color={color}
            onChange={onChange}
            style={{ width: '180px', height: '180px' }}
          />

          <div className="flex items-center bg-black border border-[#333] p-1.5 px-2.5">
            <span className="text-[#666] text-[10px] font-mono mr-1.5">#</span>
            <HexColorInput
              color={color}
              onChange={onChange}
              className="flex-1 bg-transparent border-none text-white text-[11px] font-mono uppercase outline-none w-full"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
