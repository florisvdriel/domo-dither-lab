'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CustomSelect({ value, onChange, options = [], placeholder = 'Select...' }) {
  // Group options by their group property
  const groupedOptions = options.reduce((acc, option) => {
    const groupName = option.group || '__ungrouped__';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(option);
    return acc;
  }, {});

  const hasGroups = Object.keys(groupedOptions).length > 1 || !groupedOptions.__ungrouped__;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-[34px] w-full border-[#333] bg-black text-white font-mono hover:border-[#444] focus:ring-[#444] focus:border-[#444] data-[placeholder]:text-[#666] cursor-pointer transition-all ease-out"
        style={{
          fontSize: '10px',
          padding: '8px 12px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#333',
          backgroundColor: '#000',
          color: '#fff',
          transitionDuration: '0.12s',
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="border-[#333] bg-black text-white font-mono"
        style={{
          backgroundColor: '#000',
          borderColor: '#333',
        }}
      >
        {hasGroups ? (
          // Render grouped options
          Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
            <SelectGroup key={groupName}>
              {groupName !== '__ungrouped__' && (
                <SelectLabel
                  className="text-[#888] font-mono font-semibold uppercase"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.05em',
                  }}
                >
                  {groupName}
                </SelectLabel>
              )}
              {groupOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-white font-mono hover:bg-[#222] focus:bg-[#222] cursor-pointer transition-colors ease-out data-[highlighted]:bg-[#222]"
                  style={{
                    fontSize: '10px',
                    transitionDuration: '0.12s',
                  }}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          // Render ungrouped options
          options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-white font-mono hover:bg-[#222] focus:bg-[#222] cursor-pointer transition-colors ease-out data-[highlighted]:bg-[#222]"
              style={{
                fontSize: '10px',
                transitionDuration: '0.12s',
              }}
            >
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
