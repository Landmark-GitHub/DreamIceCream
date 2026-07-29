'use client';

import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LedgerNoBillProps {
  onCreateBill: () => void;
}

export function LedgerNoBill({ onCreateBill }: LedgerNoBillProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Package className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">ยังไม่มีบิลสำหรับวันนี้</p>
      <Button onClick={onCreateBill}>
        <Plus className="w-4 h-4 mr-2" />
        สร้างบิลใหม่
      </Button>
    </div>
  );
}
