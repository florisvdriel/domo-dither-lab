'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SavePresetModal({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus input when modal opens
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="gap-0 p-0 border-[#333] [&>button]:hidden rounded-none"
        style={{
          width: '300px',
          maxWidth: '300px',
          backgroundColor: '#111',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#333',
          borderRadius: 0,
        }}
      >
        <DialogHeader
          className="p-6 pb-4"
          style={{ padding: '24px 24px 16px' }}
        >
          <DialogTitle
            className="text-white font-mono font-semibold"
            style={{
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Save Preset
          </DialogTitle>
        </DialogHeader>

        <div
          className="px-6 pb-4"
          style={{ padding: '0 24px 16px' }}
        >
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preset name..."
            className="w-full bg-black border-[#333] text-white font-mono text-xs focus-visible:ring-[#444] focus-visible:border-[#444]"
            style={{
              fontSize: '12px',
            }}
          />
        </div>

        <DialogFooter
          className="flex-row gap-2 px-6 pb-6"
          style={{ padding: '0 24px 24px' }}
        >
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 font-mono text-xs border-[#333] bg-transparent text-white hover:bg-[#222] hover:border-[#444]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 font-mono text-xs bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
